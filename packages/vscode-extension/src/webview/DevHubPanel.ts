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
          vscode.Uri.joinPath(this.context.extensionUri, 'webview-ui', 'dist')
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
          console.error('Error handling message:', error)
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
   * In development, this would point to Vite dev server
   * In production, it loads the built React app
   */
  private getWebviewContent(): string {
    if (!this.panel) {
      throw new Error('Panel not initialized')
    }

    // For now, return a simple HTML page
    // In Phase 3, we'll build the actual React app
    const webview = this.panel.webview

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
  <title>DevHub Dashboard</title>
  <style>
    body {
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    h1 {
      color: var(--vscode-foreground);
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .placeholder {
      padding: 40px;
      text-align: center;
      border: 2px dashed var(--vscode-panel-border);
      border-radius: 8px;
      margin-top: 40px;
    }
    .button {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px;
    }
    .button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    #services-list {
      margin-top: 20px;
    }
    .service-item {
      padding: 10px;
      margin: 5px 0;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 DevHub Dashboard</h1>
    <p>Welcome to DevHub for VSCode!</p>

    <div class="placeholder">
      <h2>Phase 1: Extension Scaffold ✅</h2>
      <p>Extension is running and webview is active!</p>
      <p>Click the buttons below to test core integration:</p>

      <button class="button" onclick="testGetServices()">Get Services</button>
      <button class="button" onclick="testScanRepos()">Scan Repos</button>
      <button class="button" onclick="testCreateService()">Create Test Service</button>

      <div id="services-list"></div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let messageId = 0;
    const pendingMessages = new Map();

    // Send message to extension
    function sendMessage(type, payload) {
      return new Promise((resolve, reject) => {
        const id = ++messageId;
        pendingMessages.set(id, { resolve, reject });
        vscode.postMessage({ id, type, payload });
      });
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      const pending = pendingMessages.get(message.id);

      if (pending) {
        pendingMessages.delete(message.id);
        if (message.type === 'error') {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.response);
        }
      }
    });

    // Test functions
    async function testGetServices() {
      try {
        const services = await sendMessage('services.getAll');
        const list = document.getElementById('services-list');
        list.innerHTML = '<h3>Services:</h3>' +
          services.map(s => \`
            <div class="service-item">
              <strong>\${s.name}</strong><br>
              Path: \${s.repo_path}<br>
              Command: \${s.command}
            </div>
          \`).join('');
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }

    async function testScanRepos() {
      try {
        const repos = await sendMessage('repos.scan');
        alert(\`Found \${repos.length} repositories\`);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }

    async function testCreateService() {
      try {
        const service = await sendMessage('services.create', {
          name: 'Test Service',
          repoPath: '/tmp/test',
          command: 'echo "Hello from DevHub"'
        });
        alert('Service created: ' + service.name);
        testGetServices();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
  </script>
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
