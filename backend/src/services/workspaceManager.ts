import db from '../db'
import { WorkspaceSnapshot, Workspace } from '@devhub/shared'
import { ServiceManager } from './serviceManager'
import { DockerManager } from './dockerManager'
import { EnvManager } from './envManager'
import { NotesManager } from './notesManager'
import simpleGit from 'simple-git'
import * as fs from 'fs'

export class WorkspaceManager {
  private serviceManager: ServiceManager
  private dockerManager: DockerManager
  private envManager: EnvManager
  private notesManager: NotesManager

  constructor(
    serviceManager: ServiceManager,
    dockerManager: DockerManager,
    envManager: EnvManager,
    notesManager: NotesManager
  ) {
    this.serviceManager = serviceManager
    this.dockerManager = dockerManager
    this.envManager = envManager
    this.notesManager = notesManager
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate standardized timestamp for snapshot names
   * Format: YYYY-MM-DD HH:MM:SS
   */
  private generateTimestamp(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  /**
   * Public method to generate snapshot name with standard timestamp
   */
  generateSnapshotName(prefix: string = 'Snapshot'): string {
    return `${prefix} ${this.generateTimestamp()}`
  }

  // ==================== WORKSPACE CRUD METHODS ====================

  /**
   * Get all workspaces with snapshot counts and latest snapshot info
   */
  getAllWorkspaces(): Workspace[] {
    const stmt = db.prepare(`
      SELECT
        w.*,
        COUNT(ws.id) as snapshot_count,
        MAX(ws.updated_at) as latest_snapshot_date
      FROM workspaces w
      LEFT JOIN workspace_snapshots ws ON w.id = ws.workspace_id
      GROUP BY w.id
      ORDER BY w.active DESC, w.updated_at DESC
    `)
    const rows = stmt.all() as any[]

    return rows.map(row => {
      // Get latest snapshot for this workspace
      const latestSnapshotStmt = db.prepare(`
        SELECT id, name, created_at
        FROM workspace_snapshots
        WHERE workspace_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `)
      const latestSnapshot = latestSnapshotStmt.get(row.id) as any

      return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        folderPath: row.folder_path || undefined,
        active: Boolean(row.active),
        activeSnapshotId: row.active_snapshot_id || undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        snapshotCount: row.snapshot_count || 0,
        latestSnapshot: latestSnapshot ? {
          id: latestSnapshot.id,
          name: latestSnapshot.name,
          createdAt: latestSnapshot.created_at,
        } : undefined,
      }
    })
  }

  /**
   * Get a specific workspace by ID
   */
  getWorkspace(workspaceId: string): Workspace | null {
    const stmt = db.prepare('SELECT * FROM workspaces WHERE id = ?')
    const row = stmt.get(workspaceId) as any

    if (!row) return null

    // Get snapshot count
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM workspace_snapshots WHERE workspace_id = ?')
    const countRow = countStmt.get(workspaceId) as any

    // Get latest snapshot
    const latestStmt = db.prepare(`
      SELECT id, name, created_at
      FROM workspace_snapshots
      WHERE workspace_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `)
    const latestSnapshot = latestStmt.get(workspaceId) as any

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      folderPath: row.folder_path || undefined,
      active: Boolean(row.active),
      activeSnapshotId: row.active_snapshot_id || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      snapshotCount: countRow?.count || 0,
      latestSnapshot: latestSnapshot ? {
        id: latestSnapshot.id,
        name: latestSnapshot.name,
        createdAt: latestSnapshot.created_at,
      } : undefined,
    }
  }

  /**
   * Get workspace by folder path
   */
  getWorkspaceByFolderPath(folderPath: string): Workspace | null {
    const stmt = db.prepare('SELECT * FROM workspaces WHERE folder_path = ? LIMIT 1')
    const row = stmt.get(folderPath) as any

    if (!row) return null

    return this.getWorkspace(row.id)
  }

