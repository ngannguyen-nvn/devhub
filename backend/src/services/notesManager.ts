import db from '../db'
import { Note, NoteTemplate } from '@devhub/shared'

export class NotesManager {
  /**
   * Get all notes for a workspace
   */
  getAllNotes(workspaceId: string, category?: string): Note[] {
    let query = 'SELECT * FROM notes WHERE workspace_id = ?'
    const params: any[] = [workspaceId]

    if (category) {
      query += ' AND category = ?'
      params.push(category)
    }

    query += ' ORDER BY updated_at DESC'

    const stmt = db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => this.rowToNote(row))
  }

  /**
   * Get a specific note
   */
  getNote(noteId: string): Note | null {
    const stmt = db.prepare('SELECT * FROM notes WHERE id = ?')
    const row = stmt.get(noteId) as any

    if (!row) return null

    return this.rowToNote(row)
  }

  /**
   * Get note by title
   */
  getNoteByTitle(title: string): Note | null {
    const stmt = db.prepare('SELECT * FROM notes WHERE title = ?')
    const row = stmt.get(title) as any

    if (!row) return null

    return this.rowToNote(row)
  }

  /**
   * Create a new note in a workspace
   */
  createNote(
    workspaceId: string,
    data: {
      title: string
      content: string
      category?: string
      tags?: string[]
      template?: string
    }
  ): Note {
    const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Verify workspace exists
    const workspaceCheck = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(workspaceId)
    if (!workspaceCheck) {
      throw new Error(`Workspace ${workspaceId} not found`)
    }

    const stmt = db.prepare(`
      INSERT INTO notes (id, workspace_id, title, content, category, tags, template)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      workspaceId,
      data.title,
      data.content,
      data.category || null,
      data.tags ? JSON.stringify(data.tags) : null,
      data.template || null
    )

    // Update FTS index
    const insertFts = db.prepare(`
      INSERT INTO notes_fts(rowid, title, content)
      SELECT rowid, title, content FROM notes WHERE id = ?
    `)
    insertFts.run(id)

    return {
      id,
      workspaceId,
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags,
      template: data.template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Update a note
   */
  updateNote(
    noteId: string,
    updates: {
      title?: string
      content?: string
      category?: string
      tags?: string[]
    }
  ): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }
    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(updates.content)
    }
    if (updates.category !== undefined) {
      fields.push('category = ?')
      values.push(updates.category)
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?')
      values.push(JSON.stringify(updates.tags))
    }

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(noteId)

    const stmt = db.prepare(`
      UPDATE notes SET ${fields.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)

    // Update FTS index
    if (result.changes > 0) {
      const updateFts = db.prepare(`
        INSERT INTO notes_fts(notes_fts, rowid, title, content)
        SELECT 'delete', rowid, title, content FROM notes WHERE id = ?
      `)
      updateFts.run(noteId)

      const insertFts = db.prepare(`
        INSERT INTO notes_fts(rowid, title, content)
        SELECT rowid, title, content FROM notes WHERE id = ?
      `)
      insertFts.run(noteId)
    }

    return result.changes > 0
  }

  /**
   * Delete a note
   */
  deleteNote(noteId: string): boolean {
    // Delete from FTS index first
    const deleteFts = db.prepare(`
      INSERT INTO notes_fts(notes_fts, rowid, title, content)
      SELECT 'delete', rowid, title, content FROM notes WHERE id = ?
    `)
    deleteFts.run(noteId)

    const stmt = db.prepare('DELETE FROM notes WHERE id = ?')
    const result = stmt.run(noteId)
    return result.changes > 0
  }

  /**
   * Search notes using full-text search
   */
  searchNotes(query: string): Note[] {
    const stmt = db.prepare(`
      SELECT notes.* FROM notes
      JOIN notes_fts ON notes.rowid = notes_fts.rowid
      WHERE notes_fts MATCH ?
      ORDER BY rank
    `)

    const rows = stmt.all(query) as any[]
    return rows.map(row => this.rowToNote(row))
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const stmt = db.prepare('SELECT DISTINCT category FROM notes WHERE category IS NOT NULL')
    const rows = stmt.all() as any[]
    return rows.map(row => row.category)
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    const stmt = db.prepare('SELECT DISTINCT tags FROM notes WHERE tags IS NOT NULL')
    const rows = stmt.all() as any[]

    const allTags = new Set<string>()
    rows.forEach(row => {
      const tags = JSON.parse(row.tags) as string[]
      tags.forEach(tag => allTags.add(tag))
    })

    return Array.from(allTags).sort()
  }

  /**
   * Find note links in content
   * Parses [[note-name]] syntax
   */
  findLinks(content: string): string[] {
    const linkPattern = /\[\[([^\]]+)\]\]/g
    const links: string[] = []
    let match

    while ((match = linkPattern.exec(content)) !== null) {
      links.push(match[1])
    }

    return links
  }

  /**
   * Get linked notes (notes that this note links to)
   */
  getLinkedNotes(noteId: string): Array<{ id: string; title: string }> {
    const note = this.getNote(noteId)
    if (!note) return []

    const linkTitles = this.findLinks(note.content)
    const linkedNotes: Array<{ id: string; title: string }> = []

    linkTitles.forEach(title => {
      const linkedNote = this.getNoteByTitle(title)
      if (linkedNote) {
        linkedNotes.push({ id: linkedNote.id, title: linkedNote.title })
      }
    })

    return linkedNotes
  }

  /**
   * Get backlinks (notes that link to this note)
   */
  getBacklinks(noteId: string): Array<{ id: string; title: string }> {
    const note = this.getNote(noteId)
    if (!note) return []

    const allNotes = this.getAllNotes()
    const backlinks: Array<{ id: string; title: string }> = []

    allNotes.forEach(otherNote => {
      if (otherNote.id === noteId) return

      const links = this.findLinks(otherNote.content)
      if (links.includes(note.title)) {
        backlinks.push({ id: otherNote.id, title: otherNote.title })
      }
    })

    return backlinks
  }

  /**
   * Get note templates
   */
  getTemplates(): NoteTemplate[] {
    return [
      {
        id: 'architecture',
        name: 'Architecture',
        description: 'System architecture documentation',
        category: 'Architecture',
        content: `# Architecture: [Component Name]

## Overview
Brief description of the component and its purpose.

## Components
- **Component 1**: Description
- **Component 2**: Description

## Data Flow
1. Step 1
2. Step 2
3. Step 3

## Technologies
- Technology 1
- Technology 2

## Diagrams
[Add diagrams here]

## Related
- [[Related Document 1]]
- [[Related Document 2]]
`,
      },
      {
        id: 'api',
        name: 'API Documentation',
        description: 'API endpoint documentation',
        category: 'API',
        content: `# API: [Endpoint Name]

## Endpoint
\`\`\`
METHOD /api/path
\`\`\`

## Description
What this endpoint does.

## Request
### Headers
\`\`\`
Authorization: Bearer <token>
Content-Type: application/json
\`\`\`

### Body
\`\`\`json
{
  "field": "value"
}
\`\`\`

## Response
### Success (200)
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`

### Error (400/500)
\`\`\`json
{
  "success": false,
  "error": "Error message"
}
\`\`\`

## Examples
\`\`\`bash
curl -X METHOD http://localhost:5000/api/path \\
  -H "Authorization: Bearer <token>" \\
  -d '{"field":"value"}'
\`\`\`

## Related
- [[Related API 1]]
- [[Related API 2]]
`,
      },
      {
        id: 'runbook',
        name: 'Runbook',
        description: 'Operational runbook',
        category: 'Operations',
        content: `# Runbook: [Task Name]

## Purpose
What this runbook is for.

## Prerequisites
- Prerequisite 1
- Prerequisite 2

## Steps
### 1. First Step
\`\`\`bash
command here
\`\`\`

### 2. Second Step
\`\`\`bash
command here
\`\`\`

### 3. Third Step
\`\`\`bash
command here
\`\`\`

## Verification
How to verify success:
\`\`\`bash
verification command
\`\`\`

## Rollback
If something goes wrong:
\`\`\`bash
rollback command
\`\`\`

## Related
- [[Related Runbook 1]]
- [[Related Runbook 2]]
`,
      },
      {
        id: 'troubleshooting',
        name: 'Troubleshooting',
        description: 'Troubleshooting guide',
        category: 'Troubleshooting',
        content: `# Troubleshooting: [Issue Name]

## Symptoms
- Symptom 1
- Symptom 2

## Possible Causes
1. **Cause 1**
   - Description
   - How to check: \`command\`

2. **Cause 2**
   - Description
   - How to check: \`command\`

## Solutions

### Solution 1: [Name]
\`\`\`bash
steps to fix
\`\`\`

### Solution 2: [Name]
\`\`\`bash
alternative fix
\`\`\`

## Prevention
How to prevent this issue in the future.

## Related
- [[Related Issue 1]]
- [[Related Issue 2]]
`,
      },
      {
        id: 'meeting',
        name: 'Meeting Notes',
        description: 'Meeting notes template',
        category: 'Meetings',
        content: `# Meeting: [Topic] - [Date]

## Attendees
- Person 1
- Person 2

## Agenda
1. Topic 1
2. Topic 2
3. Topic 3

## Discussion

### Topic 1
Notes here...

### Topic 2
Notes here...

### Topic 3
Notes here...

## Action Items
- [ ] Task 1 - @person
- [ ] Task 2 - @person
- [ ] Task 3 - @person

## Next Steps
1. Step 1
2. Step 2

## Related
- [[Previous Meeting]]
- [[Related Document]]
`,
      },
    ]
  }

  /**
   * Convert database row to Note object
   */
  private rowToNote(row: any): Note {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      content: row.content,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      template: row.template,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
