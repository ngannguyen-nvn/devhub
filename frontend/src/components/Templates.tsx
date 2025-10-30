import { useEffect, useState } from 'react'
import { FileText, Search, Sparkles, FolderOpen, Copy, Check } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

interface Template {
  id: string
  name: string
  description?: string
  icon?: string
  language: string
  framework?: string
  defaultCommand: string
  defaultPort?: number
  defaultEnvVars?: Record<string, string>
  isBuiltin: boolean
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [detectPath, setDetectPath] = useState('')
  const [detectedTemplate, setDetectedTemplate] = useState<Template | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/templates')
      setTemplates(response.data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDetect = async () => {
    if (!detectPath) {
      toast.error('Please enter a repository path')
      return
    }

    setDetecting(true)
    try {
      const response = await axios.post('/api/templates/detect', { repoPath: detectPath })

      if (response.data.template) {
        setDetectedTemplate(response.data.template)
        toast.success(`Detected: ${response.data.template.name}`)
      } else {
        setDetectedTemplate(null)
        toast('No matching template found')
      }
    } catch (error) {
      toast.error('Failed to detect template')
    } finally {
      setDetecting(false)
    }
  }

  const handleCopyTemplate = async (template: Template) => {
    const info = `Command: ${template.defaultCommand}${
      template.defaultPort ? `\nPort: ${template.defaultPort}` : ''
    }${
      template.defaultEnvVars
        ? `\nEnv Vars: ${Object.entries(template.defaultEnvVars).map(([k, v]) => `${k}=${v}`).join(', ')}`
        : ''
    }`

    try {
      await navigator.clipboard.writeText(info)
      setCopiedTemplateId(template.id)
      toast.success('Template details copied!')
      setTimeout(() => setCopiedTemplateId(null), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  const languages = [...new Set(templates.map(t => t.language))]

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLanguage = selectedLanguage === 'all' || template.language === selectedLanguage
    return matchesSearch && matchesLanguage
  })

  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      nodejs: 'bg-green-100 text-green-700',
      python: 'bg-blue-100 text-blue-700',
      go: 'bg-cyan-100 text-cyan-700',
      ruby: 'bg-red-100 text-red-700',
      java: 'bg-orange-100 text-orange-700',
      rust: 'bg-yellow-100 text-yellow-700',
      php: 'bg-purple-100 text-purple-700',
      dotnet: 'bg-indigo-100 text-indigo-700',
    }
    return colors[lang] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Service Templates
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Pre-configured templates for common frameworks
        </p>
      </div>

      {/* Auto-Detection Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Auto-Detect Template</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Enter a repository path to automatically detect the best template
        </p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={detectPath}
              onChange={(e) => setDetectPath(e.target.value)}
              placeholder="/home/user/my-project"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {detecting ? 'Detecting...' : 'Detect'}
          </button>
        </div>

        {detectedTemplate && (
          <div className="mt-4 bg-white rounded-lg p-4 border border-blue-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{detectedTemplate.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{detectedTemplate.name}</div>
                <div className="text-sm text-gray-600">{detectedTemplate.description}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getLanguageColor(detectedTemplate.language)}`}>
                {detectedTemplate.language}
              </span>
            </div>
            <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded p-3">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Command:</strong> {detectedTemplate.defaultCommand}</div>
                {detectedTemplate.defaultPort && (
                  <div><strong>Port:</strong> {detectedTemplate.defaultPort}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Languages</option>
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-800">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {template.framework || template.language}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getLanguageColor(template.language)}`}>
                  {template.language}
                </span>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-500 mb-1">Default Command</div>
                  <code className="text-xs text-gray-700">{template.defaultCommand}</code>
                </div>

                {template.defaultPort && (
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500 mb-1">Default Port</div>
                    <code className="text-xs text-gray-700">{template.defaultPort}</code>
                  </div>
                )}

                {template.defaultEnvVars && Object.keys(template.defaultEnvVars).length > 0 && (
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500 mb-1">Environment Variables</div>
                    <div className="text-xs text-gray-700">
                      {Object.entries(template.defaultEnvVars).slice(0, 2).map(([key, value]) => (
                        <div key={key}>{key}={value}</div>
                      ))}
                      {Object.keys(template.defaultEnvVars).length > 2 && (
                        <div className="text-gray-400">+{Object.keys(template.defaultEnvVars).length - 2} more</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {template.isBuiltin && (
                <div className="mt-3 text-xs text-blue-600 font-medium">
                  Built-in Template
                </div>
              )}

              <button
                onClick={() => handleCopyTemplate(template)}
                className="mt-4 w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
              >
                {copiedTemplateId === template.id ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Details
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total Templates: {templates.length}</span>
          <span>Built-in: {templates.filter(t => t.isBuiltin).length}</span>
          <span>Languages: {languages.length}</span>
        </div>
      </div>
    </div>
  )
}
