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
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ConfirmDialog from './ConfirmDialog'
import { SkeletonLoader } from './Loading'

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
    try {
      const response = await axios.get('/api/notes')
      setNotes(response.data.notes || [])
      setFilteredNotes(response.data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
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
                  className="text-blue-600 hover:text-blue-800 underline"
                  {...props}
                >
                  {children}
                </a>
              )
            }
            if (href === '#missing') {
              return (
                <span className="text-gray-400 line-through" {...props}>
                  {children}
                </span>
              )
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline" {...props}>
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
    <div className="flex h-screen">
      {/* Sidebar - Notes List */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleNewNote}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              title="Templates"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={fetchNotes}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-3 py-2 border rounded"
            />
          </div>

          {/* Filters */}
          <div className="mt-3 space-y-2">
            {selectedCategory && (
              <div className="flex items-center gap-2 text-sm">
                <Folder className="w-3 h-3" />
                <span>{selectedCategory}</span>
                <button onClick={() => setSelectedCategory('')} className="ml-auto">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {selectedTag && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-3 h-3" />
                <span>{selectedTag}</span>
                <button onClick={() => setSelectedTag('')} className="ml-auto">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {loading && notes.length === 0 ? (
            <div className="p-3">
              <SkeletonLoader count={5} />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No notes found</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedNote?.id === note.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <h3 className="font-semibold">{note.title}</h3>
                {note.category && (
                  <span className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                    <Folder className="w-3 h-3" />
                    {note.category}
                  </span>
                )}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {note.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-xs rounded">
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
        <div className="p-4 border-t bg-gray-50">
          <div className="text-xs font-semibold mb-2">Categories</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-100"
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="text-xs font-semibold mb-2">Tags</div>
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-100"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedNote || editing ? (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b bg-white flex justify-between items-center">
              <div className="flex gap-2">
                {!editing && (
                  <>
                    <button
                      onClick={() => {
                        setEditing(true)
                        setPreviewing(false)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedNote!.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
                      className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              {editing && (
                <button
                  onClick={() => setPreviewing(!previewing)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  {previewing ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {previewing ? 'Edit' : 'Preview'}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {editing && (
                <div className={previewing ? 'w-1/2 border-r' : 'w-full'}>
                  <div className="p-4 h-full overflow-y-auto">
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Note title..."
                      className="w-full text-2xl font-bold mb-4 px-3 py-2 border rounded"
                    />
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Category"
                        className="px-3 py-2 border rounded"
                      />
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="Tags (comma-separated)"
                        className="px-3 py-2 border rounded"
                      />
                    </div>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Write your note in Markdown... Use [[Note Title]] to link to other notes."
                      className="w-full h-full px-3 py-2 border rounded font-mono text-sm resize-none"
                      style={{ minHeight: 'calc(100vh - 300px)' }}
                    />
                  </div>
                </div>
              )}

              {(previewing || !editing) && (
                <div className={editing ? 'w-1/2' : 'w-full'}>
                  <div className="p-6 h-full overflow-y-auto prose max-w-none">
                    <h1>{formData.title || selectedNote?.title}</h1>
                    {(formData.category || selectedNote?.category) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Folder className="w-4 h-4" />
                        {formData.category || selectedNote?.category}
                      </div>
                    )}
                    {renderMarkdown(formData.content || selectedNote?.content || '')}

                    {/* Links Section */}
                    {(links.length > 0 || backlinks.length > 0) && (
                      <div className="mt-8 pt-8 border-t">
                        {links.length > 0 && (
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
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
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
                          <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
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
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Choose a Template</h2>
            <div className="grid gap-3">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className="text-left p-4 border rounded hover:bg-gray-50"
                >
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTemplateModal(false)}
              className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
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
  )
}
