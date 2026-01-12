import React, { useEffect, useState } from 'react'
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
  Search,
  Edit,
  X,
  Check,
  Zap,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Archive,
  FileText,
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
  sourceType?: 'auto-import' | 'snapshot-restore' | 'manual'
  sourceId?: string
  sourceName?: string
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
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set())
  const [profileSearchTerm, setProfileSearchTerm] = useState('')
  const [variableSearchTerm, setVariableSearchTerm] = useState('')
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')
  const [showAllServices, setShowAllServices] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [knownGroups, setKnownGroups] = useState<Set<string>>(new Set())

  // Forms
  const [profileForm, setProfileForm] = useState({ name: '', description: '' })
  const [variableForm, setVariableForm] = useState({
    key: '',
    value: '',
    isSecret: false,
    description: '',
  })
  const [editVariableForm, setEditVariableForm] = useState({
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

  // Auto-refresh profiles every 5 seconds to pick up changes from snapshot restores
  useEffect(() => {
    if (!activeWorkspace) return

    const interval = setInterval(fetchProfiles, 5000)
    return () => clearInterval(interval)
  }, [activeWorkspace])

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

  const handleEditVariable = (variable: EnvVariable) => {
    setEditingVariableId(variable.id)
    setEditVariableForm({
      key: variable.key,
      value: variable.value,
      isSecret: variable.isSecret,
      description: variable.description || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingVariableId(null)
    setEditVariableForm({ key: '', value: '', isSecret: false, description: '' })
  }

  const handleUpdateVariable = async () => {
    if (!editingVariableId || !editVariableForm.key.trim()) {
      toast.error('Key is required')
      return
    }

    try {
      await axios.put(`/api/env/variables/${editingVariableId}`, editVariableForm)
      if (selectedProfile) {
        fetchVariables(selectedProfile)
      }
      setEditingVariableId(null)
      setEditVariableForm({ key: '', value: '', isSecret: false, description: '' })
      toast.success('Variable updated successfully')
    } catch (error: any) {
      toast.error(`Failed to update variable: ${error.response?.data?.error || error.message}`)
    }
  }

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

  const handleCopyVariable = async (variable: EnvVariable) => {
    try {
      const copyText = `${variable.key}=${variable.value}`
      await navigator.clipboard.writeText(copyText)
      toast.success(`Copied: ${variable.key}=...`)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/services')
      setServices(response.data.services || [])
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to load services')
    }
  }

  const handleOpenSyncModal = () => {
    fetchServices()
    setServiceSearchTerm('')
    setShowAllServices(false)
    setShowSyncModal(true)
  }

  const handleSyncToService = async (serviceId: string) => {
    if (!selectedProfile) {
      toast.error('No profile selected')
      return
    }

    setSyncing(true)
    try {
      const response = await axios.post(`/api/env/profiles/${selectedProfile}/sync-to-service`, {
        serviceId,
      })

      toast.success(`Synced ${response.data.synced} variables to ${response.data.serviceName}`)
      toast.success(`File: ${response.data.filePath}`)
      setShowSyncModal(false)
    } catch (error: any) {
      toast.error(`Failed to sync: ${error.response?.data?.error || error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  // Filter profiles based on search term
  const filteredProfiles = profiles.filter(profile => {
    if (!profileSearchTerm.trim()) return true

    const search = profileSearchTerm.toLowerCase()
    return (
      profile.name.toLowerCase().includes(search) ||
      (profile.description && profile.description.toLowerCase().includes(search))
    )
  })

  // Group profiles by source for hierarchical display
  const groupedProfiles = filteredProfiles.reduce((groups, profile) => {
    // Use sourceName as the group key, or default to source type or "Manual"
    const groupKey = profile.sourceName ||
                     (profile.sourceType === 'auto-import' ? 'Auto-imported' :
                      profile.sourceType === 'snapshot-restore' ? 'Snapshot Restored' :
                      'Manual Profiles')

    if (!groups[groupKey]) {
      groups[groupKey] = {
        name: groupKey,
        sourceType: profile.sourceType || 'manual',
        profiles: []
      }
    }

    groups[groupKey].profiles.push(profile)
    return groups
  }, {} as Record<string, { name: string; sourceType: string; profiles: EnvProfile[] }>)

  // Convert to array and sort (manual first, then by name)
  const sortedGroups = Object.values(groupedProfiles).sort((a, b) => {
    if (a.sourceType === 'manual' && b.sourceType !== 'manual') return -1
    if (a.sourceType !== 'manual' && b.sourceType === 'manual') return 1
    return a.name.localeCompare(b.name)
  })

  // Auto-expand only NEW groups (not manually collapsed ones)
  useEffect(() => {
    if (sortedGroups.length > 0) {
      const allGroupNames = sortedGroups.map(g => g.name)

      // Find groups that are truly new (not in knownGroups)
      const newGroups = allGroupNames.filter(name => !knownGroups.has(name))

      if (newGroups.length > 0) {
        // Add new groups to known groups
        setKnownGroups(prev => new Set([...prev, ...allGroupNames]))

        // Expand all groups (existing expanded + new groups)
        setExpandedGroups(prev => new Set([...prev, ...newGroups]))
      }
    }
  }, [sortedGroups.map(g => g.name).join(',')]) // Stable dependency

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName)
    } else {
      newExpanded.add(groupName)
    }
    setExpandedGroups(newExpanded)
  }

  // Filter variables based on search term
  const filteredVariables = variables.filter(variable => {
    if (!variableSearchTerm.trim()) return true

    const search = variableSearchTerm.toLowerCase()
    return (
      variable.key.toLowerCase().includes(search) ||
      variable.value.toLowerCase().includes(search) ||
      (variable.description && variable.description.toLowerCase().includes(search))
    )
  })

  // Get the selected profile name
  const currentProfile = profiles.find(p => p.id === selectedProfile)
  const currentProfileName = currentProfile?.name.toLowerCase() || ''

  // Find service that matches the profile name
  // Support formats like "Scan - 28/10/2025, 09:00:35 - admin-api" → match "admin-api"
  const matchingService = services.find(s => {
    const serviceName = s.name.toLowerCase()

    // Exact match
    if (serviceName === currentProfileName) return true

    // Profile name ends with " - {service-name}" pattern
    if (currentProfileName.includes(' - ')) {
      const lastPart = currentProfileName.split(' - ').pop() || ''
      if (lastPart === serviceName) return true
    }

    // Profile name contains service name
    if (currentProfileName.includes(serviceName)) return true

    return false
  })

  // Filter services based on search term
  const filteredServices = services.filter(service => {
    if (!serviceSearchTerm.trim()) return true

    const search = serviceSearchTerm.toLowerCase()
    return (
      service.name.toLowerCase().includes(search) ||
      service.repoPath.toLowerCase().includes(search)
    )
  }).sort((a, b) => a.name.localeCompare(b.name))

  // Services to display: matching service only, or all filtered services
  const servicesToShow = (!showAllServices && !serviceSearchTerm && matchingService)
    ? [matchingService]
    : filteredServices

  return (
    <div className="p-8">
      {/* No Workspace Warning */}
      {!activeWorkspace && (
        <div className="bg-[hsla(var(--warning),0.1)] border-l-4 border-[hsl(var(--warning))] p-4 mb-6 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-[hsl(var(--warning))] mr-3" />
            <div>
              <p className="text-sm text-[hsl(var(--warning))]">
                <strong className="font-medium">No active workspace.</strong> Please create or activate a workspace to manage environment variables.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Environment Variables</h1>
          {activeWorkspace && (
            <p className="text-[hsl(var(--foreground-muted))] mt-1">
              Managing environment variables in <span className="text-[hsl(var(--primary))] font-medium">{activeWorkspace.name}</span>
            </p>
          )}
        </div>
        <button
          data-testid="env-refresh-button"
          onClick={fetchProfiles}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--border))]/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profiles Sidebar */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Profiles</h2>
            <button
              data-testid="env-add-profile-button"
              onClick={() => setShowAddProfileForm(true)}
              className="p-2 btn-glow text-[hsl(var(--background))] rounded-xl"
              title="Add Profile"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Search */}
          {profiles.length > 0 && (
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[hsl(var(--foreground-muted))]" size={16} />
                <input
                  type="text"
                  value={profileSearchTerm}
                  onChange={(e) => setProfileSearchTerm(e.target.value)}
                  placeholder="Search profiles..."
                  className="input-field w-full pl-8 pr-3 py-2 text-sm"
                  data-testid="env-profile-search-input"
                />
              </div>
            </div>
          )}

          {/* Add Profile Form */}
          {showAddProfileForm && (
            <div data-testid="env-profile-form" className="mb-4 p-3 bg-[hsl(var(--background-elevated))] rounded-xl border border-[hsl(var(--border))]">
              <input
                data-testid="env-profile-name-input"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Profile name (e.g., dev, staging)"
                className="input-field w-full mb-2"
              />
              <input
                data-testid="env-profile-description-input"
                type="text"
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                placeholder="Description (optional)"
                className="input-field w-full mb-2"
              />
              <div className="flex gap-2">
                <button
                  data-testid="env-create-profile-button"
                  onClick={handleAddProfile}
                  className="px-3 py-1 btn-glow text-[hsl(var(--background))] rounded-xl text-sm"
                >
                  Add
                </button>
                <button
                  data-testid="env-cancel-profile-button"
                  onClick={() => setShowAddProfileForm(false)}
                  className="px-3 py-1 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--border))]/80 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Profiles List - Hierarchical Grouping */}
          <div data-testid="env-profile-list" className="space-y-3">
            {profiles.length === 0 ? (
              <div className="text-center py-8 text-[hsl(var(--foreground-muted))] text-sm">
                No profiles. Create one to get started.
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-[hsl(var(--foreground-muted))] text-sm">
                No profiles match your search.
                <button
                  onClick={() => setProfileSearchTerm('')}
                  className="block mx-auto mt-2 text-[hsl(var(--primary))] hover:underline text-sm"
                >
                  Clear search
                </button>
              </div>
            ) : (
              sortedGroups.map(group => {
                const isExpanded = expandedGroups.has(group.name)
                const groupIcon = group.sourceType === 'auto-import' ? FolderOpen :
                                 group.sourceType === 'snapshot-restore' ? Archive :
                                 FileText

                return (
                  <div key={group.name} className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className="w-full flex items-center justify-between p-3 bg-[hsl(var(--border))]/50 hover:bg-[hsl(var(--border))]/70 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[hsl(var(--foreground-muted))]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[hsl(var(--foreground-muted))]" />
                        )}
                        {React.createElement(groupIcon, { className: "w-4 h-4 text-[hsl(var(--foreground))]" })}
                        <span className="font-semibold text-sm text-[hsl(var(--foreground))]">{group.name}</span>
                        <span className="text-xs text-[hsl(var(--foreground-muted))] ml-1">
                          ({group.profiles.length} profile{group.profiles.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </button>

                    {/* Group Profiles */}
                    {isExpanded && (
                      <div className="divide-y divide-[hsl(var(--border))]">
                        {group.profiles.map(profile => (
                          <div
                            key={profile.id}
                            data-testid={`env-profile-item-${profile.id}`}
                            onClick={() => setSelectedProfile(profile.id)}
                            className={`p-3 cursor-pointer transition-colors ${
                              selectedProfile === profile.id
                                ? 'bg-[hsla(var(--primary),0.08)] border-l-4 border-l-[hsl(var(--primary))]'
                                : 'bg-[hsl(var(--background-elevated))] hover:bg-[hsl(var(--border))]/30'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className={`font-semibold text-sm ${selectedProfile === profile.id ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>
                                  {profile.name}
                                </h3>
                                {profile.description && (
                                  <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">{profile.description}</p>
                                )}
                              </div>
                              <div className="flex gap-1 ml-2">
                                <button
                                  data-testid={`env-copy-profile-button-${profile.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyProfile(profile.id)
                                  }}
                                  className="p-1 text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]/80 hover:bg-[hsla(var(--primary),0.1)] rounded-xl"
                                  title="Copy Profile"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  data-testid={`env-delete-profile-button-${profile.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteProfile(profile.id)
                                  }}
                                  className="p-1 text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))]/80 hover:bg-[hsla(var(--danger),0.1)] rounded-xl"
                                  title="Delete Profile"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Variables Panel */}
        <div className="lg:col-span-2 glass-card rounded-xl p-4">
          {selectedProfile ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Variables</h2>
                <div className="flex gap-2">
                  <button
                    data-testid="env-import-button"
                    onClick={() => setShowImportForm(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:bg-[hsl(var(--success))]/80 text-sm transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button
                    data-testid="env-export-button"
                    onClick={() => setShowExportForm(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-[hsl(var(--info))] text-[hsl(var(--background))] rounded-xl hover:bg-[hsl(var(--info))]/80 text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    data-testid="env-sync-button"
                    onClick={handleOpenSyncModal}
                    className="flex items-center gap-1 px-3 py-2 bg-[hsl(var(--warning))] text-[hsl(var(--background))] rounded-xl hover:bg-[hsl(var(--warning))]/80 text-sm transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Sync to Service
                  </button>
                  <button
                    data-testid="env-add-variable-button"
                    onClick={() => setShowAddVariableForm(true)}
                    className="flex items-center gap-1 px-3 py-2 btn-glow text-[hsl(var(--background))] rounded-xl text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variable
                  </button>
                </div>
              </div>

              {/* Variable Search */}
              {variables.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--foreground-muted))]" size={18} />
                    <input
                      type="text"
                      value={variableSearchTerm}
                      onChange={(e) => setVariableSearchTerm(e.target.value)}
                      placeholder="Search variables by key, value, or description..."
                      className="input-field w-full pl-10 pr-4 py-2"
                      data-testid="env-variable-search-input"
                    />
                  </div>
                  {variableSearchTerm && (
                    <p className="text-sm text-[hsl(var(--foreground-muted))] mt-2">
                      Found {filteredVariables.length} variable{filteredVariables.length !== 1 ? 's' : ''} matching "{variableSearchTerm}"
                    </p>
                  )}
                </div>
              )}

              {/* Import Form */}
              {showImportForm && (
                <div data-testid="env-import-form" className="mb-4 p-4 bg-[hsla(var(--success),0.1)] border border-[hsl(var(--success))]/30 rounded-xl">
                  <h3 className="font-semibold mb-2 text-[hsl(var(--foreground))]">Import from .env file</h3>
                  <input
                    data-testid="env-import-filepath-input"
                    type="text"
                    value={importForm.filePath}
                    onChange={(e) => setImportForm({ filePath: e.target.value })}
                    placeholder="/path/to/.env"
                    className="input-field w-full mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      data-testid="env-submit-import-button"
                      onClick={handleImport}
                      className="px-4 py-2 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:bg-[hsl(var(--success))]/80 transition-colors"
                    >
                      Import
                    </button>
                    <button
                      data-testid="env-cancel-import-button"
                      onClick={() => setShowImportForm(false)}
                      className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--border))]/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Export Form */}
              {showExportForm && (
                <div data-testid="env-export-form" className="mb-4 p-4 bg-[hsla(var(--info),0.1)] border border-[hsl(var(--info))]/30 rounded-xl">
                  <h3 className="font-semibold mb-2 text-[hsl(var(--foreground))]">Export to .env file</h3>
                  <input
                    data-testid="env-export-filepath-input"
                    type="text"
                    value={exportForm.filePath}
                    onChange={(e) => setExportForm({ filePath: e.target.value })}
                    placeholder="/path/to/.env"
                    className="input-field w-full mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      data-testid="env-submit-export-button"
                      onClick={handleExport}
                      className="px-4 py-2 bg-[hsl(var(--info))] text-[hsl(var(--background))] rounded-xl hover:bg-[hsl(var(--info))]/80 transition-colors"
                    >
                      Export
                    </button>
                    <button
                      data-testid="env-cancel-export-button"
                      onClick={() => setShowExportForm(false)}
                      className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--border))]/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Sync to Service Modal */}
              {showSyncModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="glass-card rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" data-testid="env-sync-modal">
                    <h2 className="text-xl font-bold mb-2 text-[hsl(var(--foreground))]">Sync to Service</h2>
                    <p className="text-[hsl(var(--foreground-muted))] mb-4">
                      Select a service to sync this profile's variables to its .env file.
                    </p>

                    {services.length === 0 ? (
                      <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
                        <Zap size={48} className="mx-auto mb-4 text-[hsl(var(--foreground-muted))]" />
                        <p>No services found.</p>
                        <p className="text-sm mt-2">Add services from the Service Manager first.</p>
                      </div>
                    ) : (
                      <>
                        {/* Show matching service notice */}
                        {matchingService && !showAllServices && !serviceSearchTerm && (
                          <div className="mb-4 p-3 bg-[hsla(var(--primary),0.08)] border border-[hsl(var(--primary))]/30 rounded-xl">
                            <p className="text-sm text-[hsl(var(--primary))]">
                              <strong>Recommended:</strong> This profile matches the <strong>{matchingService.name}</strong> service.
                            </p>
                          </div>
                        )}

                        {/* Search Input - only show when showing all services or searching */}
                        {(showAllServices || serviceSearchTerm) && (
                          <div className="mb-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--foreground-muted))]" size={18} />
                              <input
                                type="text"
                                value={serviceSearchTerm}
                                onChange={(e) => setServiceSearchTerm(e.target.value)}
                                placeholder="Search services by name or path..."
                                className="input-field w-full pl-10 pr-4 py-2"
                                data-testid="env-sync-service-search"
                              />
                            </div>
                            {serviceSearchTerm && (
                              <p className="text-sm text-[hsl(var(--foreground-muted))] mt-2">
                                Found {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} matching "{serviceSearchTerm}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Service List */}
                        <div className="flex-1 overflow-y-auto space-y-2 mb-4" data-testid="env-sync-service-list">
                          {servicesToShow.length === 0 ? (
                            <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
                              <p>No services match your search.</p>
                              <button
                                onClick={() => setServiceSearchTerm('')}
                                className="mt-2 text-[hsl(var(--primary))] hover:underline text-sm"
                              >
                                Clear search
                              </button>
                            </div>
                          ) : (
                            servicesToShow.map((service: any) => (
                          <div
                            key={service.id}
                            onClick={() => !syncing && handleSyncToService(service.id)}
                            className={`p-4 border rounded-xl cursor-pointer transition-all ${
                              syncing
                                ? 'opacity-50 cursor-not-allowed'
                                : 'border-[hsl(var(--border))] bg-[hsl(var(--background-elevated))] hover:bg-[hsl(var(--border))]/30 hover:border-[hsl(var(--primary))]'
                            }`}
                            data-testid={`env-sync-service-${service.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-[hsl(var(--foreground))]">{service.name}</h3>
                                  {service.running?.status === 'running' && (
                                    <span className="px-2 py-0.5 bg-[hsla(var(--success),0.1)] text-[hsl(var(--success))] text-xs rounded-full">
                                      Running
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-[hsl(var(--foreground-muted))] truncate">{service.repoPath}</p>
                                <p className="text-xs text-[hsl(var(--primary))] mt-1">→ {service.repoPath}/.env</p>
                              </div>
                              <Zap className="w-5 h-5 text-[hsl(var(--warning))]" />
                            </div>
                          </div>
                            ))
                          )}
                        </div>

                        {/* Show All Services button - only show when there's a matching service */}
                        {matchingService && !showAllServices && !serviceSearchTerm && services.length > 1 && (
                          <div className="mb-4">
                            <button
                              onClick={() => setShowAllServices(true)}
                              className="w-full px-4 py-2 border border-[hsl(var(--border))] rounded-xl hover:bg-[hsl(var(--border))]/30 text-[hsl(var(--foreground))] text-sm transition-colors"
                              data-testid="env-show-all-services-button"
                            >
                              Or choose a different service ({services.length - 1} more)
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowSyncModal(false)}
                        disabled={syncing}
                        className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--border))]/80 disabled:opacity-50 transition-colors"
                        data-testid="env-sync-cancel-button"
                      >
                        {syncing ? 'Syncing...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Variable Form */}
              {showAddVariableForm && (
                <div data-testid="env-variable-form" className="mb-4 p-4 bg-[hsla(var(--primary),0.08)] border border-[hsl(var(--primary))]/30 rounded-xl">
                  <h3 className="font-semibold mb-2 text-[hsl(var(--foreground))]">Add New Variable</h3>
                  <div className="space-y-2">
                    <input
                      data-testid="env-variable-key-input"
                      type="text"
                      value={variableForm.key}
                      onChange={(e) => setVariableForm({ ...variableForm, key: e.target.value })}
                      placeholder="KEY (e.g., DATABASE_URL)"
                      className="input-field w-full terminal-text"
                    />
                    <input
                      data-testid="env-variable-value-input"
                      type="text"
                      value={variableForm.value}
                      onChange={(e) => setVariableForm({ ...variableForm, value: e.target.value })}
                      placeholder="Value"
                      className="input-field w-full"
                    />
                    <input
                      data-testid="env-variable-description-input"
                      type="text"
                      value={variableForm.description}
                      onChange={(e) => setVariableForm({ ...variableForm, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="input-field w-full"
                    />
                    <label className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                      <input
                        data-testid="env-variable-secret-checkbox"
                        type="checkbox"
                        checked={variableForm.isSecret}
                        onChange={(e) => setVariableForm({ ...variableForm, isSecret: e.target.checked })}
                        className="accent-[hsl(var(--primary))]"
                      />
                      <Lock className="w-4 h-4" />
                      <span className="text-sm">Mark as secret (encrypted)</span>
                    </label>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      data-testid="env-create-variable-button"
                      onClick={handleAddVariable}
                      className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
                    >
                      Add
                    </button>
                    <button
                      data-testid="env-cancel-variable-button"
                      onClick={() => setShowAddVariableForm(false)}
                      className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--border))]/80 transition-colors"
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
                <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
                  No variables in this profile. Add one to get started.
                </div>
              ) : filteredVariables.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
                  No variables match your search.
                  <button
                    onClick={() => setVariableSearchTerm('')}
                    className="block mx-auto mt-2 text-[hsl(var(--primary))] hover:underline text-sm"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div data-testid="env-variable-list" className="space-y-2">
                  {filteredVariables.map(variable => (
                    <div
                      key={variable.id}
                      data-testid={`env-variable-item-${variable.id}`}
                      className="p-3 bg-[hsl(var(--background-elevated))] rounded-xl border border-[hsl(var(--border))]"
                    >
                      {editingVariableId === variable.id ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-[hsl(var(--foreground-muted))] mb-1">Key</label>
                            <input
                              data-testid={`env-edit-variable-key-input-${variable.id}`}
                              type="text"
                              value={editVariableForm.key}
                              onChange={(e) => setEditVariableForm({ ...editVariableForm, key: e.target.value })}
                              className="input-field w-full text-sm terminal-text"
                              placeholder="KEY"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[hsl(var(--foreground-muted))] mb-1">Value</label>
                            <input
                              data-testid={`env-edit-variable-value-input-${variable.id}`}
                              type="text"
                              value={editVariableForm.value}
                              onChange={(e) => setEditVariableForm({ ...editVariableForm, value: e.target.value })}
                              className="input-field w-full text-sm"
                              placeholder="Value"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[hsl(var(--foreground-muted))] mb-1">Description (optional)</label>
                            <input
                              data-testid={`env-edit-variable-description-input-${variable.id}`}
                              type="text"
                              value={editVariableForm.description}
                              onChange={(e) => setEditVariableForm({ ...editVariableForm, description: e.target.value })}
                              className="input-field w-full text-sm"
                              placeholder="Description"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                            <input
                              data-testid={`env-edit-variable-secret-checkbox-${variable.id}`}
                              type="checkbox"
                              checked={editVariableForm.isSecret}
                              onChange={(e) => setEditVariableForm({ ...editVariableForm, isSecret: e.target.checked })}
                              className="accent-[hsl(var(--primary))]"
                            />
                            <Lock className="w-4 h-4" />
                            <span className="text-sm">Mark as secret (encrypted)</span>
                          </label>
                          <div className="flex gap-2">
                            <button
                              data-testid={`env-save-variable-button-${variable.id}`}
                              onClick={handleUpdateVariable}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:bg-[hsl(var(--success))]/80 text-sm transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              data-testid={`env-cancel-edit-button-${variable.id}`}
                              onClick={handleCancelEdit}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsl(var(--border))]/80 text-sm transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display Mode
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {variable.isSecret ? (
                                <Lock className="w-4 h-4 text-[hsl(var(--warning))]" />
                              ) : (
                                <Unlock className="w-4 h-4 text-[hsl(var(--foreground-muted))]" />
                              )}
                              <span className="terminal-text font-semibold text-[hsl(var(--foreground))]">{variable.key}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <code className="text-sm bg-[hsl(var(--border))]/50 text-[hsl(var(--foreground))] px-2 py-1 rounded-lg">
                                {variable.isSecret && !revealedSecrets.has(variable.id)
                                  ? maskValue(variable.value)
                                  : variable.value}
                              </code>
                              {variable.isSecret && (
                                <button
                                  data-testid={`env-toggle-secret-button-${variable.id}`}
                                  onClick={() => toggleRevealSecret(variable.id)}
                                  className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]/80"
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
                              <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">{variable.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              data-testid={`env-edit-variable-button-${variable.id}`}
                              onClick={() => handleEditVariable(variable)}
                              className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              data-testid={`env-copy-variable-button-${variable.id}`}
                              onClick={() => handleCopyVariable(variable)}
                              className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]/80"
                              title="Copy KEY=VALUE"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              data-testid={`env-delete-variable-button-${variable.id}`}
                              onClick={() => handleDeleteVariable(variable.id)}
                              className="text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))]/80"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-[hsl(var(--foreground-muted))]">
              <Lock className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--border))]" />
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
