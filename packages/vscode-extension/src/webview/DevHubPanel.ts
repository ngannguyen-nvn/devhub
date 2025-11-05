/**
 * DevHub Panel
 *
 * Manages the webview panel that displays the DevHub React UI.
 * Handles message passing between webview and extension host.
 */

import * as vscode from 'vscode'
import { DevHubManager } from '../extensionHost/devhubManager'
import { MessageHandler } from './messageHandler'

export class DevHubPanel {
  private panel: vscode.WebviewPanel | undefined
  private messageHandler: MessageHandler
  private pendingMessages: any[] = []
  private isWebviewReady = false
  private onRefreshWorkspacesTree?: () => void

  constructor(
    private context: vscode.ExtensionContext,
    private devhubManager: DevHubManager
  ) {
    this.messageHandler = new MessageHandler(devhubManager)
  }

  /**
   * Set callback for refreshing workspaces tree view
   */
  setRefreshWorkspacesTreeCallback(callback: () => void): void {
    this.onRefreshWorkspacesTree = callback
  }

  /**
   * Show the DevHub panel
   * Creates panel if it doesn't exist, reveals if it does
   * Optionally navigates to a specific tab
   */
  show(tab?: string, data?: any): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One)
      // Navigate to tab if specified
      if (tab) {
        this.postMessage({
          type: 'navigate',
          payload: { tab, ...data }
        })
      }
      return
    }

    // Create new webview panel
    this.panel = vscode.window.createWebviewPanel(
      'devhub',
      'DevHub Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview-ui')
        ]
      }
    )

    // Set HTML content
    this.panel.webview.html = this.getWebviewContent()

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        // Webview signals it's ready to receive messages
        if (message.type === 'webview-ready') {
          this.isWebviewReady = true
          // Send any pending messages
          this.pendingMessages.forEach(msg => {
            this.panel?.webview.postMessage(msg)
          })
          this.pendingMessages = []
          return
        }

        // Handle refresh workspaces tree request
        if (message.type === 'refreshWorkspacesTree') {
          console.log('[DevHubPanel] Received refreshWorkspacesTree message')
          if (this.onRefreshWorkspacesTree) {
            console.log('[DevHubPanel] Calling refresh callback')
            this.onRefreshWorkspacesTree()
          } else {
            console.log('[DevHubPanel] No refresh callback set')
          }
          return
        }

        // Handle open terminal request (needs VSCode terminal API)
        if (message.type === 'services.openTerminal') {
          try {
            const workspaceId = this.devhubManager.getActiveWorkspaceId()
            const service = this.devhubManager.getServiceManager()
              .getAllServices(workspaceId)
              .find(s => s.id === message.payload.id)

            if (!service) {
              throw new Error('Service not found')
            }

            // Create a new terminal in VSCode
            const terminal = vscode.window.createTerminal({
              name: `DevHub: ${service.name}`,
              cwd: service.repoPath
            })

            // Show the terminal
            terminal.show()

            // Send the command to the terminal
            terminal.sendText(service.command)

            // Send success response to webview
            this.panel?.webview.postMessage({
              id: message.id,
              type: 'response',
              response: { success: true }
            })
          } catch (error) {
            console.error('[DevHubPanel] Error opening terminal:', error)
            this.panel?.webview.postMessage({
              id: message.id,
              type: 'error',
              error: error instanceof Error ? error.message : 'Failed to open terminal'
            })
          }
          return
        }

        try {
          const response = await this.messageHandler.handleMessage(message)
          this.panel?.webview.postMessage({
            id: message.id,
            type: 'response',
            response
          })
        } catch (error) {
          console.error('[DevHubPanel] Error handling message:', error)
          this.panel?.webview.postMessage({
            id: message.id,
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      },
      undefined,
      this.context.subscriptions
    )

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined
        this.isWebviewReady = false
        this.pendingMessages = []
      },
      undefined,
      this.context.subscriptions
    )

    // Navigate to tab if specified
    if (tab) {
      this.postMessage({
        type: 'navigate',
        payload: { tab }
      })
    }
  }

  /**
   * Generate HTML content for webview
   * Loads the built React app from dist/webview-ui
   */
  private getWebviewContent(): string {
    if (!this.panel) {
      throw new Error('Panel not initialized')
    }

    const webview = this.panel.webview

    // Get URIs for the built React app
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview-ui', 'assets', 'index.js')
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview-ui', 'assets', 'index.css')
    )

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src ${webview.cspSource};">
  <title>DevHub Dashboard</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`
  }

  /**
   * Send message to webview
   * Queues messages if webview is not ready yet
   */
  postMessage(message: any): void {
    if (!this.panel) {
      return
    }

    if (this.isWebviewReady) {
      this.panel.webview.postMessage(message)
    } else {
      // Queue message to send when webview is ready
      this.pendingMessages.push(message)
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.panel?.dispose()
    this.panel = undefined
  }
}
