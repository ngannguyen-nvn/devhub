/**
 * DevHub Manager
 *
 * Main manager class that wraps all @devhub/core service managers.
 * This provides a unified interface for the extension to interact with
 * all DevHub functionality.
 *
 * Note: The core package managers use a singleton database initialized
 * at module level. We work with this design by ensuring the database
 * is in the correct location.
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import {
  ServiceManager,
  DockerManager,
  EnvManager,
  WorkspaceManager,
  NotesManager,
  HealthCheckManager,
  LogManager,
  GroupManager,
  RepoScanner,
} from '@devhub/core'
import type { Service, Repository } from '@devhub/shared'

export class DevHubManager {
  private serviceManager!: ServiceManager
  private dockerManager!: DockerManager
  private envManager!: EnvManager
  private workspaceManager!: WorkspaceManager
  private notesManager!: NotesManager
  private healthCheckManager!: HealthCheckManager
  private logManager!: LogManager
  private groupManager!: GroupManager
  private repoScanner!: RepoScanner
  private activeWorkspaceId: string | null = null

  private dbPath: string

  constructor(private context: vscode.ExtensionContext) {
    // Database will be stored in extension's global storage
    this.dbPath = path.join(
      context.globalStorageUri.fsPath,
      'devhub.db'
    )
  }

  /**
   * Initialize all managers
   * Must be called after construction
   */
  async initialize(): Promise<void> {
    try {
      // Ensure storage directory exists
      await this.ensureStorageDirectory()

      console.log(`DevHub will use database at: ${this.dbPath}`)

      // Initialize all service managers (they don't take constructor args)
      this.serviceManager = new ServiceManager()
      this.dockerManager = new DockerManager()
      this.envManager = new EnvManager()
      this.notesManager = new NotesManager()
      this.healthCheckManager = new HealthCheckManager()
      this.logManager = new LogManager()
      this.groupManager = new GroupManager()
      this.repoScanner = new RepoScanner()

      // WorkspaceManager needs other managers
      this.workspaceManager = new WorkspaceManager(
        this.serviceManager,
        this.dockerManager,
        this.envManager,
        this.notesManager
      )

      // Get or create active workspace
      await this.ensureActiveWorkspace()

      console.log('DevHub managers initialized successfully')
    } catch (error) {
      console.error('Failed to initialize DevHub managers:', error)
      throw error
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    const storageDir = path.dirname(this.dbPath)
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
    }
  }

  /**
   * Ensure there's an active workspace
   */
  private async ensureActiveWorkspace(): Promise<void> {
    const activeWorkspace = this.workspaceManager.getActiveWorkspace()
    if (activeWorkspace) {
      this.activeWorkspaceId = activeWorkspace.id
    } else {
      // Create default workspace
      const workspaceFolders = vscode.workspace.workspaceFolders
      const folderPath = workspaceFolders?.[0]?.uri.fsPath || ''
      const workspaceName = workspaceFolders?.[0]?.name || 'Default Workspace'

      const workspace = this.workspaceManager.createWorkspace({
        name: workspaceName,
        description: 'Auto-created workspace for VSCode',
        folderPath,
        setAsActive: true
      })
      this.activeWorkspaceId = workspace.id
    }
  }

  /**
   * Get all service managers (for message handler)
   */
  getServiceManager() {
    return this.serviceManager
  }

  getDockerManager() {
    return this.dockerManager
  }

  getEnvManager() {
    return this.envManager
  }

  getWorkspaceManager() {
    return this.workspaceManager
  }

  getNotesManager() {
    return this.notesManager
  }

  getHealthCheckManager() {
    return this.healthCheckManager
  }

  getLogManager() {
    return this.logManager
  }

  getGroupManager() {
    return this.groupManager
  }

  getRepoScanner() {
    return this.repoScanner
  }

  getActiveWorkspaceId(): string {
    if (!this.activeWorkspaceId) {
      const activeWorkspace = this.workspaceManager.getActiveWorkspace()
      if (activeWorkspace) {
        this.activeWorkspaceId = activeWorkspace.id
      } else {
        throw new Error('No active workspace')
      }
    }
    return this.activeWorkspaceId
  }

  /**
   * Convenience methods for common operations
   */

  async getAllServices(): Promise<Service[]> {
    return this.serviceManager.getAllServices(this.getActiveWorkspaceId()) as any
  }

  async getRunningServices(): Promise<Service[]> {
    return this.serviceManager.getRunningServicesForWorkspace(this.getActiveWorkspaceId())
  }

  async startService(serviceId: string): Promise<void> {
    return this.serviceManager.startService(serviceId)
  }

  async stopService(serviceId: string): Promise<void> {
    return this.serviceManager.stopService(serviceId)
  }

  /**
   * Scan workspace for repositories
   */
  async scanWorkspace(): Promise<Repository[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return []
    }

    // Scan first workspace folder
    const rootPath = workspaceFolders[0].uri.fsPath
    const config = vscode.workspace.getConfiguration('devhub')
    const depth = config.get<number>('scanDepth', 3)

    const repos = await this.repoScanner.scanDirectory(rootPath, depth)
    return repos
  }

  /**
   * Create quick snapshot of current workspace state
   */
  async createQuickSnapshot(name: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder opened')
    }

    // Scan repositories
    const repos = await this.scanWorkspace()

    // Get running services
    const runningServices = await this.getRunningServices()

    // Create snapshot config
    const config = {
      name,
      description: `Quick snapshot created at ${new Date().toLocaleString()}`,
      repositories: repos.map(r => ({
        path: r.path,
        branch: r.branch,
        hasChanges: r.hasChanges,
      })),
      runningServices: runningServices.map(s => ({
        id: s.id,
        name: s.name,
      })),
    }

    // Create snapshot in active workspace
    await this.workspaceManager.createSnapshot(
      name,
      `Quick snapshot created at ${new Date().toLocaleString()}`,
      repos.map(r => r.path),
      undefined, // activeEnvProfile
      undefined, // tags
      workspaceFolders[0].uri.fsPath, // scannedPath
      this.getActiveWorkspaceId(), // workspaceId
      false // autoImportEnv
    )
  }

  /**
   * Activate a workspace
   */
  async activateWorkspace(workspaceId: string): Promise<void> {
    this.workspaceManager.setActiveWorkspace(workspaceId)
    this.activeWorkspaceId = workspaceId
  }

  /**
   * Restore a snapshot
   */
  async restoreSnapshot(snapshotId: string, applyEnvVars: boolean = false): Promise<void> {
    await this.workspaceManager.restoreSnapshot(snapshotId, applyEnvVars)
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log('Disposing DevHub managers')

    try {
      // Stop all running services
      const runningServices = this.serviceManager.getRunningServices()
      runningServices.forEach(service => {
        try {
          this.serviceManager.stopService(service.id)
        } catch (error) {
          console.error(`Failed to stop service ${service.name}:`, error)
        }
      })

      console.log('DevHub managers disposed successfully')
    } catch (error) {
      console.error('Error during DevHub manager disposal:', error)
    }
  }
}
