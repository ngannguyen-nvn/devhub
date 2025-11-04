import * as vscode from 'vscode'
import { DevHubManager } from '../extensionHost/devhubManager'

export class ServicesTreeProvider implements vscode.TreeDataProvider<ServiceTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ServiceTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event
  private refreshInterval: NodeJS.Timeout

  constructor(private devhubManager: DevHubManager) {
    // Auto-refresh every 5 seconds
    this.refreshInterval = setInterval(() => this.refresh(), 5000)
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  dispose(): void {
    clearInterval(this.refreshInterval)
    this._onDidChangeTreeData.dispose()
  }

  getTreeItem(element: ServiceTreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: ServiceTreeItem): Promise<ServiceTreeItem[]> {
    if (!element) {
      // Root level - show services grouped by status
      try {
        const workspaceId = this.devhubManager.getActiveWorkspaceId()
        if (!workspaceId) {
          return [new ServiceTreeItem('No active workspace', '', vscode.TreeItemCollapsibleState.None, 'info')]
        }

        const services = await this.devhubManager.getServiceManager().getAllServices(workspaceId)
        const runningServices = this.devhubManager.getServiceManager().getRunningServices()

        if (services.length === 0) {
          return [new ServiceTreeItem('No services found', '', vscode.TreeItemCollapsibleState.None, 'info')]
        }

        // Create tree items for each service
        return services.map(service => {
          const isRunning = runningServices.some(rs => rs.id === service.id)
          const status = isRunning ? 'running' : 'stopped'

          return new ServiceTreeItem(
            service.name,
            service.id,
            vscode.TreeItemCollapsibleState.None,
            status,
            service
          )
        })
      } catch (error) {
        console.error('Error loading services:', error)
        return [new ServiceTreeItem('Error loading services', '', vscode.TreeItemCollapsibleState.None, 'error')]
      }
    }

    return []
  }
}

export class ServiceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly serviceId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly status: 'running' | 'stopped' | 'info' | 'error',
    public readonly service?: any
  ) {
    super(label, collapsibleState)

    // Set icon based on status
    if (status === 'running') {
      this.iconPath = new vscode.ThemeIcon('debug-start', new vscode.ThemeColor('terminal.ansiGreen'))
      this.description = 'Running'
      this.contextValue = 'serviceRunning'
    } else if (status === 'stopped') {
      this.iconPath = new vscode.ThemeIcon('debug-stop', new vscode.ThemeColor('terminal.ansiRed'))
      this.description = 'Stopped'
      this.contextValue = 'serviceStopped'
    } else if (status === 'info') {
      this.iconPath = new vscode.ThemeIcon('info')
      this.contextValue = 'info'
    } else if (status === 'error') {
      this.iconPath = new vscode.ThemeIcon('error')
      this.contextValue = 'error'
    }

    // Add tooltip
    if (service) {
      this.tooltip = new vscode.MarkdownString()
      this.tooltip.appendMarkdown(`**${service.name}**\n\n`)
      this.tooltip.appendMarkdown(`Path: \`${service.repoPath}\`\n\n`)
      this.tooltip.appendMarkdown(`Command: \`${service.command}\`\n\n`)
      if (service.port) {
        this.tooltip.appendMarkdown(`Port: ${service.port}\n\n`)
      }
      this.tooltip.appendMarkdown(`Status: ${status === 'running' ? '🟢 Running' : '🔴 Stopped'}`)
    }

    // Add command to open service details
    if (serviceId) {
      this.command = {
        command: 'devhub.showServiceDetails',
        title: 'Show Service Details',
        arguments: [serviceId]
      }
    }
  }
}
