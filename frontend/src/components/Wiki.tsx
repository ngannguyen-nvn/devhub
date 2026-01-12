import { useEffect, useState } from 'react'
import {
  FileText,
  Plus,
  Save,
  Trash2,
  Search,
  Eye,
  Edit,
  X,
  Tag,
  Folder,
  Link as LinkIcon,
  RefreshCw,
  ChevronRight,
  FileQuestion,
  AlertCircle,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ConfirmDialog from './ConfirmDialog'
import { SkeletonLoader } from './Loading'
import { useWorkspace } from '../contexts/WorkspaceContext'

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
  const { activeWorkspace } = useWorkspace()
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
    if (!activeWorkspace) {
      setNotes([])
      setFilteredNotes([])
      return
    }

    setLoading(true)
    try {
      const response = await axios.get('/api/notes')
      setNotes(response.data.notes || [])
      setFilteredNotes(response.data.notes || [])
    } catch (error: any) {
      console.error('Error fetching notes:', error)
      const errorMessage = error.response?.data?.error || error.message
      if (errorMessage.includes('No active workspace')) {
        toast.error('Please activate a workspace first')
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch metadata
  const fetchMetadata = async () => {
    try {
      const [catRes, tagRes, tmpRes] = await Promise.all([
        axios.get('/api/notes/meta/categories'),
        axios.get('/api/notes/meta/tags'),
        axios.get('/api/notes/meta/templates'),
      ])
      setCategories(catRes.data.categories || [])
      setTags(tagRes.data.tags || [])
      setTemplates(tmpRes.data.templates || [])
    } catch (error) {
      console.error('Error fetching metadata:', error)
    }
  }

  // Fetch links for selected note
  const fetchLinks = async (noteId: string) => {
    try {
      const [linksRes, backlinksRes] = await Promise.all([
        axios.get(`/api/notes/${noteId}/links`),
        axios.get(`/api/notes/${noteId}/backlinks`),
      ])
      setLinks(linksRes.data.links || [])
      setBacklinks(backlinksRes.data.backlinks || [])
    } catch (error) {
      console.error('Error fetching links:', error)
    }
  }

  useEffect(() => {
    fetchNotes()
    fetchMetadata()
  }, [activeWorkspace]) // Refresh when workspace changes

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
      toast.error('Title and content are required')
      return
    }

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await axios.post('/api/notes', {
        title: formData.title,
        content: formData.content,
        category: formData.category || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      })

      setFormData({ title: '', content: '', category: '', tags: '' })
      setEditing(false)
      fetchNotes()
      fetchMetadata()
      toast.success(`Note "${formData.title}" created successfully`)
    } catch (error: any) {
      toast.error(`Failed to create note: ${error.response?.data?.error || error.message}`)
    }
  }

  // Update note
  const handleUpdate = async () => {
    if (!selectedNote) return

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await axios.put(`/api/notes/${selectedNote.id}`, {
        title: formData.title,
        content: formData.content,
        category: formData.category || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      })

      setEditing(false)
      fetchNotes()
      fetchMetadata()
      toast.success(`Note "${formData.title}" updated successfully`)
    } catch (error: any) {
      toast.error(`Failed to update note: ${error.response?.data?.error || error.message}`)
    }
  }

  // Delete note
  const handleDelete = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    setConfirmDialog({
      isOpen: true,
      id: noteId,
      title: note?.title || 'Unknown',
    })
  }

  const confirmDelete = async () => {
    if (!confirmDialog.id) return

    try {
      await axios.delete(`/api/notes/${confirmDialog.id}`)
      setSelectedNote(null)
      fetchNotes()
      fetchMetadata()
      toast.success('Note deleted successfully')
    } catch (error: any) {
      toast.error(`Failed to delete note: ${error.response?.data?.error || error.message}`)
    }
  }

  // Select note
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note)
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category || '',
      tags: note.tags?.join(', ') || '',
    })
    setEditing(false)
    setPreviewing(true)
  }

  // New note
  const handleNewNote = () => {
    setSelectedNote(null)
    setFormData({ title: '', content: '', category: '', tags: '' })
    setEditing(true)
    setPreviewing(false)
  }

  // Use template
  const handleUseTemplate = (template: NoteTemplate) => {
    setFormData({
      title: `New ${template.name}`,
      content: template.content,
      category: template.category || '',
      tags: '',
    })
    setSelectedNote(null)
    setEditing(true)
    setPreviewing(false)
    setShowTemplateModal(false)
  }

  // Render markdown with link handling
  const renderMarkdown = (content: string) => {
    // Replace [[note-name]] with clickable links
    const processedContent = content.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
      const linkedNote = notes.find(n => n.title === title)
      if (linkedNote) {
        return `[${title}](#note-${linkedNote.id})`
      }
      return `[${title}](#missing)`
    })

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, href, children, ...props }) => {
            if (href?.startsWith('#note-')) {
              const noteId = href.replace('#note-', '')
              const note = notes.find(n => n.id === noteId)
              return (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (note) handleSelectNote(note)
                  }}
                  className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-hover))] underline"
                  {...props}
                >
                  {children}
                </a>
              )
            }
            if (href === '#missing') {
              return (
                <span className="text-[hsl(var(--foreground-muted))] line-through" {...props}>
                  {children}
                </span>
              )
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-hover))] underline" {...props}>
                {children}
              </a>
            )
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    )
  }

  return (
    <div className="flex h-screen flex-col p-8">
      {/* No Workspace Warning */}
      {!activeWorkspace && (
        <div className="bg-[hsla(var(--warning),0.1)] border-l-4 border-[hsl(var(--warning))] p-4 rounded-xl mb-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-[hsl(var(--warning))] mr-3" />
            <div>
              <p className="text-sm text-[hsl(var(--warning))]">
                <strong className="font-medium">No active workspace.</strong> Please create or activate a workspace to manage notes.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full rounded-xl overflow-hidden">
        {/* Sidebar - Notes List */}
        <div className="w-80 glass-card border-r border-[hsl(var(--border))] flex flex-col rounded-l-xl">
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[hsl(var(--foreground))]">
                Wiki & Notes
                {activeWorkspace && <span className="text-xs text-[hsl(var(--primary))] ml-2">({activeWorkspace.name})</span>}
              </h2>
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleNewNote}
                className="flex items-center gap-2 px-3 py-2 btn-glow text-[hsl(var(--background))] rounded-xl flex-1"
                data-testid="wiki-new-note-button"
              >
                <Plus className="w-4 h-4" />
              New Note
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-3 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--background-elevated))]"
              title="Templates"
              data-testid="wiki-templates-button"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={fetchNotes}
              className="px-3 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--background-elevated))]"
              title="Refresh"
              data-testid="wiki-refresh-button"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--foreground-muted))]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="input-field w-full pl-10 pr-3 py-2"
              data-testid="wiki-search-input"
            />
          </div>

          {/* Filters */}
          <div className="mt-3 space-y-2">
            {selectedCategory && (
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                <Folder className="w-3 h-3" />
                <span>{selectedCategory}</span>
                <button
                  onClick={() => setSelectedCategory('')}
                  className="ml-auto text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
                  data-testid="wiki-clear-category-filter-button"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {selectedTag && (
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                <Tag className="w-3 h-3" />
                <span>{selectedTag}</span>
                <button
                  onClick={() => setSelectedTag('')}
                  className="ml-auto text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
                  data-testid="wiki-clear-tag-filter-button"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto" data-testid="wiki-notes-list">
          {loading && notes.length === 0 ? (
            <div className="p-3">
              <SkeletonLoader count={5} />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
              <FileText className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--border))]" />
              <p>No notes found</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`p-3 border-b border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--background-elevated))] ${
                  selectedNote?.id === note.id ? 'bg-[hsla(var(--primary),0.08)] border-l-4 border-l-[hsl(var(--primary))]' : ''
                }`}
                data-testid={`wiki-note-item-${note.id}`}
              >
                <h3 className="font-semibold text-[hsl(var(--foreground))]">{note.title}</h3>
                {note.category && (
                  <span className="text-xs text-[hsl(var(--foreground-muted))] flex items-center gap-1 mt-1">
                    <Folder className="w-3 h-3" />
                    {note.category}
                  </span>
                )}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {note.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] text-xs rounded-xl">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Quick Filters */}
        <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--background-elevated))]">
          <div className="text-xs font-semibold mb-2 text-[hsl(var(--foreground))]">Categories</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-2 py-1 text-xs bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--background-elevated))]"
                data-testid={`wiki-category-filter-${cat}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="text-xs font-semibold mb-2 text-[hsl(var(--foreground))]">Tags</div>
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className="px-2 py-1 text-xs bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--background-elevated))]"
                data-testid={`wiki-tag-filter-${tag}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col glass-card rounded-r-xl">
        {selectedNote || editing ? (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background-elevated))] flex justify-between items-center">
              <div className="flex gap-2">
                {!editing && (
                  <>
                    <button
                      onClick={() => {
                        setEditing(true)
                        setPreviewing(false)
                      }}
                      className="flex items-center gap-2 px-3 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
                      data-testid="wiki-edit-button"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedNote!.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-[hsla(var(--danger),0.1)] text-[hsl(var(--danger))] rounded-xl hover:bg-[hsla(var(--danger),0.2)]"
                      data-testid="wiki-delete-button"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
                {editing && (
                  <>
                    <button
                      onClick={selectedNote ? handleUpdate : handleCreate}
                      className="flex items-center gap-2 px-3 py-2 bg-[hsla(var(--success),0.1)] text-[hsl(var(--success))] rounded-xl hover:bg-[hsla(var(--success),0.2)]"
                      data-testid="wiki-save-button"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        if (selectedNote) {
                          setFormData({
                            title: selectedNote.title,
                            content: selectedNote.content,
                            category: selectedNote.category || '',
                            tags: selectedNote.tags?.join(', ') || '',
                          })
                          setPreviewing(true)
                        }
                      }}
                      className="px-3 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--background-elevated))]"
                      data-testid="wiki-cancel-button"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              {editing && (
                <button
                  onClick={() => setPreviewing(!previewing)}
                  className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--background-elevated))]"
                  data-testid="wiki-toggle-preview-button"
                >
                  {previewing ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {previewing ? 'Edit' : 'Preview'}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {editing && (
                <div className={previewing ? 'w-1/2 border-r border-[hsl(var(--border))]' : 'w-full'} data-testid="wiki-editor">
                  <div className="p-4 h-full overflow-y-auto" data-testid="wiki-note-form">
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Note title..."
                      className="input-field w-full text-2xl font-bold mb-4 px-3 py-2"
                      data-testid="wiki-title-input"
                    />
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Category"
                        className="input-field px-3 py-2"
                        data-testid="wiki-category-input"
                      />
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="Tags (comma-separated)"
                        className="input-field px-3 py-2"
                        data-testid="wiki-tags-input"
                      />
                    </div>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Write your note in Markdown... Use [[Note Title]] to link to other notes."
                      className="input-field w-full h-full px-3 py-2 terminal-text text-sm resize-none"
                      style={{ minHeight: 'calc(100vh - 300px)' }}
                      data-testid="wiki-content-input"
                    />
                  </div>
                </div>
              )}

              {(previewing || !editing) && (
                <div className={editing ? 'w-1/2' : 'w-full'} data-testid="wiki-preview">
                  <div className="p-6 h-full overflow-y-auto prose prose-invert max-w-none prose-headings:text-[hsl(var(--foreground))] prose-p:text-[hsl(var(--foreground))] prose-strong:text-[hsl(var(--foreground))] prose-code:text-[hsl(var(--primary))] prose-code:bg-[hsl(var(--background-elevated))] prose-pre:bg-[hsl(var(--background-elevated))] prose-a:text-[hsl(var(--primary))]">
                    <h1 className="text-[hsl(var(--foreground))]">{formData.title || selectedNote?.title}</h1>
                    {(formData.category || selectedNote?.category) && (
                      <div className="flex items-center gap-2 text-sm text-[hsl(var(--foreground-muted))] mb-4">
                        <Folder className="w-4 h-4" />
                        {formData.category || selectedNote?.category}
                      </div>
                    )}
                    {renderMarkdown(formData.content || selectedNote?.content || '')}

                    {/* Links Section */}
                    {(links.length > 0 || backlinks.length > 0) && (
                      <div className="mt-8 pt-8 border-t border-[hsl(var(--border))]">
                        {links.length > 0 && (
                          <div className="mb-4" data-testid="wiki-linked-notes">
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-[hsl(var(--foreground))]">
                              <LinkIcon className="w-4 h-4" />
                              Linked Notes
                            </h3>
                            <ul className="list-none">
                              {links.map(link => (
                                <li key={link.id}>
                                  <button
                                    onClick={() => {
                                      const note = notes.find(n => n.id === link.id)
                                      if (note) handleSelectNote(note)
                                    }}
                                    className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-hover))] flex items-center gap-1"
                                    data-testid={`wiki-linked-note-${link.id}`}
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                    {link.title}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {backlinks.length > 0 && (
                          <div data-testid="wiki-backlinks">
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-[hsl(var(--foreground))]">
                              <LinkIcon className="w-4 h-4" />
                              Backlinks
                            </h3>
                            <ul className="list-none">
                              {backlinks.map(link => (
                                <li key={link.id}>
                                  <button
                                    onClick={() => {
                                      const note = notes.find(n => n.id === link.id)
                                      if (note) handleSelectNote(note)
                                    }}
                                    className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-hover))] flex items-center gap-1"
                                    data-testid={`wiki-backlink-${link.id}`}
                                  >
                                    <ChevronRight className="w-3 h-3" />
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
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[hsl(var(--foreground-muted))]">
            <div className="text-center">
              <FileQuestion className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--border))]" />
              <p>Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" data-testid="wiki-template-modal">
          <div className="glass-card rounded-xl p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-[hsl(var(--foreground))]">Choose a Template</h2>
            <div className="grid gap-3">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className="text-left p-4 border border-[hsl(var(--border))] rounded-xl hover:bg-[hsl(var(--background-elevated))] card-hover"
                  data-testid={`wiki-template-${template.id}`}
                >
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">{template.name}</h3>
                  <p className="text-sm text-[hsl(var(--foreground-muted))]">{template.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTemplateModal(false)}
              className="mt-4 px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--background-elevated))]"
              data-testid="wiki-template-cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Delete Note"
        message={`Are you sure you want to delete note "${confirmDialog.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
      </div>
    </div>
  )
}
