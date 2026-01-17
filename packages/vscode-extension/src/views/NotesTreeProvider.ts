import * as vscode from 'vscode'
import { DevHubManager } from '../extensionHost/devhubManager'

export class NotesTreeProvider implements vscode.TreeDataProvider<NotesTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<NotesTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(private devhubManager: DevHubManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: NotesTreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: NotesTreeItem): Promise<NotesTreeItem[]> {
    if (!element) {
      // Root level - show categories or all notes
      try {
        const workspaceId = this.devhubManager.getActiveWorkspaceId()
        const notesManager = this.devhubManager.getNotesManager()
        const notes = await notesManager.getAllNotes(workspaceId)

        if (notes.length === 0) {
          return [new NotesTreeItem('No notes found', '', vscode.TreeItemCollapsibleState.None, 'info')]
        }

        // Group notes by category
        const categoriesMap = new Map<string, any[]>()
        notes.forEach(note => {
          const category = note.category || 'Uncategorized'
          if (!categoriesMap.has(category)) {
            categoriesMap.set(category, [])
          }
          categoriesMap.get(category)!.push(note)
        })

        const items: NotesTreeItem[] = []
        categoriesMap.forEach((categoryNotes, category) => {
          items.push(new NotesTreeItem(
            `${category} (${categoryNotes.length})`,
            `category-${category}`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'category',
            { category, notes: categoryNotes }
          ))
        })

        return items
      } catch (error) {
        console.error('Error loading notes:', error)
        return [new NotesTreeItem('Error loading notes', '', vscode.TreeItemCollapsibleState.None, 'error')]
      }
    } else if (element.itemType === 'category' && element.noteItem) {
      // Show notes in this category
      const notes = element.noteItem.notes
      return notes.map((note: any) => {
        return new NotesTreeItem(
          note.title,
          note.id,
          vscode.TreeItemCollapsibleState.None,
          'note',
          note
        )
      })
    }

    return []
  }
}

export class NotesTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'category' | 'note' | 'info' | 'error',
    public readonly noteItem?: any
  ) {
    super(label, collapsibleState)

    if (itemType === 'category') {
      this.iconPath = new vscode.ThemeIcon('folder')
      this.contextValue = 'noteCategory'
    } else if (itemType === 'note') {
      this.iconPath = new vscode.ThemeIcon('note')
      this.contextValue = 'note'
      if (noteItem) {
        this.tooltip = new vscode.MarkdownString()
        this.tooltip.appendMarkdown(`**${noteItem.title}**\n\n`)
        if (noteItem.category) {
          this.tooltip.appendMarkdown(`Category: ${noteItem.category}\n\n`)
        }
        if (noteItem.tags && noteItem.tags.length > 0) {
          this.tooltip.appendMarkdown(`Tags: ${noteItem.tags.join(', ')}\n\n`)
        }
        this.tooltip.appendMarkdown(`Created: ${new Date(noteItem.createdAt).toLocaleString()}`)
      }
    } else if (itemType === 'info') {
      this.iconPath = new vscode.ThemeIcon('info')
      this.contextValue = 'info'
    } else if (itemType === 'error') {
      this.iconPath = new vscode.ThemeIcon('error')
      this.contextValue = 'error'
    }

    // Add click command to open Notes tab
    if (itemType === 'category' || itemType === 'note') {
      this.command = {
        command: 'devhub.showNotes',
        title: 'Open Notes',
        arguments: []
      }
    }
  }
}