  /**
   * Get the currently active workspace
   */
  getActiveWorkspace(): Workspace | null {
    const stmt = db.prepare('SELECT * FROM workspaces WHERE active = 1 LIMIT 1')
    const row = stmt.get() as any

    if (!row) return null

    return this.getWorkspace(row.id)
  }

  /**
   * Create a new workspace
   */
  createWorkspace(data: {
    name: string
    description?: string
    folderPath?: string
    tags?: string[]
    setAsActive?: boolean
  }): Workspace {
    const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    // If setAsActive is true, deactivate all other workspaces
    if (data.setAsActive) {
      db.prepare('UPDATE workspaces SET active = 0').run()
    }

    const stmt = db.prepare(`
      INSERT INTO workspaces (id, name, description, folder_path, active, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      workspaceId,
      data.name,
      data.description || null,
      data.folderPath || null,
      data.setAsActive ? 1 : 0,
      data.tags ? JSON.stringify(data.tags) : null,
      now,
      now
    )

    return this.getWorkspace(workspaceId)!
  }

  /**
   * Update a workspace
   */
  updateWorkspace(workspaceId: string, data: {
    name?: string
    description?: string
    folderPath?: string
    tags?: string[]
  }): Workspace | null {
    const existing = this.getWorkspace(workspaceId)
    if (!existing) return null

    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }

    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description || null)
    }

    if (data.folderPath !== undefined) {
      updates.push('folder_path = ?')
      values.push(data.folderPath || null)
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?')
      values.push(data.tags ? JSON.stringify(data.tags) : null)
    }

    if (updates.length === 0) return existing

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())

    values.push(workspaceId)

    const stmt = db.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...values)

    return this.getWorkspace(workspaceId)
  }

  /**
   * Set a workspace as active (deactivates all others)
   */
  setActiveWorkspace(workspaceId: string): Workspace | null {
    const workspace = this.getWorkspace(workspaceId)
    if (!workspace) return null

    // Deactivate all workspaces
    db.prepare('UPDATE workspaces SET active = 0').run()

    // Activate the specified workspace
    db.prepare('UPDATE workspaces SET active = 1, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), workspaceId)

    return this.getWorkspace(workspaceId)
  }

  /**
   * Delete a workspace (cascade deletes all snapshots)
   */
  deleteWorkspace(workspaceId: string): boolean {
    const workspace = this.getWorkspace(workspaceId)
    if (!workspace) return false

    // Delete workspace (snapshots will be cascade deleted due to FK constraint)
    const stmt = db.prepare('DELETE FROM workspaces WHERE id = ?')
    const result = stmt.run(workspaceId)

    // If this was the active workspace, set another as active
    if (workspace.active) {
      const remaining = this.getAllWorkspaces()
      if (remaining.length > 0) {
        this.setActiveWorkspace(remaining[0].id)
      }
    }

    return result.changes > 0
  }

  /**
   * Get all snapshots for a specific workspace
   */
  getWorkspaceSnapshots(workspaceId: string, limit?: number): WorkspaceSnapshot[] {
    let query = `
      SELECT * FROM workspace_snapshots
      WHERE workspace_id = ?
      ORDER BY updated_at DESC
    `
    if (limit !== undefined && limit > 0) {
      query += ` LIMIT ${limit}`
    }

    const stmt = db.prepare(query)
    const rows = stmt.all(workspaceId) as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      workspaceId: row.workspace_id,
      ...JSON.parse(row.config),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  // ==================== SNAPSHOT METHODS ====================

  /**
   * Get all workspace snapshots
   */
  getAllSnapshots(): WorkspaceSnapshot[] {
    const stmt = db.prepare('SELECT * FROM workspace_snapshots ORDER BY updated_at DESC')
    const rows = stmt.all() as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      workspaceId: row.workspace_id,
      ...JSON.parse(row.config),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  /**
   * Get a specific snapshot
   */
  getSnapshot(snapshotId: string): WorkspaceSnapshot | null {
    const stmt = db.prepare('SELECT * FROM workspace_snapshots WHERE id = ?')
    const row = stmt.get(snapshotId) as any

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      workspaceId: row.workspace_id,
      ...JSON.parse(row.config),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  /**
   * Capture current workspace state for a specific workspace
   */
  async captureCurrentState(workspaceId: string, repoPaths: string[], scannedPath?: string): Promise<{
    runningServices: Array<{ serviceId: string; serviceName: string }>
    repositories: Array<{ path: string; branch: string; hasChanges: boolean }>
    dockerContainers?: Array<{
      id: string
      name: string
      image: string
      state: string
      ports: Array<{ privatePort: number; publicPort?: number }>
    }>
    envVariables?: Record<string, Record<string, string>>
    serviceLogs?: Record<string, string[]>
    wikiNotes?: Array<{
      id: string
      title: string
      content: string
      tags?: string[]
    }>
    scannedPath?: string
  }> {
    // Get running services for this workspace only
    const runningServices = this.serviceManager.getRunningServicesForWorkspace(workspaceId).map(service => ({
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

    // Get Docker containers
    let dockerContainers: Array<{
      id: string
      name: string
      image: string
      state: string
      ports: Array<{ privatePort: number; publicPort?: number }>
    }> = []
    try {
      const containers = await this.dockerManager.listContainers(false) // Only running containers
      dockerContainers = containers.map(c => ({
        id: c.id,
        name: c.name,
        image: c.image,
        state: c.state,
        ports: c.ports.map(p => ({
          privatePort: p.privatePort,
          publicPort: p.publicPort,
        })),
      }))
    } catch (error) {
      console.error('Error capturing Docker containers:', error)
      dockerContainers = []
    }

    // Get environment variables for all profiles and services in this workspace
    const envVariables: Record<string, Record<string, string>> = {}
    try {
      const allServices = this.serviceManager.getAllServices(workspaceId)
      const profiles = this.envManager.getAllProfiles(workspaceId)

      // Capture service-specific variables
      for (const service of allServices) {
        const serviceEnv: Record<string, string> = {}

        // Get variables from all profiles for this service
        for (const profile of profiles) {
          const variables = this.envManager.getVariables(profile.id, service.id)
          for (const variable of variables) {
            serviceEnv[variable.key] = variable.value
          }
        }

        if (Object.keys(serviceEnv).length > 0) {
          envVariables[service.id] = serviceEnv
        }
      }

      // Also capture profile-level variables (not tied to specific services)
      for (const profile of profiles) {
        const profileVars = this.envManager.getVariables(profile.id) // No serviceId = get global vars
        if (profileVars.length > 0) {
          const profileEnv: Record<string, string> = {}
          for (const variable of profileVars) {
            profileEnv[variable.key] = variable.value
          }
          // Store under profile ID to keep them separate
          if (Object.keys(profileEnv).length > 0) {
            envVariables[profile.id] = profileEnv
          }
        }
      }
    } catch (error) {
      console.error('Error capturing environment variables:', error)
    }

    // Get service logs
    const serviceLogs: Record<string, string[]> = {}
    try {
      for (const service of runningServices) {
        const logs = this.serviceManager.getServiceLogs(service.serviceId, 500)
        if (logs.length > 0) {
          serviceLogs[service.serviceId] = logs
        }
      }
    } catch (error) {
      console.error('Error capturing service logs:', error)
    }

    // Get wiki notes for this workspace
    let wikiNotes: Array<{
      id: string
      title: string
      content: string
      tags?: string[]
    }> = []
    try {
      const allNotes = this.notesManager.getAllNotes(workspaceId)
      wikiNotes = allNotes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
      }))
    } catch (error) {
      console.error('Error capturing wiki notes:', error)
      wikiNotes = []
    }

    return {
      runningServices,
      repositories: repositories.filter(r => r !== null) as any[],
      dockerContainers,
      envVariables,
      serviceLogs,
      wikiNotes,
      scannedPath,
    }
  }

  /**
   * Create a new workspace snapshot
   * If workspaceId is not provided but scannedPath is, auto-creates/finds workspace (hybrid approach)
   */
  async createSnapshot(
    name: string,
    description: string | undefined,
    repoPaths: string[],
    activeEnvProfile?: string,
    tags?: string[],
    scannedPath?: string,
    workspaceId?: string
  ): Promise<WorkspaceSnapshot> {
    const id = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    // Determine workspace ID (hybrid approach)
    let targetWorkspaceId = workspaceId

    if (!targetWorkspaceId && scannedPath) {
      // Auto-create/find workspace by folder path
      const existing = this.getWorkspaceByFolderPath(scannedPath)
      if (existing) {
        targetWorkspaceId = existing.id
      } else {
        // Create new workspace for this folder
        const folderName = scannedPath.split('/').filter(Boolean).pop() || 'Unnamed Workspace'
        // Check if this is the first workspace - if so, set as active
        const allWorkspaces = this.getAllWorkspaces()
        const setAsActive = allWorkspaces.length === 0
        const newWorkspace = this.createWorkspace({
          name: folderName,
          description: `Auto-created from folder scan`,
          folderPath: scannedPath,
          tags,
          setAsActive,
        })
        targetWorkspaceId = newWorkspace.id
      }
    }

    // If still no workspace ID, use/create default workspace
    if (!targetWorkspaceId) {
      const activeWorkspace = this.getActiveWorkspace()
      if (activeWorkspace) {
        targetWorkspaceId = activeWorkspace.id
      } else {
        // Create default workspace
        const defaultWorkspace = this.createWorkspace({
          name: 'Default Workspace',
          description: 'Default workspace for snapshots',
          setAsActive: true,
        })
        targetWorkspaceId = defaultWorkspace.id
      }
    }

    // Capture current state for this workspace
    const state = await this.captureCurrentState(targetWorkspaceId, repoPaths, scannedPath)

    const config = {
      description,
      runningServices: state.runningServices,
      repositories: state.repositories,
      dockerContainers: state.dockerContainers,
      envVariables: state.envVariables,
      serviceLogs: state.serviceLogs,
      wikiNotes: state.wikiNotes,
      activeEnvProfile,
      tags,
      autoRestore: false,
      scannedPath,
    }

    const stmt = db.prepare(`
      INSERT INTO workspace_snapshots (id, name, workspace_id, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, name, targetWorkspaceId, JSON.stringify(config), now, now)

    // Update workspace's updated_at
    db.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, targetWorkspaceId)

    return {
      id,
      name,
      workspaceId: targetWorkspaceId,
      ...config,
      createdAt: now,
      updatedAt: now,
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
      dockerContainers: current.dockerContainers,
      envVariables: current.envVariables,
      serviceLogs: current.serviceLogs,
      wikiNotes: current.wikiNotes,
      activeEnvProfile: current.activeEnvProfile,
      tags: updates.tags !== undefined ? updates.tags : current.tags,
      autoRestore: updates.autoRestore !== undefined ? updates.autoRestore : current.autoRestore,
      scannedPath: current.scannedPath,
    }

    const now = new Date().toISOString()
    const stmt = db.prepare(`
      UPDATE workspace_snapshots SET name = ?, config = ?, updated_at = ? WHERE id = ?
    `)

    const result = stmt.run(newName, JSON.stringify(newConfig), now, snapshotId)

    // Update workspace's updated_at
    if (result.changes > 0) {
      db.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, current.workspaceId)
    }

