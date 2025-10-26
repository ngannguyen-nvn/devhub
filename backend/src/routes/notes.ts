import { Router, Request, Response } from 'express'
import { NotesManager } from '../services/notesManager'

const router = Router()
const notesManager = new NotesManager()

/**
 * Get all notes
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { category } = req.query
    const notes = notesManager.getAllNotes(category as string)
    res.json({ success: true, notes })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a specific note
 */
router.get('/:noteId', (req: Request, res: Response) => {
  try {
    const { noteId } = req.params
    const note = notesManager.getNote(noteId)

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' })
    }

    res.json({ success: true, note })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new note
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, content, category, tags, template } = req.body

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'title and content are required' })
    }

    const note = notesManager.createNote({ title, content, category, tags, template })
    res.json({ success: true, note })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a note
 */
router.put('/:noteId', (req: Request, res: Response) => {
  try {
    const { noteId } = req.params
    const { title, content, category, tags } = req.body

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
router.delete('/:noteId', (req: Request, res: Response) => {
  try {
    const { noteId } = req.params
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
 * Search notes
 */
router.get('/search/:query', (req: Request, res: Response) => {
  try {
    const { query } = req.params
    const notes = notesManager.searchNotes(query)
    res.json({ success: true, notes })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get all categories
 */
router.get('/meta/categories', (req: Request, res: Response) => {
  try {
    const categories = notesManager.getCategories()
    res.json({ success: true, categories })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get all tags
 */
router.get('/meta/tags', (req: Request, res: Response) => {
  try {
    const tags = notesManager.getTags()
    res.json({ success: true, tags })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get note templates
 */
router.get('/meta/templates', (req: Request, res: Response) => {
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
router.get('/:noteId/links', (req: Request, res: Response) => {
  try {
    const { noteId } = req.params
    const links = notesManager.getLinkedNotes(noteId)
    res.json({ success: true, links })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get backlinks (notes that link to this note)
 */
router.get('/:noteId/backlinks', (req: Request, res: Response) => {
  try {
    const { noteId } = req.params
    const backlinks = notesManager.getBacklinks(noteId)
    res.json({ success: true, backlinks })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
