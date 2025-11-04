import * as vscode from 'vscode'
import { DevHubManager } from '../extensionHost/devhubManager'

export class EnvironmentTreeProvider implements vscode.TreeDataProvider<EnvironmentTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<EnvironmentTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(private devhubManager: DevHubManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: EnvironmentTreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: EnvironmentTreeItem): Promise<EnvironmentTreeItem[]> {
    if (!element) {
      // Root level - show profiles
      try {
        const workspaceId = this.devhubManager.getActiveWorkspaceId()
        const envManager = this.devhubManager.getEnvManager()
        const profiles = await envManager.getAllProfiles(workspaceId)

        if (profiles.length === 0) {
          return [new EnvironmentTreeItem('No profiles found', '', vscode.TreeItemCollapsibleState.None, 'info')]
        }

        return profiles.map((profile: any) => {
          return new EnvironmentTreeItem(
            profile.name,
            profile.id,
            vscode.TreeItemCollapsibleState.Collapsed,
            'profile',
            profile
          )
        })
      } catch (error) {
        console.error('Error loading environment profiles:', error)
        return [new EnvironmentTreeItem('Error loading profiles', '', vscode.TreeItemCollapsibleState.None, 'error')]
      }
    } else if (element.itemType === 'profile') {
      // Show variables for this profile
      try {
        const envManager = this.devhubManager.getEnvManager()
        const variables = await envManager.getVariables(element.id)

        if (variables.length === 0) {
          return [new EnvironmentTreeItem('No variables', '', vscode.TreeItemCollapsibleState.None, 'info')]
        }

        return variables.map((variable: any) => {
          return new EnvironmentTreeItem(
            variable.key,
            variable.id,
            vscode.TreeItemCollapsibleState.None,
            'variable',
            variable
          )
        })
      } catch (error) {
        console.error('Error loading variables:', error)
        return [new EnvironmentTreeItem('Error loading variables', '', vscode.TreeItemCollapsibleState.None, 'error')]
      }
    }

    return []
  }
}

export class EnvironmentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'profile' | 'variable' | 'info' | 'error',
    public readonly envItem?: any
  ) {
    super(label, collapsibleState)

    if (itemType === 'profile') {
      this.iconPath = new vscode.ThemeIcon('gear')
      this.contextValue = 'envProfile'
      if (envItem) {
        this.tooltip = new vscode.MarkdownString()
        this.tooltip.appendMarkdown(`**${envItem.name}**\n\n`)
        if (envItem.description) {
          this.tooltip.appendMarkdown(`${envItem.description}\n\n`)
        }
        this.tooltip.appendMarkdown(`Created: ${new Date(envItem.createdAt).toLocaleString()}`)
      }
    } else if (itemType === 'variable') {
      const isSecret = envItem && envItem.isSecret
      this.iconPath = new vscode.ThemeIcon(isSecret ? 'lock' : 'key')
      this.contextValue = 'envVariable'
      if (envItem) {
        this.description = isSecret ? '••••••••' : envItem.value
        this.tooltip = new vscode.MarkdownString()
        this.tooltip.appendMarkdown(`**${envItem.key}**\n\n`)
        if (envItem.description) {
          this.tooltip.appendMarkdown(`${envItem.description}\n\n`)
        }
        this.tooltip.appendMarkdown(`Type: ${isSecret ? '🔒 Secret' : 'Variable'}`)
      }
    } else if (itemType === 'info') {
      this.iconPath = new vscode.ThemeIcon('info')
      this.contextValue = 'info'
    } else if (itemType === 'error') {
      this.iconPath = new vscode.ThemeIcon('error')
      this.contextValue = 'error'
    }

    // Add click command to open Environment tab
    if (itemType === 'profile' || itemType === 'variable') {
      this.command = {
        command: 'devhub.showEnvironment',
        title: 'Open Environment',
        arguments: []
      }
    }
  }
}