    return result.changes > 0
  }

  /**
   * Delete a workspace snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    const snapshot = this.getSnapshot(snapshotId)
    if (!snapshot) return false

    const stmt = db.prepare('DELETE FROM workspace_snapshots WHERE id = ?')
    const result = stmt.run(snapshotId)

    // Update workspace's updated_at
    if (result.changes > 0) {
      db.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?')
        .run(new Date().toISOString(), snapshot.workspaceId)
    }

    return result.changes > 0
  }

  /**
   * Clear the active snapshot from a workspace
   * This is useful when the user has made changes that diverge from the snapshot
   */
  clearActiveSnapshot(workspaceId: string): boolean {
    const workspace = this.getWorkspace(workspaceId)
    if (!workspace) return false

    const now = new Date().toISOString()
    const stmt = db.prepare('UPDATE workspaces SET active_snapshot_id = NULL, updated_at = ? WHERE id = ?')
    const result = stmt.run(now, workspaceId)

    return result.changes > 0
  }

  /**
   * Check for uncommitted changes across all repositories in a snapshot
   */
  async checkUncommittedChanges(snapshotId: string): Promise<Array<{
    path: string
    hasChanges: boolean
    files: {
      modified: string[]
      added: string[]
      deleted: string[]
      renamed: string[]
    }
  }>> {
    const snapshot = this.getSnapshot(snapshotId)
    if (!snapshot) {
      throw new Error('Snapshot not found')
    }

    const results: Array<{
      path: string
      hasChanges: boolean
      files: {
        modified: string[]
        added: string[]
        deleted: string[]
        renamed: string[]
      }
    }> = []

    for (const repo of snapshot.repositories) {
      try {
        if (!fs.existsSync(repo.path)) {
          continue
        }

        const git = simpleGit(repo.path)
        const status = await git.status()

        results.push({
          path: repo.path,
          hasChanges: !status.isClean(),
          files: {
            modified: status.modified,
            added: status.created,
            deleted: status.deleted,
            renamed: status.renamed.map(r => `${r.from} -> ${r.to}`),
          },
        })
      } catch (error: any) {
        console.error(`Error checking changes in ${repo.path}:`, error)
      }
    }

    return results
  }

  /**
   * Stash uncommitted changes in specified repositories
   */
  async stashChanges(repoPaths: string[]): Promise<{
    success: boolean
    stashed: string[]
    errors: Array<{ path: string; message: string }>
  }> {
    const stashed: string[] = []
    const errors: Array<{ path: string; message: string }> = []

    for (const repoPath of repoPaths) {
      try {
        if (!fs.existsSync(repoPath)) {
          errors.push({ path: repoPath, message: 'Repository not found' })
          continue
        }

        const git = simpleGit(repoPath)
        const status = await git.status()

        // Only stash if there are changes
        if (!status.isClean()) {
          await git.stash(['save', '--include-untracked', `Auto-stash before snapshot restore - ${new Date().toISOString()}`])
          stashed.push(repoPath)
        }
      } catch (error: any) {
        errors.push({ path: repoPath, message: error.message })
      }
    }

    return {
      success: errors.length === 0,
      stashed,
      errors,
    }
  }

  /**
   * List stashes for repositories
   */
  async listStashes(repoPaths: string[]): Promise<{
    success: boolean
    stashes: Record<string, Array<{
      index: number
      hash: string
      message: string
      date: string
    }>>
    errors: Array<{ path: string; message: string }>
  }> {
    const stashes: Record<string, Array<{
      index: number
      hash: string
      message: string
      date: string
    }>> = {}
    const errors: Array<{ path: string; message: string }> = []

    for (const repoPath of repoPaths) {
      try {
        if (!fs.existsSync(repoPath)) {
          errors.push({ path: repoPath, message: 'Repository not found' })
          continue
        }

        const git = simpleGit(repoPath)
        const stashList = await git.stashList()

        if (stashList.total > 0) {
          stashes[repoPath] = stashList.all.map((stash, index) => ({
            index,
            hash: stash.hash,
            message: stash.message,
            date: stash.date,
          }))
        }
      } catch (error: any) {
        errors.push({ path: repoPath, message: error.message })
      }
    }

    return {
      success: errors.length === 0,
      stashes,
      errors,
    }
  }

  /**
   * Apply a stash in a repository
   */
  async applyStash(repoPath: string, stashIndex: number = 0, pop: boolean = false): Promise<{
    success: boolean
    message: string
  }> {
    try {
      if (!fs.existsSync(repoPath)) {
        throw new Error('Repository not found')
      }

      const git = simpleGit(repoPath)

      if (pop) {
        await git.stash(['pop', `stash@{${stashIndex}}`])
        return {
          success: true,
          message: `Stash ${stashIndex} popped successfully`,
        }
      } else {
        await git.stash(['apply', `stash@{${stashIndex}}`])
        return {
          success: true,
          message: `Stash ${stashIndex} applied successfully`,
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      }
    }
  }

  /**
   * Drop (delete) a stash in a repository
   */
  async dropStash(repoPath: string, stashIndex: number = 0): Promise<{
    success: boolean
    message: string
  }> {
    try {
      if (!fs.existsSync(repoPath)) {
        throw new Error('Repository not found')
      }

      const git = simpleGit(repoPath)
      await git.stash(['drop', `stash@{${stashIndex}}`])

      return {
        success: true,
        message: `Stash ${stashIndex} dropped successfully`,
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      }
    }
  }

  /**
   * Get details of a specific stash (files changed)
   */
  async getStashDetails(repoPath: string, stashIndex: number = 0): Promise<{
    success: boolean
    files: Array<{
      file: string
      insertions: number
      deletions: number
      changes: number
      isUntracked?: boolean
    }>
    summary: {
      totalFiles: number
      totalInsertions: number
      totalDeletions: number
      untrackedFiles: number
    }
    diff?: string
  }> {
    try {
      if (!fs.existsSync(repoPath)) {
        throw new Error('Repository not found')
      }

      const git = simpleGit(repoPath)

      // Get stash stats
      const statsOutput = await git.raw(['stash', 'show', '--stat', `stash@{${stashIndex}}`])

      // Parse the stats output
      const lines = statsOutput.trim().split('\n')
      const files: Array<{
        file: string
        insertions: number
        deletions: number
        changes: number
        isUntracked?: boolean
      }> = []

      let totalInsertions = 0
      let totalDeletions = 0

      // Parse each line (except the summary line)
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Format: " filename | 10 +++++-----"
        const match = line.match(/(.+?)\s+\|\s+(\d+)\s+([+-]+)/)
        if (match) {
          const filename = match[1].trim()
          const changes = parseInt(match[2], 10)
          const symbols = match[3]
          const insertions = (symbols.match(/\+/g) || []).length
          const deletions = (symbols.match(/-/g) || []).length

          files.push({
            file: filename,
            insertions,
            deletions,
            changes,
            isUntracked: false,
          })

          totalInsertions += insertions
          totalDeletions += deletions
        }
      }

      // Check for untracked files in stash (stash^3 tree if it exists)
      let untrackedCount = 0
      try {
        const untrackedOutput = await git.raw(['ls-tree', '-r', '--name-only', `stash@{${stashIndex}}^3`])
        const untrackedFiles = untrackedOutput.trim().split('\n').filter(f => f)

        for (const file of untrackedFiles) {
          files.push({
            file: `${file} (untracked)`,
            insertions: 0,
            deletions: 0,
            changes: 0,
            isUntracked: true,
          })
          untrackedCount++
        }
      } catch (error) {
        // No untracked files in this stash (stash^3 doesn't exist)
      }

      // Get the diff (optional, can be large)
      const diffOutput = await git.raw(['stash', 'show', '-p', `stash@{${stashIndex}}`])

      return {
        success: true,
        files,
        summary: {
          totalFiles: files.length,
          totalInsertions,
          totalDeletions,
          untrackedFiles: untrackedCount,
        },
        diff: diffOutput,
      }
    } catch (error: any) {
      return {
        success: false,
        files: [],
        summary: {
          totalFiles: 0,
          totalInsertions: 0,
          totalDeletions: 0,
          untrackedFiles: 0,
        },
      }
    }
  }

  /**
   * Commit uncommitted changes in specified repositories
   */
  async commitChanges(
    repoPaths: string[],
    commitMessage: string
  ): Promise<{
    success: boolean
    committed: string[]
    errors: Array<{ path: string; message: string }>
  }> {
    const committed: string[] = []
    const errors: Array<{ path: string; message: string }> = []

    for (const repoPath of repoPaths) {
      try {
        if (!fs.existsSync(repoPath)) {
          errors.push({ path: repoPath, message: 'Repository not found' })
          continue
        }

        const git = simpleGit(repoPath)
        const status = await git.status()

        // Only commit if there are changes
        if (!status.isClean()) {
          // Add all changes
          await git.add('.')

          // Commit with the provided message
          await git.commit(commitMessage)
          committed.push(repoPath)
        }
      } catch (error: any) {
        errors.push({ path: repoPath, message: error.message })
      }
    }

    return {
      success: errors.length === 0,
      committed,
      errors,
    }
  }

  /**
   * Restore a workspace snapshot
   */
  async restoreSnapshot(snapshotId: string): Promise<{
    success: boolean
    servicesStarted: number
    branchesSwitched: number
    envVarsRestored: number
    errors: string[]
  }> {
    const snapshot = this.getSnapshot(snapshotId)
    if (!snapshot) {
      throw new Error('Snapshot not found')
    }

    const errors: string[] = []
    let servicesStarted = 0
    let branchesSwitched = 0
    let envVarsRestored = 0

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

    // 3. Restore environment variables
    if (snapshot.envVariables && Object.keys(snapshot.envVariables).length > 0) {
      try {
        // Create a profile for the restored env vars
        const profileName = `Snapshot: ${snapshot.name}`

        // Check if a restore profile already exists for this snapshot
        let profile = this.envManager.getProfileByName(snapshot.workspaceId, profileName)

        if (!profile) {
          // Create new profile
          profile = this.envManager.createProfile(
            snapshot.workspaceId,
            profileName,
            `Environment variables restored from snapshot "${snapshot.name}"`
          )
          console.log(`Created env profile "${profileName}" for restored variables`)
        } else {
          console.log(`Using existing env profile "${profileName}" for restored variables`)
        }

        // Restore variables for each service
        for (const [serviceId, vars] of Object.entries(snapshot.envVariables)) {
          for (const [key, value] of Object.entries(vars)) {
            // Check if variable already exists
            const existingVars = this.envManager.getVariables(profile.id, serviceId)
            const existingVar = existingVars.find(v => v.key === key)

            if (existingVar) {
              // Update existing variable
              this.envManager.updateVariable(existingVar.id, { value })
            } else {
              // Create new variable
              this.envManager.createVariable({
                key,
                value,
                profileId: profile.id,
                serviceId,
                isSecret: false, // Assume non-secret for restored vars
              })
            }
            envVarsRestored++
          }
        }

        console.log(`Restored ${envVarsRestored} environment variables to profile "${profileName}"`)
      } catch (error: any) {
        errors.push(`Failed to restore environment variables: ${error.message}`)
        console.error('Error restoring environment variables:', error)
      }
    }

    // 4. Start services
    for (const service of snapshot.runningServices) {
      try {
        await this.serviceManager.startService(service.serviceId)
        servicesStarted++
      } catch (error: any) {
        errors.push(`Failed to start service ${service.serviceName}: ${error.message}`)
      }
    }

    // 5. Set this snapshot as active in the workspace (if restore was successful or partial)
    try {
      const now = new Date().toISOString()
      db.prepare('UPDATE workspaces SET active_snapshot_id = ?, updated_at = ? WHERE id = ?')
        .run(snapshotId, now, snapshot.workspaceId)
    } catch (error: any) {
      console.error('Failed to set active snapshot:', error)
      // Don't fail the restore if we can't set the active snapshot
    }

    return {
      success: errors.length === 0,
      servicesStarted,
      branchesSwitched,
      envVarsRestored,
      errors,
    }
  }

  /**
   * Restore a workspace snapshot selectively
   */
  async restoreSnapshotSelective(
    snapshotId: string,
    options: {
      restoreBranches?: boolean
      restoreServices?: boolean
      restoreDocker?: boolean
      restoreEnvVars?: boolean
    }
  ): Promise<{
    success: boolean
    servicesStarted: number
    branchesSwitched: number
    containersStarted: number
    envVarsApplied: number
    errors: string[]
  }> {
    const snapshot = this.getSnapshot(snapshotId)
    if (!snapshot) {
      throw new Error('Snapshot not found')
    }

    const errors: string[] = []
    let servicesStarted = 0
    let branchesSwitched = 0
    let containersStarted = 0
    let envVarsApplied = 0

    // 1. Restore branches
    if (options.restoreBranches && snapshot.repositories) {
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
    }

    // 2. Restore services
    if (options.restoreServices && snapshot.runningServices) {
      // Stop all currently running services first
      this.serviceManager.stopAll()

      for (const service of snapshot.runningServices) {
        try {
          await this.serviceManager.startService(service.serviceId)
          servicesStarted++
        } catch (error: any) {
          errors.push(`Failed to start service ${service.serviceName}: ${error.message}`)
        }
      }
    }

    // 3. Restore Docker containers
    if (options.restoreDocker && snapshot.dockerContainers) {
      for (const container of snapshot.dockerContainers) {
        try {
          // Try to start the container if it exists
          await this.dockerManager.startContainer(container.id)
          containersStarted++
        } catch (error: any) {
          errors.push(`Failed to start container ${container.name}: ${error.message}`)
        }
      }
    }

    // 4. Restore environment variables
    if (options.restoreEnvVars && snapshot.envVariables) {
      // Note: This is a simplified version
      // In a real implementation, you might want to create a new profile
      // or update an existing one with the snapshot's env vars
      try {
        const profileName = `${snapshot.name} - Restored ${new Date().toISOString()}`
        const profile = this.envManager.createProfile(
          snapshot.workspaceId,
          profileName,
          `Restored from snapshot: ${snapshot.name}`
        )

        for (const [serviceId, vars] of Object.entries(snapshot.envVariables)) {
          for (const [key, value] of Object.entries(vars)) {
            this.envManager.createVariable({
              key,
              value,
              profileId: profile.id,
              serviceId,
              isSecret: false, // You might want to determine this from the variable name
            })
            envVarsApplied++
          }
        }
      } catch (error: any) {
        errors.push(`Failed to restore environment variables: ${error.message}`)
      }
    }

    return {
      success: errors.length === 0,
      servicesStarted,
      branchesSwitched,
      containersStarted,
      envVarsApplied,
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

    const id = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const name = newName || data.name || 'Imported Snapshot'

    // Get active workspace or use workspaceId from data
    const workspaceId = data.workspaceId || this.getActiveWorkspace()?.id
    if (!workspaceId) {
      throw new Error('No active workspace found. Please activate a workspace first.')
    }

    const config = {
      description: data.description,
      runningServices: data.runningServices || [],
      repositories: data.repositories || [],
      activeEnvProfile: data.activeEnvProfile,
      tags: data.tags || [],
      autoRestore: false,
    }

    const stmt = db.prepare(`
      INSERT INTO workspace_snapshots (id, name, workspace_id, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `)

    stmt.run(id, name, workspaceId, JSON.stringify(config))

    return {
      id,
      name,
      workspaceId,
      ...config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Quick snapshot (capture current state with auto-generated name for active workspace)
   */
  async quickSnapshot(): Promise<WorkspaceSnapshot> {
    const timestamp = this.generateTimestamp()
    const name = `Quick Snapshot ${timestamp}`

    // Get active workspace
    const activeWorkspace = this.getActiveWorkspace()
    if (!activeWorkspace) {
      throw new Error('No active workspace found. Please activate a workspace first.')
    }

    // Get all services in this workspace to find repo paths
    const allServices = this.serviceManager.getAllServices(activeWorkspace.id)
    const repoPaths = [...new Set(allServices.map(s => s.repoPath))]

    return this.createSnapshot(name, 'Auto-generated snapshot', repoPaths, undefined, undefined, undefined, activeWorkspace.id)
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
