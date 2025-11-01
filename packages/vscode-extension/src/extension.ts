/**
 * DevHub VSCode Extension
 *
 * Entry point for the DevHub extension. This extension provides
 * microservices management, Docker operations, environment variables,
 * and documentation capabilities within VSCode.
 */

import * as vscode from 'vscode'
import { DevHubManager } from './extensionHost/devhubManager'
import { DevHubPanel } from './webview/DevHubPanel'
import { ServicesTreeProvider } from './views/ServicesTreeProvider'
import { WorkspaceTreeProvider } from './views/WorkspaceTreeProvider'

let devhubManager: DevHubManager | undefined
let devhubPanel: DevHubPanel | undefined
let servicesTreeProvider: ServicesTreeProvider | undefined
let workspaceTreeProvider: WorkspaceTreeProvider | undefined

/**
 * Extension activation
 * Called when extension is first activated (on startup)
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('DevHub extension is now active')

  try {
    // Initialize DevHub manager (wraps @devhub/core)
    devhubManager = new DevHubManager(context)
    await devhubManager.initialize()

    // Initialize webview panel manager
    devhubPanel = new DevHubPanel(context, devhubManager)

    // Register tree views
    registerTreeViews(context, devhubManager)

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
function registerTreeViews(
  context: vscode.ExtensionContext,
  manager: DevHubManager
) {
  // Services tree view
  servicesTreeProvider = new ServicesTreeProvider(manager)
  const servicesTreeView = vscode.window.createTreeView('devhubServices', {
    treeDataProvider: servicesTreeProvider,
    showCollapseAll: false,
  })
  context.subscriptions.push(servicesTreeView)

  // Workspace tree view
  workspaceTreeProvider = new WorkspaceTreeProvider(manager)
  const workspaceTreeView = vscode.window.createTreeView('devhubWorkspaces', {
    treeDataProvider: workspaceTreeProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(workspaceTreeView)
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

  // Start service (from command palette or context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.startService', async (serviceId?: string) => {
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
    })
  )

  // Stop service
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.stopService', async (serviceId?: string) => {
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
    })
  )

  // Show service details (from tree view)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.showServiceDetails', async (serviceId: string) => {
      panel.show()
      // TODO: Navigate to service details in webview
    })
  )

  // Activate workspace (from tree view)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.activateWorkspace', async (workspaceId: string) => {
      try {
        await manager.activateWorkspace(workspaceId)
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

  // Restore snapshot (from tree view)
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.restoreSnapshot', async (snapshotId: string) => {
      const confirm = await vscode.window.showWarningMessage(
        'This will restore the snapshot and may affect running services. Continue?',
        'Yes',
        'No'
      )
      if (confirm === 'Yes') {
        try {
          await manager.restoreSnapshot(snapshotId)
          vscode.window.showInformationMessage('Snapshot restored')
          servicesTreeProvider?.refresh()
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to restore snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    })
  )

  // Refresh tree views
  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.refreshServices', () => {
      servicesTreeProvider?.refresh()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devhub.refreshWorkspaces', () => {
      workspaceTreeProvider?.refresh()
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
