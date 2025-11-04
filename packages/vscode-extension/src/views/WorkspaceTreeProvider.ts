import * as vscode from 'vscode'
import { DevHubManager } from '../extensionHost/devhubManager'

export class WorkspaceTreeProvider implements vscode.TreeDataProvider<WorkspaceTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(private devhubManager: DevHubManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: WorkspaceTreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: WorkspaceTreeItem): Promise<WorkspaceTreeItem[]> {
    if (!element) {
      // Root level - show workspaces
      try {
        const workspaces = await this.devhubManager.getWorkspaceManager().getAllWorkspaces()
        const activeWorkspaceId = this.devhubManager.getActiveWorkspaceId()

        if (workspaces.length === 0) {
          return [new WorkspaceTreeItem('No workspaces found', '', vscode.TreeItemCollapsibleState.None, 'info')]
        }

        return workspaces.map(workspace => {
          const isActive = workspace.id === activeWorkspaceId
          return new WorkspaceTreeItem(
            workspace.name,
            workspace.id,
            vscode.TreeItemCollapsibleState.Collapsed,
            isActive ? 'active' : 'inactive',
            workspace
          )
        })
      } catch (error) {
        console.error('Error loading workspaces:', error)
        return [new WorkspaceTreeItem('Error loading workspaces', '', vscode.TreeItemCollapsibleState.None, 'error')]
      }
    } else if (element.workspace) {
      // Show snapshots for this workspace
      try {
        const snapshots = await this.devhubManager.getWorkspaceManager().getWorkspaceSnapshots(element.workspaceId)

        if (snapshots.length === 0) {
          return [new WorkspaceTreeItem('No snapshots', '', vscode.TreeItemCollapsibleState.None, 'info')]
        }

        return snapshots.map(snapshot => {
          return new WorkspaceTreeItem(
            snapshot.name,
            snapshot.id,
            vscode.TreeItemCollapsibleState.None,
            'snapshot',
            undefined,
            snapshot
          )
        })
      } catch (error) {
        console.error('Error loading snapshots:', error)
        return [new WorkspaceTreeItem('Error loading snapshots', '', vscode.TreeItemCollapsibleState.None, 'error')]
      }
    }

    return []
  }
}

export class WorkspaceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly workspaceId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly status: 'active' | 'inactive' | 'snapshot' | 'info' | 'error',
    public readonly workspace?: any,
    public readonly snapshot?: any
  ) {
    super(label, collapsibleState)

    // Set icon and context based on status
    if (status === 'active') {
      this.iconPath = new vscode.ThemeIcon('folder-active', new vscode.ThemeColor('terminal.ansiGreen'))
      this.description = 'Active'
      this.contextValue = 'workspaceActive'
    } else if (status === 'inactive') {
      this.iconPath = new vscode.ThemeIcon('folder')
      this.contextValue = 'workspaceInactive'
    } else if (status === 'snapshot') {
      this.iconPath = new vscode.ThemeIcon('archive')
      this.contextValue = 'snapshot'
    } else if (status === 'info') {
      this.iconPath = new vscode.ThemeIcon('info')
      this.contextValue = 'info'
    } else if (status === 'error') {
      this.iconPath = new vscode.ThemeIcon('error')
      this.contextValue = 'error'
    }

    // Add tooltip
    if (workspace) {
      this.tooltip = new vscode.MarkdownString()
      this.tooltip.appendMarkdown(`**${workspace.name}**\n\n`)
      if (workspace.description) {
        this.tooltip.appendMarkdown(`${workspace.description}\n\n`)
      }
      if (workspace.folderPath) {
        this.tooltip.appendMarkdown(`Path: \`${workspace.folderPath}\`\n\n`)
      }
      this.tooltip.appendMarkdown(`Status: ${status === 'active' ? '🟢 Active' : '⚪ Inactive'}`)
    } else if (snapshot) {
      this.tooltip = new vscode.MarkdownString()
      this.tooltip.appendMarkdown(`**${snapshot.name}**\n\n`)
      if (snapshot.description) {
        this.tooltip.appendMarkdown(`${snapshot.description}\n\n`)
      }
      this.tooltip.appendMarkdown(`Created: ${new Date(snapshot.createdAt).toLocaleString()}`)
    }

    // Add commands
    if (workspace && status !== 'active') {
      this.command = {
        command: 'devhub.activateWorkspace',
        title: 'Activate Workspace',
        arguments: [workspaceId]
      }
    }
    // Snapshots don't have click command - use inline menu button instead
  }
}
