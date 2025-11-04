import * as vscode from 'vscode'
import { DevHubManager } from '../extensionHost/devhubManager'

export class DashboardTreeProvider implements vscode.TreeDataProvider<DashboardTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<DashboardTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(private devhubManager: DevHubManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: DashboardTreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: DashboardTreeItem): Promise<DashboardTreeItem[]> {
    if (!element) {
      // Root level - show scan folders or repositories
      try {
        // For now, show a placeholder - we could add scan path configuration
        return [
          new DashboardTreeItem(
            'Scan for Repositories',
            'scan',
            vscode.TreeItemCollapsibleState.None,
            'action'
          )
        ]
      } catch (error) {
        console.error('Error loading dashboard:', error)
        return [new DashboardTreeItem('Error loading dashboard', 'error', vscode.TreeItemCollapsibleState.None, 'error')]
      }
    }

    return []
  }
}

export class DashboardTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'action' | 'repository' | 'error'
  ) {
    super(label, collapsibleState)

    if (itemType === 'action') {
      this.iconPath = new vscode.ThemeIcon('search')
      this.contextValue = 'scanAction'
      this.command = {
        command: 'devhub.showDashboard',
        title: 'Open Dashboard',
        arguments: []
      }
    } else if (itemType === 'repository') {
      this.iconPath = new vscode.ThemeIcon('repo')
      this.contextValue = 'repository'
    } else if (itemType === 'error') {
      this.iconPath = new vscode.ThemeIcon('error')
      this.contextValue = 'error'
    }
  }
}
