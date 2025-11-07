/**
 * DevHub VSCode Extension
 *
 * Entry point for the DevHub extension. This extension provides
 * microservices management, Docker operations, environment variables,
 * and documentation capabilities within VSCode.
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { loadBetterSqlite3 } from './nativeLoader'

// Use type-only imports to avoid loading @devhub/core too early
import type { DevHubManager } from './extensionHost/devhubManager'
import type { DevHubPanel } from './webview/DevHubPanel'
import type { ServicesTreeProvider } from './views/ServicesTreeProvider'
import type { WorkspaceTreeProvider } from './views/WorkspaceTreeProvider'
import type { DashboardTreeProvider } from './views/DashboardTreeProvider'
import type { DockerTreeProvider } from './views/DockerTreeProvider'
import type { EnvironmentTreeProvider } from './views/EnvironmentTreeProvider'
import type { NotesTreeProvider } from './views/NotesTreeProvider'

let devhubManager: DevHubManager | undefined
let devhubPanel: DevHubPanel | undefined
let servicesTreeProvider: ServicesTreeProvider | undefined
let workspaceTreeProvider: WorkspaceTreeProvider | undefined
let dashboardTreeProvider: DashboardTreeProvider | undefined
let dockerTreeProvider: DockerTreeProvider | undefined
let environmentTreeProvider: EnvironmentTreeProvider | undefined
let notesTreeProvider: NotesTreeProvider | undefined

/**
 * Extension activation
 * Called when extension is first activated (on startup)
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('DevHub extension is now active')

  try {
    // Load correct better-sqlite3 prebuild for current Electron version
    // This must happen BEFORE any module tries to load better-sqlite3
    try {
      loadBetterSqlite3(context.extensionPath)
    } catch (error) {
      console.error('Failed to load better-sqlite3 prebuild:', error)
      throw new Error(`Failed to load native dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Add dist/node_modules to module search path for native dependencies
    const distNodeModules = path.join(context.extensionPath, 'dist', 'node_modules')
    if (process.env.NODE_PATH) {
      process.env.NODE_PATH = `${distNodeModules}${path.delimiter}${process.env.NODE_PATH}`
    } else {
      process.env.NODE_PATH = distNodeModules
    }
    require('module').Module._initPaths()
    console.log(`Added to NODE_PATH: ${distNodeModules}`)

    // Set database path for @devhub/core BEFORE any initialization
    // This must happen before any @devhub/core code runs
    const storagePath = context.globalStorageUri.fsPath
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true })
    }
    process.env.DEVHUB_DB_PATH = path.join(storagePath, 'devhub.db')
    console.log(`DevHub database path: ${process.env.DEVHUB_DB_PATH}`)

    // Dynamically import classes AFTER setting environment variable
    // This ensures @devhub/core uses the correct database path
    const { DevHubManager } = await import('./extensionHost/devhubManager')
    const { DevHubPanel } = await import('./webview/DevHubPanel')

    // Initialize DevHub manager (wraps @devhub/core)
    devhubManager = new DevHubManager(context)
    await devhubManager.initialize()

    // Initialize webview panel manager
    devhubPanel = new DevHubPanel(context, devhubManager)

    // Register tree views
    await registerTreeViews(context, devhubManager)

    // Set callback for refreshing workspaces tree view from webview
    devhubPanel.setRefreshWorkspacesTreeCallback(() => {
      console.log('[Extension] Refreshing workspaces tree view')
      if (workspaceTreeProvider) {
        console.log('[Extension] Tree provider exists, calling refresh')
        workspaceTreeProvider.refresh()
      } else {
        console.log('[Extension] Tree provider is undefined!')
      }
    })

    // Register commands
    registerCommands(context, devhubPanel, devhubManager)

    // Create status bar item
    createStatusBarItem(context, devhubManager)

    console.log('DevHub extension activated successfully')
  } catch (error) {
    console.error('Failed to activate DevHub extension:', error)
    vscode.window.showErrorMessage(
      `DevHub failed to activate: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extension deactivation
 * Called when extension is deactivated or VSCode closes
 */
export function deactivate() {
  console.log('DevHub extension is being deactivated')

  // Dispose tree providers (particularly important for ServicesTreeProvider which has setInterval)
  if (servicesTreeProvider && 'dispose' in servicesTreeProvider) {
    ;(servicesTreeProvider as any).dispose()
    servicesTreeProvider = undefined
  }

  if (devhubManager) {
    devhubManager.dispose()
    devhubManager = undefined
  }

  if (devhubPanel) {
    devhubPanel.dispose()
    devhubPanel = undefined
  }
}

