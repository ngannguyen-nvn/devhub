/**
 * Wiki/Notes Component
 *
 * Features:
 * - Markdown-based notes with live preview
 * - Full-text search
 * - Categories and tags
 * - Note templates
 * - Wiki links [[note-name]]
 * - Backlinks tracking
 */

import { useEffect, useState } from 'react'
import { notesApi } from '../messaging/vscodeApi'
import '../styles/Wiki.css'

interface Note {
  id: string
  title: string
  content: string
  category?: string
  tags?: string[]
  template?: string
  createdAt: string
  updatedAt: string
}

interface NoteTemplate {
  id: string
  name: string
  description: string
  content: string
  category?: string
}

export default function Wiki() {
  const [notes, setNotes] = useState<Note[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [editing, setEditing] = useState(false)
  const [previewing, setPreviewing] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [templates, setTemplates] = useState<NoteTemplate[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [links, setLinks] = useState<Array<{ id: string; title: string }>>([])
  const [backlinks, setBacklinks] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
  })

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    id: string | null
    title: string
  }>({
    isOpen: false,
    id: null,
    title: '',
  })

  // Fetch notes
  const fetchNotes = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await notesApi.getAll()
      setNotes(result.notes || [])
      setFilteredNotes(result.notes || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notes')
      setNotes([])
      setFilteredNotes([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch metadata
  const fetchMetadata = async () => {
    try {
      const [catRes, tagRes, tmpRes] = await Promise.all([
        notesApi.getCategories(),
        notesApi.getTags(),
        notesApi.getTemplates(),
      ])
      setCategories(catRes.categories || [])
      setTags(tagRes.tags || [])
      setTemplates(tmpRes.templates || [])
    } catch (err) {
      console.error('Error fetching metadata:', err)
    }
  }

  // Fetch links for selected note
  const fetchLinks = async (noteId: string) => {
    try {
      const [linksRes, backlinksRes] = await Promise.all([
        notesApi.getLinks(noteId),
        notesApi.getBacklinks(noteId),
      ])
      setLinks(linksRes.links || [])
      setBacklinks(backlinksRes.backlinks || [])
    } catch (err) {
      console.error('Error fetching links:', err)
    }
  }

  useEffect(() => {
    fetchNotes()
    fetchMetadata()

    // Listen for workspace changes
    const handleWorkspaceChanged = () => {
      console.log('[Wiki] Workspace changed, refreshing...')
      fetchNotes()
      fetchMetadata()
      setSelectedNote(null)
      setSearchQuery('')
      setSelectedCategory(null)
      setSelectedTag(null)
    }

    window.addEventListener('workspace-changed', handleWorkspaceChanged)
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChanged)
  }, [])

  useEffect(() => {
    if (selectedNote) {
      fetchLinks(selectedNote.id)
    }
  }, [selectedNote])

  // Filter notes
  useEffect(() => {
    let filtered = notes

    if (selectedCategory) {
      filtered = filtered.filter(n => n.category === selectedCategory)
    }

    if (selectedTag) {
      filtered = filtered.filter(n => n.tags?.includes(selectedTag))
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
      )
    }

    setFilteredNotes(filtered)
  }, [notes, selectedCategory, selectedTag, searchQuery])

  // Create note
  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await notesApi.create({
        title: formData.title,
        content: formData.content,
        category: formData.category || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      })

      setFormData({ title: '', content: '', category: '', tags: '' })
      setEditing(false)
      setError(null)
      await fetchNotes()
      await fetchMetadata()
    } catch (err: any) {
      setError(err.message || 'Failed to create note')
    }
  }

  // Update note
  const handleUpdate = async () => {
    if (!selectedNote || !formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await notesApi.update(selectedNote.id, {
        title: formData.title,
        content: formData.content,
        category: formData.category || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      })

      setEditing(false)
      setPreviewing(true)
      setError(null)
      await fetchNotes()
      await fetchMetadata()
    } catch (err: any) {
      setError(err.message || 'Failed to update note')
    }
  }

  // Delete note
  const handleDelete = async () => {
    if (!confirmDialog.id) return

    try {
      await notesApi.delete(confirmDialog.id)
      setSelectedNote(null)
      setConfirmDialog({ isOpen: false, id: null, title: '' })
      setError(null)
      await fetchNotes()
      await fetchMetadata()
    } catch (err: any) {
      setError(err.message || 'Failed to delete note')
      setConfirmDialog({ isOpen: false, id: null, title: '' })
    }
  }

  // Full-text search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes)
      return
    }

    try {
      const result = await notesApi.search(searchQuery)
      setFilteredNotes(result.notes || [])
    } catch (err: any) {
      setError(err.message || 'Failed to search notes')
    }
  }

  // Apply template
  const handleApplyTemplate = (template: NoteTemplate) => {
    setFormData({
      title: '',
      content: template.content,
      category: template.category || '',
      tags: '',
    })
    setShowTemplateModal(false)
    setEditing(true)
    setError(null)
  }

  // Select note
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note)
    setEditing(false)
    setPreviewing(true)
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category || '',
      tags: note.tags?.join(', ') || '',
    })
  }

  // Start editing
  const startEditing = () => {
    if (selectedNote) {
      setEditing(true)
      setPreviewing(false)
    }
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditing(false)
    setPreviewing(true)
    if (selectedNote) {
      setFormData({
        title: selectedNote.title,
        content: selectedNote.content,
        category: selectedNote.category || '',
        tags: selectedNote.tags?.join(', ') || '',
      })
    } else {
      setFormData({ title: '', content: '', category: '', tags: '' })
    }
    setError(null)
  }

  // Create new note
  const handleNewNote = () => {
    setSelectedNote(null)
    setEditing(true)
    setPreviewing(false)
    setFormData({ title: '', content: '', category: '', tags: '' })
    setError(null)
  }

  // Render markdown preview (simplified)
  const renderMarkdown = (content: string) => {
    // Replace wiki links [[Note Title]] with clickable links
    const withLinks = content.replace(/\[\[(.*?)\]\]/g, (_, title) => {
      const linkedNote = notes.find(n => n.title === title.trim())
      if (linkedNote) {
        return `<a href="#" class="wiki-link" data-note-id="${linkedNote.id}">${title}</a>`
      }
      return `<span class="wiki-link-broken">[[${title}]]</span>`
    })

    // Simple markdown rendering (headers, bold, italic, code)
    const rendered = withLinks
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')

    return rendered
  }

  return (
    <div className="wiki">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="wiki-header">
        <h2>📝 Notes & Wiki</h2>
        <div className="wiki-actions">
          <button className="btn-primary" onClick={handleNewNote}>
            ➕ New Note
          </button>
          <button className="btn-secondary" onClick={() => setShowTemplateModal(true)}>
            📄 Templates
          </button>
          <button className="btn-secondary" onClick={fetchNotes}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="wiki-grid">
        {/* Sidebar */}
        <div className="wiki-sidebar">
          {/* Search */}
          <div className="search-section">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn-primary-small" onClick={handleSearch}>
              🔍
            </button>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Tag</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {tags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {(selectedCategory || selectedTag) && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedCategory('')
                  setSelectedTag('')
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Notes List */}
          <div className="notes-list">
            {loading ? (
              <div className="loading">Loading notes...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="empty-state">
                <p>No notes found</p>
                <button className="btn-link" onClick={handleNewNote}>
                  Create your first note
                </button>
              </div>
            ) : (
              filteredNotes.map(note => (
                <div
                  key={note.id}
                  className={`note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                  onClick={() => handleSelectNote(note)}
                >
                  <h4>{note.title}</h4>
                  {note.category && <span className="note-category">{note.category}</span>}
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <p className="note-date">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="wiki-content">
          {!selectedNote && !editing ? (
            <div className="empty-state">
              <h3>👈 Select a note or create a new one</h3>
            </div>
          ) : editing ? (
            // Edit Form
            <div className="note-editor">
              <div className="editor-header">
                <h3>{selectedNote ? 'Edit Note' : 'New Note'}</h3>
                <div className="editor-actions">
                  <button className="btn-secondary" onClick={cancelEditing}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={selectedNote ? handleUpdate : handleCreate}
                  >
                    💾 Save
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Note title"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Architecture, API, Meeting"
                />
              </div>

              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., backend, urgent, todo"
                />
              </div>

              <div className="form-group">
                <label>Content * (Markdown supported)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="# Heading&#10;&#10;Your content here...&#10;&#10;Use [[Note Title]] for wiki links"
                  rows={20}
                />
              </div>

              {previewing && (
                <div className="markdown-preview">
                  <h4>Preview:</h4>
                  <div
                    className="preview-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.content) }}
                  />
                </div>
              )}

              <button
                className="btn-secondary"
                onClick={() => setPreviewing(!previewing)}
              >
                {previewing ? '👁️ Hide Preview' : '👁️ Show Preview'}
              </button>
            </div>
          ) : (
            // Note View
            <div className="note-view">
              <div className="note-header">
                <div className="note-info">
                  <h2>{selectedNote?.title}</h2>
                  {selectedNote?.category && (
                    <span className="note-category">{selectedNote.category}</span>
                  )}
                  {selectedNote?.tags && selectedNote.tags.length > 0 && (
                    <div className="note-tags">
                      {selectedNote.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="note-actions">
                  <button className="btn-secondary" onClick={startEditing}>
                    ✏️ Edit
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        id: selectedNote!.id,
                        title: selectedNote!.title,
                      })
                    }
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div
                className="note-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote?.content || '') }}
              />

              {/* Links Section */}
              {(links.length > 0 || backlinks.length > 0) && (
                <div className="links-section">
                  {links.length > 0 && (
                    <div className="links-group">
                      <h4>🔗 Links to:</h4>
                      <ul>
                        {links.map(link => (
                          <li key={link.id}>
                            <button
                              className="link-button"
                              onClick={() => {
                                const note = notes.find(n => n.id === link.id)
                                if (note) handleSelectNote(note)
                              }}
                            >
                              {link.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {backlinks.length > 0 && (
                    <div className="links-group">
                      <h4>⬅️ Backlinks:</h4>
                      <ul>
                        {backlinks.map(link => (
                          <li key={link.id}>
                            <button
                              className="link-button"
                              onClick={() => {
                                const note = notes.find(n => n.id === link.id)
                                if (note) handleSelectNote(note)
                              }}
                            >
                              {link.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📄 Note Templates</h3>
            <p>Select a template to start with pre-filled content</p>

            <div className="templates-list">
              {templates.map(template => (
                <div key={template.id} className="template-item">
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                  <button
                    className="btn-primary"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowTemplateModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog({ isOpen: false, id: null, title: '' })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Confirm Delete</h3>
            <p>
              Are you sure you want to delete the note <strong>"{confirmDialog.title}"</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDialog({ isOpen: false, id: null, title: '' })}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
