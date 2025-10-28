import { useEffect, useState } from 'react'
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Download,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ConfirmDialog from './ConfirmDialog'
import { SkeletonLoader } from './Loading'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface EnvProfile {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface EnvVariable {
  id: string
  key: string
  value: string
  profileId: string
  serviceId?: string
  isSecret: boolean
  description?: string
  createdAt: string
  updatedAt: string
}

export default function Environment() {
  const { activeWorkspace } = useWorkspace()
  const [profiles, setProfiles] = useState<EnvProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const [variables, setVariables] = useState<EnvVariable[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddProfileForm, setShowAddProfileForm] = useState(false)
  const [showAddVariableForm, setShowAddVariableForm] = useState(false)
  const [showImportForm, setShowImportForm] = useState(false)
  const [showExportForm, setShowExportForm] = useState(false)
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set())

  // Forms
  const [profileForm, setProfileForm] = useState({ name: '', description: '' })
  const [variableForm, setVariableForm] = useState({
    key: '',
    value: '',
    isSecret: false,
    description: '',
  })
  const [importForm, setImportForm] = useState({ filePath: '' })
  const [exportForm, setExportForm] = useState({ filePath: '' })

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'profile' | 'variable'
    id: string | null
    name: string
  }>({
    isOpen: false,
    type: 'profile',
    id: null,
    name: '',
  })

  // Fetch profiles
  const fetchProfiles = async () => {
    if (!activeWorkspace) {
      setProfiles([])
      return
    }

    try {
      const response = await axios.get('/api/env/profiles')
      setProfiles(response.data.profiles || [])

      // Auto-select first profile if none selected
      if (!selectedProfile && response.data.profiles?.length > 0) {
        setSelectedProfile(response.data.profiles[0].id)
      }
    } catch (error: any) {
      console.error('Error fetching profiles:', error)
      const errorMessage = error.response?.data?.error || error.message
      if (errorMessage.includes('No active workspace')) {
        toast.error('Please activate a workspace first')
      }
    }
  }

  // Fetch variables for selected profile
  const fetchVariables = async (profileId: string) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/env/profiles/${profileId}/variables`)
      setVariables(response.data.variables || [])
    } catch (error) {
      console.error('Error fetching variables:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [activeWorkspace]) // Refresh when workspace changes

  useEffect(() => {
    if (selectedProfile) {
      fetchVariables(selectedProfile)
    } else {
      setVariables([])
    }
  }, [selectedProfile])

  // Profile operations
  const handleAddProfile = async () => {
    if (!profileForm.name.trim()) {
      toast.error('Profile name is required')
      return
    }

    try {
      await axios.post('/api/env/profiles', profileForm)
      setShowAddProfileForm(false)
      setProfileForm({ name: '', description: '' })
      fetchProfiles()
      toast.success(`Profile "${profileForm.name}" created successfully`)
    } catch (error: any) {
      toast.error(`Failed to create profile: ${error.response?.data?.error || error.message}`)
    }
  }

  const handleDeleteProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId)
    setConfirmDialog({
      isOpen: true,
      type: 'profile',
      id: profileId,
      name: profile?.name || 'Unknown',
    })
  }

  const confirmDeleteProfile = async () => {
    if (!confirmDialog.id) return

    try {
      await axios.delete(`/api/env/profiles/${confirmDialog.id}`)
      if (selectedProfile === confirmDialog.id) {
        setSelectedProfile(null)
      }
      fetchProfiles()
      toast.success('Profile deleted successfully')
    } catch (error: any) {
      toast.error(`Failed to delete profile: ${error.response?.data?.error || error.message}`)
    }
  }

  const handleCopyProfile = async (profileId: string) => {
    const name = prompt('Enter name for the new profile:')
    if (!name) return

    try {
      const response = await axios.post(`/api/env/profiles/${profileId}/copy`, { name })
      toast.success(`Profile copied! ${response.data.copiedVariables} variables copied.`)
      fetchProfiles()
    } catch (error: any) {
      toast.error(`Failed to copy profile: ${error.response?.data?.error || error.message}`)
    }
  }

  // Variable operations
  const handleAddVariable = async () => {
    if (!variableForm.key.trim() || !selectedProfile) {
      toast.error('Key and profile are required')
      return
    }

    try {
      await axios.post('/api/env/variables', {
        ...variableForm,
        profileId: selectedProfile,
      })
      setShowAddVariableForm(false)
      setVariableForm({ key: '', value: '', isSecret: false, description: '' })
      fetchVariables(selectedProfile)
      toast.success(`Variable "${variableForm.key}" added successfully`)
    } catch (error: any) {
      toast.error(`Failed to add variable: ${error.response?.data?.error || error.message}`)
    }
  }

  // const handleUpdateVariable = async (variableId: string, updates: Partial<EnvVariable>) => {
  //   try {
  //     await axios.put(`/api/env/variables/${variableId}`, updates)
  //     if (selectedProfile) {
  //       fetchVariables(selectedProfile)
  //     }
  //     toast.success('Variable updated successfully')
  //   } catch (error: any) {
  //     toast.error(`Failed to update variable: ${error.response?.data?.error || error.message}`)
  //   }
  // }

  const handleDeleteVariable = (variableId: string) => {
    const variable = variables.find(v => v.id === variableId)
    setConfirmDialog({
      isOpen: true,
      type: 'variable',
      id: variableId,
      name: variable?.key || 'Unknown',
    })
  }

  const confirmDeleteVariable = async () => {
    if (!confirmDialog.id) return

    try {
      await axios.delete(`/api/env/variables/${confirmDialog.id}`)
      if (selectedProfile) {
        fetchVariables(selectedProfile)
      }
      toast.success('Variable deleted successfully')
    } catch (error: any) {
      toast.error(`Failed to delete variable: ${error.response?.data?.error || error.message}`)
    }
  }

  // File operations
  const handleImport = async () => {
    if (!importForm.filePath.trim() || !selectedProfile) {
      toast.error('File path and profile are required')
      return
    }

    try {
      const response = await axios.post(`/api/env/profiles/${selectedProfile}/import`, {
        filePath: importForm.filePath,
      })
      toast.success(`Imported ${response.data.imported} variables`)
      setShowImportForm(false)
      setImportForm({ filePath: '' })
      fetchVariables(selectedProfile)
    } catch (error: any) {
      toast.error(`Failed to import: ${error.response?.data?.error || error.message}`)
    }
  }

  const handleExport = async () => {
    if (!exportForm.filePath.trim() || !selectedProfile) {
      toast.error('File path and profile are required')
      return
    }

    try {
      const response = await axios.post(`/api/env/profiles/${selectedProfile}/export`, {
        filePath: exportForm.filePath,
      })
      toast.success(`Exported ${response.data.exported} variables`)
      setShowExportForm(false)
      setExportForm({ filePath: '' })
    } catch (error: any) {
      toast.error(`Failed to export: ${error.response?.data?.error || error.message}`)
    }
  }

  const toggleRevealSecret = (variableId: string) => {
    const newRevealed = new Set(revealedSecrets)
    if (newRevealed.has(variableId)) {
      newRevealed.delete(variableId)
    } else {
      newRevealed.add(variableId)
    }
    setRevealedSecrets(newRevealed)
  }

  const maskValue = (value: string) => {
    return '•'.repeat(Math.min(value.length, 20))
  }

  return (
    <div>
      {/* No Workspace Warning */}
      {!activeWorkspace && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm text-yellow-700">
                <strong className="font-medium">No active workspace.</strong> Please create or activate a workspace to manage environment variables.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Environment Variables</h1>
          {activeWorkspace && (
            <p className="text-gray-600 mt-1">
              Managing environment variables in <span className="text-blue-600 font-medium">{activeWorkspace.name}</span>
            </p>
          )}
        </div>
        <button
          onClick={fetchProfiles}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profiles Sidebar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Profiles</h2>
            <button
              onClick={() => setShowAddProfileForm(true)}
              className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              title="Add Profile"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add Profile Form */}
          {showAddProfileForm && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Profile name (e.g., dev, staging)"
                className="w-full px-3 py-2 border rounded mb-2"
              />
              <input
                type="text"
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border rounded mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddProfile}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddProfileForm(false)}
                  className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Profiles List */}
          <div className="space-y-2">
            {profiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No profiles. Create one to get started.
              </div>
            ) : (
              profiles.map(profile => (
                <div
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile.id)}
                  className={`p-3 rounded cursor-pointer border ${
                    selectedProfile === profile.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{profile.name}</h3>
                      {profile.description && (
                        <p className="text-sm text-gray-600">{profile.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyProfile(profile.id)
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Copy Profile"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProfile(profile.id)
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Variables Panel */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          {selectedProfile ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Variables</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImportForm(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button
                    onClick={() => setShowExportForm(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={() => setShowAddVariableForm(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variable
                  </button>
                </div>
              </div>

              {/* Import Form */}
              {showImportForm && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-semibold mb-2">Import from .env file</h3>
                  <input
                    type="text"
                    value={importForm.filePath}
                    onChange={(e) => setImportForm({ filePath: e.target.value })}
                    placeholder="/path/to/.env"
                    className="w-full px-3 py-2 border rounded mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleImport}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Import
                    </button>
                    <button
                      onClick={() => setShowImportForm(false)}
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Export Form */}
              {showExportForm && (
                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded">
                  <h3 className="font-semibold mb-2">Export to .env file</h3>
                  <input
                    type="text"
                    value={exportForm.filePath}
                    onChange={(e) => setExportForm({ filePath: e.target.value })}
                    placeholder="/path/to/.env"
                    className="w-full px-3 py-2 border rounded mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => setShowExportForm(false)}
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Add Variable Form */}
              {showAddVariableForm && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-semibold mb-2">Add New Variable</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={variableForm.key}
                      onChange={(e) => setVariableForm({ ...variableForm, key: e.target.value })}
                      placeholder="KEY (e.g., DATABASE_URL)"
                      className="w-full px-3 py-2 border rounded font-mono"
                    />
                    <input
                      type="text"
                      value={variableForm.value}
                      onChange={(e) => setVariableForm({ ...variableForm, value: e.target.value })}
                      placeholder="Value"
                      className="w-full px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      value={variableForm.description}
                      onChange={(e) => setVariableForm({ ...variableForm, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full px-3 py-2 border rounded"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={variableForm.isSecret}
                        onChange={(e) => setVariableForm({ ...variableForm, isSecret: e.target.checked })}
                      />
                      <Lock className="w-4 h-4" />
                      <span className="text-sm">Mark as secret (encrypted)</span>
                    </label>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddVariable}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddVariableForm(false)}
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Variables List */}
              {loading ? (
                <SkeletonLoader count={3} />
              ) : variables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No variables in this profile. Add one to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {variables.map(variable => (
                    <div
                      key={variable.id}
                      className="p-3 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {variable.isSecret ? (
                              <Lock className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <Unlock className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="font-mono font-semibold">{variable.key}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="text-sm bg-white px-2 py-1 rounded">
                              {variable.isSecret && !revealedSecrets.has(variable.id)
                                ? maskValue(variable.value)
                                : variable.value}
                            </code>
                            {variable.isSecret && (
                              <button
                                onClick={() => toggleRevealSecret(variable.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title={revealedSecrets.has(variable.id) ? 'Hide' : 'Reveal'}
                              >
                                {revealedSecrets.has(variable.id) ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                          {variable.description && (
                            <p className="text-sm text-gray-600 mt-1">{variable.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteVariable(variable.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <Lock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select a profile to view and manage variables</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'profile', id: null, name: '' })}
        onConfirm={confirmDialog.type === 'profile' ? confirmDeleteProfile : confirmDeleteVariable}
        title={`Delete ${confirmDialog.type === 'profile' ? 'Profile' : 'Variable'}`}
        message={
          confirmDialog.type === 'profile'
            ? `Are you sure you want to delete profile "${confirmDialog.name}" and all its variables? This action cannot be undone.`
            : `Are you sure you want to delete variable "${confirmDialog.name}"? This action cannot be undone.`
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
