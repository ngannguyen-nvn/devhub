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

  constructor(
    private context: vscode.ExtensionContext,
    private devhubManager: DevHubManager
  ) {
    this.messageHandler = new MessageHandler(devhubManager)
  }

  /**
   * Show the DevHub panel
   * Creates panel if it doesn't exist, reveals if it does
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One)
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
      },
      undefined,
      this.context.subscriptions
    )
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
   */
  postMessage(message: any): void {
    this.panel?.webview.postMessage(message)
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.panel?.dispose()
    this.panel = undefined
  }
}
