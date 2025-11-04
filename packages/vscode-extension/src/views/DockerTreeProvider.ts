import * as vscode from 'vscode'
import { DevHubManager } from '../extensionHost/devhubManager'

export class DockerTreeProvider implements vscode.TreeDataProvider<DockerTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<DockerTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(private devhubManager: DevHubManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: DockerTreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: DockerTreeItem): Promise<DockerTreeItem[]> {
    if (!element) {
      // Root level - show Images and Containers sections
      return [
        new DockerTreeItem('Images', 'images', vscode.TreeItemCollapsibleState.Collapsed, 'section'),
        new DockerTreeItem('Containers', 'containers', vscode.TreeItemCollapsibleState.Collapsed, 'section')
      ]
    } else if (element.itemType === 'section') {
      try {
        if (element.id === 'images') {
          const dockerManager = this.devhubManager.getDockerManager()
          const images = await dockerManager.listImages()

          if (images.length === 0) {
            return [new DockerTreeItem('No images', 'no-images', vscode.TreeItemCollapsibleState.None, 'info')]
          }

          return images.map(image => {
            const tag = image.RepoTags && image.RepoTags[0] ? image.RepoTags[0] : '<none>'
            return new DockerTreeItem(
              tag,
              image.Id,
              vscode.TreeItemCollapsibleState.None,
              'image',
              image
            )
          })
        } else if (element.id === 'containers') {
          const dockerManager = this.devhubManager.getDockerManager()
          const containers = await dockerManager.listContainers(true) // all containers

          if (containers.length === 0) {
            return [new DockerTreeItem('No containers', 'no-containers', vscode.TreeItemCollapsibleState.None, 'info')]
          }

          return containers.map(container => {
            const name = container.Names && container.Names[0] ? container.Names[0].replace(/^\//, '') : container.Id.substring(0, 12)
            const isRunning = container.State === 'running'
            return new DockerTreeItem(
              name,
              container.Id,
              vscode.TreeItemCollapsibleState.None,
              isRunning ? 'containerRunning' : 'containerStopped',
              container
            )
          })
        }
      } catch (error) {
        console.error('Error loading Docker items:', error)
        return [new DockerTreeItem('Error loading Docker', 'error', vscode.TreeItemCollapsibleState.None, 'error')]
      }
    }

    return []
  }
}

export class DockerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'section' | 'image' | 'containerRunning' | 'containerStopped' | 'info' | 'error',
    public readonly dockerItem?: any
  ) {
    super(label, collapsibleState)

    if (itemType === 'section') {
      this.iconPath = new vscode.ThemeIcon('folder')
      this.contextValue = 'dockerSection'
    } else if (itemType === 'image') {
      this.iconPath = new vscode.ThemeIcon('package')
      this.contextValue = 'dockerImage'
      if (dockerItem) {
        const size = dockerItem.Size ? `${(dockerItem.Size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'
        this.description = size
        this.tooltip = new vscode.MarkdownString()
        this.tooltip.appendMarkdown(`**Image ID:** ${dockerItem.Id.substring(0, 12)}\n\n`)
        this.tooltip.appendMarkdown(`**Size:** ${size}\n\n`)
        if (dockerItem.RepoTags) {
          this.tooltip.appendMarkdown(`**Tags:** ${dockerItem.RepoTags.join(', ')}`)
        }
      }
    } else if (itemType === 'containerRunning') {
      this.iconPath = new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('terminal.ansiGreen'))
      this.contextValue = 'dockerContainerRunning'
      this.description = 'Running'
      if (dockerItem) {
        this.tooltip = new vscode.MarkdownString()
        this.tooltip.appendMarkdown(`**Container ID:** ${dockerItem.Id.substring(0, 12)}\n\n`)
        this.tooltip.appendMarkdown(`**Image:** ${dockerItem.Image}\n\n`)
        this.tooltip.appendMarkdown(`**Status:** ${dockerItem.Status}\n\n`)
        this.tooltip.appendMarkdown(`**State:** 🟢 Running`)
      }
    } else if (itemType === 'containerStopped') {
      this.iconPath = new vscode.ThemeIcon('circle-slash')
      this.contextValue = 'dockerContainerStopped'
      this.description = 'Stopped'
      if (dockerItem) {
        this.tooltip = new vscode.MarkdownString()
        this.tooltip.appendMarkdown(`**Container ID:** ${dockerItem.Id.substring(0, 12)}\n\n`)
        this.tooltip.appendMarkdown(`**Image:** ${dockerItem.Image}\n\n`)
        this.tooltip.appendMarkdown(`**Status:** ${dockerItem.Status}\n\n`)
        this.tooltip.appendMarkdown(`**State:** ⚪ Stopped`)
      }
    } else if (itemType === 'info') {
      this.iconPath = new vscode.ThemeIcon('info')
      this.contextValue = 'info'
    } else if (itemType === 'error') {
      this.iconPath = new vscode.ThemeIcon('error')
      this.contextValue = 'error'
    }

    // Add click command to open Docker tab
    if (itemType === 'section' || itemType === 'image' || itemType === 'containerRunning' || itemType === 'containerStopped') {
      this.command = {
        command: 'devhub.showDocker',
        title: 'Open Docker',
        arguments: []
      }
    }
  }
}
