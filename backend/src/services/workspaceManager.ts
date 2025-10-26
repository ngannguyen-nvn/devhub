import db from '../db'
import { WorkspaceSnapshot } from '@devhub/shared'
import { ServiceManager } from './serviceManager'
import simpleGit from 'simple-git'
import * as fs from 'fs'

export class WorkspaceManager {
  private serviceManager: ServiceManager

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager
  }

  /**
   * Get all workspace snapshots
   */
  getAllSnapshots(): WorkspaceSnapshot[] {
    const stmt = db.prepare('SELECT * FROM workspaces ORDER BY created_at DESC')
    const rows = stmt.all() as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      ...JSON.parse(row.config),
      createdAt: row.created_at,
    }))
  }

  /**
   * Get a specific snapshot
   */
  getSnapshot(snapshotId: string): WorkspaceSnapshot | null {
    const stmt = db.prepare('SELECT * FROM workspaces WHERE id = ?')
    const row = stmt.get(snapshotId) as any

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      ...JSON.parse(row.config),
      createdAt: row.created_at,
    }
  }

  /**
   * Capture current workspace state
   */
  async captureCurrentState(repoPaths: string[]): Promise<{
    runningServices: Array<{ serviceId: string; serviceName: string }>
    repositories: Array<{ path: string; branch: string; hasChanges: boolean }>
  }> {
    // Get running services
    const runningServices = this.serviceManager.getRunningServices().map(service => ({
      serviceId: service.id,
      serviceName: service.name,
    }))

    // Get repository states
    const repositories = await Promise.all(
      repoPaths.map(async (repoPath) => {
        try {
          if (!fs.existsSync(repoPath)) {
            return null
          }

          const git = simpleGit(repoPath)
          const status = await git.status()
          const branch = status.current || 'unknown'
          const hasChanges = !status.isClean()

          return {
            path: repoPath,
            branch,
            hasChanges,
          }
        } catch (error) {
          console.error(`Error reading repo ${repoPath}:`, error)
          return null
        }
      })
    )

    return {
      runningServices,
      repositories: repositories.filter(r => r !== null) as any[],
    }
  }

  /**
   * Create a new workspace snapshot
   */
  async createSnapshot(
    name: string,
    description: string | undefined,
    repoPaths: string[],
    activeEnvProfile?: string,
    tags?: string[]
  ): Promise<WorkspaceSnapshot> {
    const id = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Capture current state
    const state = await this.captureCurrentState(repoPaths)

    const config = {
      description,
      runningServices: state.runningServices,
      repositories: state.repositories,
      activeEnvProfile,
      tags,
      autoRestore: false,
      updatedAt: new Date().toISOString(),
    }

    const stmt = db.prepare(`
      INSERT INTO workspaces (id, name, config)
      VALUES (?, ?, ?)
    `)

    stmt.run(id, name, JSON.stringify(config))

    return {
      id,
      name,
      ...config,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Update a workspace snapshot
   */
  updateSnapshot(
    snapshotId: string,
    updates: {
      name?: string
      description?: string
      tags?: string[]
      autoRestore?: boolean
    }
  ): boolean {
    // Get current snapshot
    const current = this.getSnapshot(snapshotId)
    if (!current) return false

    // Merge updates
    const newName = updates.name || current.name
    const newConfig = {
      description: updates.description !== undefined ? updates.description : current.description,
      runningServices: current.runningServices,
      repositories: current.repositories,
      activeEnvProfile: current.activeEnvProfile,
      tags: updates.tags !== undefined ? updates.tags : current.tags,
      autoRestore: updates.autoRestore !== undefined ? updates.autoRestore : current.autoRestore,
      updatedAt: new Date().toISOString(),
    }

    const stmt = db.prepare(`
      UPDATE workspaces SET name = ?, config = ? WHERE id = ?
    `)

    const result = stmt.run(newName, JSON.stringify(newConfig), snapshotId)
    return result.changes > 0
  }

  /**
   * Delete a workspace snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    const stmt = db.prepare('DELETE FROM workspaces WHERE id = ?')
    const result = stmt.run(snapshotId)
    return result.changes > 0
  }

  /**
   * Restore a workspace snapshot
   */
  async restoreSnapshot(snapshotId: string): Promise<{
    success: boolean
    servicesStarted: number
    branchesSwitched: number
    errors: string[]
  }> {
    const snapshot = this.getSnapshot(snapshotId)
    if (!snapshot) {
      throw new Error('Snapshot not found')
    }

    const errors: string[] = []
    let servicesStarted = 0
    let branchesSwitched = 0

    // 1. Stop all currently running services
    this.serviceManager.stopAll()

    // 2. Switch branches
    for (const repo of snapshot.repositories) {
      try {
        if (!fs.existsSync(repo.path)) {
          errors.push(`Repository not found: ${repo.path}`)
          continue
        }

        const git = simpleGit(repo.path)
        const status = await git.status()

        // Check if we're already on the right branch
        if (status.current === repo.branch) {
          continue
        }

        // Check for uncommitted changes
        if (!status.isClean()) {
          errors.push(`Cannot switch branch in ${repo.path}: uncommitted changes`)
          continue
        }

        // Switch branch
        await git.checkout(repo.branch)
        branchesSwitched++
      } catch (error: any) {
        errors.push(`Failed to switch branch in ${repo.path}: ${error.message}`)
      }
    }

    // 3. Start services
    for (const service of snapshot.runningServices) {
      try {
        await this.serviceManager.startService(service.serviceId)
        servicesStarted++
      } catch (error: any) {
        errors.push(`Failed to start service ${service.serviceName}: ${error.message}`)
      }
    }

    return {
      success: errors.length === 0,
      servicesStarted,
      branchesSwitched,
      errors,
    }
  }

  /**
   * Export workspace to JSON
   */
  exportSnapshot(snapshotId: string): string {
    const snapshot = this.getSnapshot(snapshotId)
    if (!snapshot) {
      throw new Error('Snapshot not found')
    }

    return JSON.stringify(snapshot, null, 2)
  }

  /**
   * Import workspace from JSON
   */
  importSnapshot(jsonData: string, newName?: string): WorkspaceSnapshot {
    const data = JSON.parse(jsonData)

    const id = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const name = newName || data.name || 'Imported Workspace'

    const config = {
      description: data.description,
      runningServices: data.runningServices || [],
      repositories: data.repositories || [],
      activeEnvProfile: data.activeEnvProfile,
      tags: data.tags || [],
      autoRestore: false,
      updatedAt: new Date().toISOString(),
    }

    const stmt = db.prepare(`
      INSERT INTO workspaces (id, name, config)
      VALUES (?, ?, ?)
    `)

    stmt.run(id, name, JSON.stringify(config))

    return {
      id,
      name,
      ...config,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Quick snapshot (capture current state with auto-generated name)
   */
  async quickSnapshot(): Promise<WorkspaceSnapshot> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const name = `Quick Snapshot ${timestamp}`

    // Get all services to find repo paths
    const allServices = this.serviceManager.getAllServices()
    const repoPaths = [...new Set(allServices.map(s => s.repoPath))]

    return this.createSnapshot(name, 'Auto-generated snapshot', repoPaths)
  }

  /**
   * Diff two snapshots
   */
  diffSnapshots(snapshot1Id: string, snapshot2Id: string): {
    serviceDiff: {
      added: string[]
      removed: string[]
      unchanged: string[]
    }
    branchDiff: Record<string, { from: string; to: string }>
  } {
    const snap1 = this.getSnapshot(snapshot1Id)
    const snap2 = this.getSnapshot(snapshot2Id)

    if (!snap1 || !snap2) {
      throw new Error('One or both snapshots not found')
    }

    // Service diff
    const services1 = new Set(snap1.runningServices.map(s => s.serviceId))
    const services2 = new Set(snap2.runningServices.map(s => s.serviceId))

    const serviceDiff = {
      added: Array.from(services2).filter(s => !services1.has(s)),
      removed: Array.from(services1).filter(s => !services2.has(s)),
      unchanged: Array.from(services1).filter(s => services2.has(s)),
    }

    // Branch diff
    const branchDiff: Record<string, { from: string; to: string }> = {}

    const repos1 = new Map(snap1.repositories.map(r => [r.path, r.branch]))
    const repos2 = new Map(snap2.repositories.map(r => [r.path, r.branch]))

    for (const [path, branch1] of repos1.entries()) {
      const branch2 = repos2.get(path)
      if (branch2 && branch1 !== branch2) {
        branchDiff[path] = { from: branch1, to: branch2 }
      }
    }

    return { serviceDiff, branchDiff }
  }
}