/**
 * Register tree views for sidebar
 */
async function registerTreeViews(
  context: vscode.ExtensionContext,
  manager: DevHubManager
) {
  // Dynamically import tree providers
  const { DashboardTreeProvider } = await import('./views/DashboardTreeProvider')
  const { ServicesTreeProvider } = await import('./views/ServicesTreeProvider')
  const { DockerTreeProvider } = await import('./views/DockerTreeProvider')
  const { EnvironmentTreeProvider } = await import('./views/EnvironmentTreeProvider')
  const { WorkspaceTreeProvider } = await import('./views/WorkspaceTreeProvider')
  const { NotesTreeProvider } = await import('./views/NotesTreeProvider')

  // Dashboard tree view
  dashboardTreeProvider = new DashboardTreeProvider(manager)
  const dashboardTreeView = vscode.window.createTreeView('devhubDashboard', {
    treeDataProvider: dashboardTreeProvider,
    showCollapseAll: false,
  })
  context.subscriptions.push(dashboardTreeView)

  // Services tree view
  servicesTreeProvider = new ServicesTreeProvider(manager)
  const servicesTreeView = vscode.window.createTreeView('devhubServices', {
    treeDataProvider: servicesTreeProvider,
    showCollapseAll: false,
  })
  context.subscriptions.push(servicesTreeView)

  // Docker tree view
  dockerTreeProvider = new DockerTreeProvider(manager)
  const dockerTreeView = vscode.window.createTreeView('devhubDocker', {
    treeDataProvider: dockerTreeProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(dockerTreeView)

  // Environment tree view
  environmentTreeProvider = new EnvironmentTreeProvider(manager)
  const environmentTreeView = vscode.window.createTreeView('devhubEnvironment', {
    treeDataProvider: environmentTreeProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(environmentTreeView)

  // Workspace tree view
  workspaceTreeProvider = new WorkspaceTreeProvider(manager)
  const workspaceTreeView = vscode.window.createTreeView('devhubWorkspaces', {
    treeDataProvider: workspaceTreeProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(workspaceTreeView)

  // Notes tree view
  notesTreeProvider = new NotesTreeProvider(manager)
  const notesTreeView = vscode.window.createTreeView('devhubNotes', {
    treeDataProvider: notesTreeProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(notesTreeView)
}

/**
 * Register all VSCode commands
 */
function registerCommands(
  context: vscode.ExtensionContext,
  panel: DevHubPanel,
  manager: DevHubManager
) {
  // Open main dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.openPanel', () => {
      panel.show()
    })
  )

  // Scan workspace for repositories
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.scanRepos', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders
      if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder opened')
        return
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Scanning for repositories...',
          cancellable: false,
        },
        async () => {
          try {
            const repos = await manager.scanWorkspace()
            vscode.window.showInformationMessage(
              `Found ${repos.length} repositories`
            )
            panel.show()
          } catch (error) {
            vscode.window.showErrorMessage(
              `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
      )
    })
  )

  // Create quick snapshot
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.createSnapshot', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter snapshot name',
        placeHolder: 'e.g., Before Feature X',
      })

      if (name) {
        try {
          await manager.createQuickSnapshot(name)
          vscode.window.showInformationMessage(`Snapshot "${name}" created`)
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to create snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    })
  )

  // Start service (main command - can be called with serviceId string)
  const startServiceCommand = async (serviceId?: string) => {
    if (!serviceId) {
      // Show quick pick if no service provided
      const services = await manager.getAllServices()
      const items = services.map(s => ({
        label: s.name,
        description: s.repoPath,
        id: s.id,
      }))
      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select service to start',
      })
      if (selected) {
        serviceId = selected.id
      }
    }

    if (serviceId) {
      try {
        await manager.startService(serviceId)
        vscode.window.showInformationMessage('Service started')
        servicesTreeProvider?.refresh()
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to start service: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  // Register main command (for command palette)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.startService', startServiceCommand)
  )

  // Register context menu command (receives TreeItem, extracts serviceId)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.startServiceFromTree', async (treeItem: any) => {
      const serviceId = treeItem?.serviceId
      if (serviceId) {
        await startServiceCommand(serviceId)
      }
    })
  )

  // Stop service (main command - can be called with serviceId string)
  const stopServiceCommand = async (serviceId?: string) => {
    if (!serviceId) {
      // Show quick pick if no service provided
      const services = await manager.getRunningServices()
      const items = services.map(s => ({
        label: s.name,
        description: s.repoPath,
        id: s.id,
      }))
      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select service to stop',
      })
      if (selected) {
        serviceId = selected.id
      }
    }

    if (serviceId) {
      try {
        await manager.stopService(serviceId)
        vscode.window.showInformationMessage('Service stopped')
        servicesTreeProvider?.refresh()
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to stop service: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  // Register main command (for command palette)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.stopService', stopServiceCommand)
  )

  // Register context menu command (receives TreeItem, extracts serviceId)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.stopServiceFromTree', async (treeItem: any) => {
      const serviceId = treeItem?.serviceId
      if (serviceId) {
        await stopServiceCommand(serviceId)
      }
    })
  )

  // Show service details (from tree view)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.showServiceDetails', async (serviceId: string) => {
      panel.show()
      // Navigate to Services tab and select the service
      panel.postMessage({
        type: 'navigate',
        payload: {
          tab: 'services',
          serviceId
        }
      })
    })
  )

  // Activate workspace (from tree view)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.activateWorkspace', async (arg: any) => {
      try {
        // When called from context menu, arg is the tree item
        // When called from tree item click, arg is the workspace ID string
        const workspaceId = typeof arg === 'string' ? arg : arg.workspaceId

        if (!workspaceId) {
          vscode.window.showErrorMessage('No workspace ID provided')
          return
        }

        await manager.activateWorkspace(workspaceId)

        // Notify webview to refresh with the new workspace
        if (panel) {
          panel.postMessage({
            type: 'workspaceActivated',
            workspaceId: workspaceId
          })
        }

        vscode.window.showInformationMessage('Workspace activated')
        workspaceTreeProvider?.refresh()
        servicesTreeProvider?.refresh()
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to activate workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    })
  )

  // Snapshot menu (main command - can be called with snapshotId string)
  const snapshotMenuCommand = async (snapshotId?: string) => {
    if (!snapshotId) {
      vscode.window.showErrorMessage('No snapshot selected')
      return
    }

    // Show action menu
    const action = await vscode.window.showQuickPick(
      [
        { label: '$(history) Restore Snapshot', description: 'Restore workspace state from this snapshot', action: 'restore' },
        { label: '$(trash) Delete Snapshot', description: 'Permanently delete this snapshot', action: 'delete' }
      ],
      {
        placeHolder: 'Select action for snapshot'
      }
    )

    if (!action) {
      return // User cancelled
    }

    if (action.action === 'restore') {
      // Show restore options picker with checkboxes
      const options = await vscode.window.showQuickPick(
        [
          { label: 'Restore Git Branches', picked: true, key: 'restoreBranches' },
          { label: 'Restore & Start Services', picked: true, key: 'restoreServices' },
          { label: 'Restore Docker Containers', picked: false, key: 'restoreDocker' },
          { label: 'Apply Environment Variables to .env files', picked: false, key: 'restoreEnvVars' }
        ],
        {
          canPickMany: true,
          placeHolder: 'Select what to restore from this snapshot'
        }
      )

      if (!options || options.length === 0) {
        return // User cancelled
      }

      // Build options object from selections
      const restoreOptions = {
        restoreBranches: options.some(o => o.key === 'restoreBranches'),
        restoreServices: options.some(o => o.key === 'restoreServices'),
        restoreDocker: options.some(o => o.key === 'restoreDocker'),
        restoreEnvVars: options.some(o => o.key === 'restoreEnvVars')
      }

      try {
        const result = await manager.restoreSnapshotSelective(snapshotId, restoreOptions)

        // Build success message
        const messages: string[] = []
        if (result.branchesSwitched > 0) {
          messages.push(`${result.branchesSwitched} branch(es) switched`)
        }
        if (result.servicesStarted > 0) {
          messages.push(`${result.servicesStarted} service(s) started`)
        }
        if (result.containersStarted > 0) {
          messages.push(`${result.containersStarted} container(s) started`)
        }
        if (result.envVarsApplied > 0) {
          messages.push(`${result.envVarsApplied} env var(s) applied`)
        }

        if (messages.length > 0) {
          vscode.window.showInformationMessage(`Snapshot restored: ${messages.join(', ')}`)
        } else {
          vscode.window.showInformationMessage('Snapshot restored (no changes needed)')
        }

        if (result.errors.length > 0) {
          vscode.window.showWarningMessage(`Restored with ${result.errors.length} error(s). Check output for details.`)
        }

        servicesTreeProvider?.refresh()
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to restore snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    } else if (action.action === 'delete') {
      // Confirm deletion
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this snapshot? This action cannot be undone.',
        { modal: true },
        'Delete'
      )

      if (confirm === 'Delete') {
        try {
          await manager.deleteSnapshot(snapshotId)
          vscode.window.showInformationMessage('Snapshot deleted')
          workspaceTreeProvider?.refresh()

          // Notify webview to refresh snapshots list
          panel.postMessage({
            type: 'snapshotDeleted',
            snapshotId
          })
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to delete snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    }
  }

  // Register main command (for command palette)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.snapshotMenu', snapshotMenuCommand)
  )

  // Register context menu command (receives TreeItem, extracts snapshotId)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.restoreSnapshot', async (treeItem: any) => {
      const snapshotId = treeItem?.snapshot?.id || treeItem?.workspaceId
      if (snapshotId) {
        await snapshotMenuCommand(snapshotId)
      }
    })
  )

  // Refresh tree views
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.refreshDashboard', () => {
      dashboardTreeProvider?.refresh()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.refreshServices', () => {
      servicesTreeProvider?.refresh()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.refreshDocker', () => {
      dockerTreeProvider?.refresh()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.refreshEnvironment', () => {
      environmentTreeProvider?.refresh()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.refreshWorkspaces', () => {
      workspaceTreeProvider?.refresh()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.refreshNotes', () => {
      notesTreeProvider?.refresh()
    })
  )

  // Show tab commands
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.showDashboard', () => {
      panel.show('dashboard')
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.showDocker', () => {
      panel.show('docker')
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.showEnvironment', (args?: { profileId?: string; variableId?: string }) => {
      panel.show('env', args)
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.showNotes', () => {
      panel.show('notes')
    })
  )

  // Environment variable context menu commands
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.copyVariable', async (item: EnvironmentTreeItem) => {
      if (item.itemType !== 'variable' || !item.envItem) return

      try {
        const copyText = `${item.envItem.key}=${item.envItem.value}`
        await vscode.env.clipboard.writeText(copyText)
        vscode.window.showInformationMessage(`Copied: ${item.envItem.key}=...`)
      } catch (error) {
        vscode.window.showErrorMessage('Failed to copy to clipboard')
      }
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.editVariable', async (item: EnvironmentTreeItem) => {
      if (item.itemType !== 'variable' || !item.envItem || !item.parentProfileId) return

      // Navigate to Environment tab with both profile and variable selected
      panel.show('env', { profileId: item.parentProfileId, variableId: item.id })
      vscode.window.showInformationMessage(`Editing variable: ${item.envItem.key}`)
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.deleteVariable', async (item: EnvironmentTreeItem) => {
      if (item.itemType !== 'variable' || !item.envItem) return

      const confirmDelete = await vscode.window.showWarningMessage(
        `Delete variable "${item.envItem.key}"?`,
        { modal: true },
        'Delete'
      )

      if (confirmDelete === 'Delete') {
        try {
          await manager.getEnvManager().deleteVariable(item.id)
          environmentTreeProvider?.refresh()
          vscode.window.showInformationMessage(`Deleted variable: ${item.envItem.key}`)
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to delete variable: ${error}`)
        }
      }
    })
  )
}

/**
 * Create and update status bar item
 */
function createStatusBarItem(
  context: vscode.ExtensionContext,
  manager: DevHubManager
) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  )

  statusBarItem.command = 'devhub.openPanel'
  statusBarItem.tooltip = 'Click to open DevHub dashboard'

  // Update status bar periodically
  const updateStatusBar = async () => {
    try {
      const services = await manager.getRunningServices()
      const count = services.length
      statusBarItem.text = `$(server) DevHub: ${count} running`
      statusBarItem.show()
    } catch (error) {
      console.error('Failed to update status bar:', error)
    }
  }

  // Initial update
  updateStatusBar()

  // Update every 5 seconds
  const interval = setInterval(updateStatusBar, 5000)

  context.subscriptions.push(statusBarItem)
  context.subscriptions.push(
    new vscode.Disposable(() => clearInterval(interval))
  )
}
