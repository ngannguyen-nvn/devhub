import { Router, Request, Response } from 'express'
import { NotesManager } from '../services/notesManager'

const router = Router()
const notesManager = new NotesManager()

/**
 * Middleware to get active workspace ID
 * Can be overridden by workspace_id query param
 */
async function getWorkspaceId(req: Request): Promise<string> {
  // Allow explicit workspace_id in query or body
  const explicitWorkspaceId = req.query.workspace_id || req.body?.workspace_id

  if (explicitWorkspaceId && typeof explicitWorkspaceId === 'string') {
    return explicitWorkspaceId
  }

  // Otherwise, use active workspace
  const db = require('../db').default
  const stmt = db.prepare('SELECT id FROM workspaces WHERE active = 1 LIMIT 1')
  const row = stmt.get() as { id: string } | undefined

  if (!row) {
    throw new Error('No active workspace found. Please activate a workspace first.')
  }

  return row.id
}

/**
 * Get all notes for active workspace
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query
    const workspaceId = await getWorkspaceId(req)
    const notes = notesManager.getAllNotes(workspaceId, category as string)
    res.json({ success: true, notes, workspaceId })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a specific note
 */
router.get('/:noteId', async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params
    const note = notesManager.getNote(noteId)

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }

    // Verify note belongs to accessible workspace
    const workspaceId = await getWorkspaceId(req)
    if (note.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Note not found in this workspace' })
    }

    res.json({ success: true, note })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new note in active workspace
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, content, category, tags, template } = req.body

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'title and content are required' })
    }

    const workspaceId = await getWorkspaceId(req)
    const note = notesManager.createNote(workspaceId, { title, content, category, tags, template })
    res.json({ success: true, note })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a note
 */
router.put('/:noteId', async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params
    const { title, content, category, tags } = req.body

    // Verify note belongs to accessible workspace
    const note = notesManager.getNote(noteId)
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (note.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Note not found in this workspace' })
    }

    const updated = notesManager.updateNote(noteId, { title, content, category, tags })

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a note
 */
router.delete('/:noteId', async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params

    // Verify note belongs to accessible workspace
    const note = notesManager.getNote(noteId)
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (note.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Note not found in this workspace' })
    }

    const deleted = notesManager.deleteNote(noteId)

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Search notes (workspace-scoped)
 */
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params
    const workspaceId = await getWorkspaceId(req)

    // Get search results and filter by workspace
    const allResults = notesManager.searchNotes(query)
    const notes = allResults.filter(note => note.workspaceId === workspaceId)

    res.json({ success: true, notes })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get all categories for active workspace
 */
router.get('/meta/categories', async (req: Request, res: Response) => {
  try {
    const workspaceId = await getWorkspaceId(req)

    // Get all notes for this workspace
    const notes = notesManager.getAllNotes(workspaceId)
    const categories = new Set<string>()

    notes.forEach(note => {
      if (note.category) {
        categories.add(note.category)
      }
    })

    res.json({ success: true, categories: Array.from(categories).sort() })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get all tags for active workspace
 */
router.get('/meta/tags', async (req: Request, res: Response) => {
  try {
    const workspaceId = await getWorkspaceId(req)

    // Get all notes for this workspace
    const notes = notesManager.getAllNotes(workspaceId)
    const tags = new Set<string>()

    notes.forEach(note => {
      if (note.tags) {
        note.tags.forEach(tag => tags.add(tag))
      }
    })

    res.json({ success: true, tags: Array.from(tags).sort() })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get note templates (not workspace-scoped, global templates)
 */
router.get('/meta/templates', async (req: Request, res: Response) => {
  try {
    const templates = notesManager.getTemplates()
    res.json({ success: true, templates })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get linked notes (notes that this note links to)
 */
router.get('/:noteId/links', async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params

    // Verify note belongs to accessible workspace
    const note = notesManager.getNote(noteId)
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (note.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Note not found in this workspace' })
    }

    const links = notesManager.getLinkedNotes(noteId)
    res.json({ success: true, links })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get backlinks (notes that link to this note)
 */
router.get('/:noteId/backlinks', async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params

    // Verify note belongs to accessible workspace
    const note = notesManager.getNote(noteId)
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (note.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Note not found in this workspace' })
    }

    const backlinks = notesManager.getBacklinks(noteId)
    res.json({ success: true, backlinks })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
