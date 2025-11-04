/**
 * Environment Variables Component
 *
 * Features:
 * - Profile management (CRUD with grouping)
 * - Variable management (CRUD with encryption)
 * - Import/export .env files
 * - Sync to service .env files
 * - Secret masking with reveal toggle
 * - Search and filter
 */

import { useState, useEffect } from 'react'
import { envApi, serviceApi } from '../messaging/vscodeApi'
import '../styles/Environment.css'

interface EnvProfile {
  id: string
  name: string
  description?: string
  sourceType?: 'auto-import' | 'snapshot-restore' | 'manual'
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
  const [profiles, setProfiles] = useState<EnvProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const [variables, setVariables] = useState<EnvVariable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forms
  const [showAddProfileForm, setShowAddProfileForm] = useState(false)
  const [showAddVariableForm, setShowAddVariableForm] = useState(false)
  const [showImportForm, setShowImportForm] = useState(false)
  const [showExportForm, setShowExportForm] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)

  const [profileForm, setProfileForm] = useState({ name: '', description: '' })
  const [variableForm, setVariableForm] = useState({
    key: '',
    value: '',
    isSecret: false,
    description: '',
  })
  const [importForm, setImportForm] = useState({ filePath: '' })
  const [exportForm, setExportForm] = useState({ filePath: '' })

  // UI state
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set())
  const [profileSearchTerm, setProfileSearchTerm] = useState('')
  const [variableSearchTerm, setVariableSearchTerm] = useState('')
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null)
  const [editVariableForm, setEditVariableForm] = useState({
    key: '',
    value: '',
    isSecret: false,
    description: '',
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Manual Profiles']))
  const [services, setServices] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)

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
    try {
      const response = await envApi.getProfiles()
      setProfiles(response.profiles || [])

      // Auto-select first profile if none selected
      if (!selectedProfile && response.profiles?.length > 0) {
        setSelectedProfile(response.profiles[0].id)
      }
    } catch (err) {
      console.error('[Environment] Error fetching profiles:', err)
      setError('Failed to fetch profiles')
    }
  }

  // Fetch variables for selected profile
  const fetchVariables = async (profileId: string) => {
    setLoading(true)
    try {
      const response = await envApi.getVariables(profileId)
      setVariables(response.variables || [])
    } catch (err) {
      console.error('[Environment] Error fetching variables:', err)
      setError('Failed to fetch variables')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  // Auto-refresh profiles every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchProfiles, 5000)
    return () => clearInterval(interval)
  }, [])

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
      setError('Profile name is required')
      return
    }

    try {
      await envApi.createProfile(profileForm)
      setShowAddProfileForm(false)
      setProfileForm({ name: '', description: '' })
      fetchProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile')
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
      await envApi.deleteProfile(confirmDialog.id)
      if (selectedProfile === confirmDialog.id) {
        setSelectedProfile(null)
      }
      fetchProfiles()
      setConfirmDialog({ isOpen: false, type: 'profile', id: null, name: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile')
    }
  }

  const handleCopyProfile = async (profileId: string) => {
    const name = prompt('Enter name for the new profile:')
    if (!name) return

    try {
      await envApi.copyProfile(profileId, name)
      fetchProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy profile')
    }
  }

  // Variable operations
  const handleAddVariable = async () => {
    if (!variableForm.key.trim() || !selectedProfile) {
      setError('Key and profile are required')
      return
    }

    try {
      await envApi.createVariable({
        ...variableForm,
        profileId: selectedProfile,
      })
      setShowAddVariableForm(false)
      setVariableForm({ key: '', value: '', isSecret: false, description: '' })
      fetchVariables(selectedProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add variable')
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

  const handleUpdateVariable = async () => {
    if (!editingVariableId || !editVariableForm.key.trim()) {
      setError('Key is required')
      return
    }

    try {
      await envApi.updateVariable(editingVariableId, editVariableForm)
      if (selectedProfile) {
        fetchVariables(selectedProfile)
      }
      setEditingVariableId(null)
      setEditVariableForm({ key: '', value: '', isSecret: false, description: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update variable')
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
      await envApi.deleteVariable(confirmDialog.id)
      if (selectedProfile) {
        fetchVariables(selectedProfile)
      }
      setConfirmDialog({ isOpen: false, type: 'variable', id: null, name: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete variable')
    }
  }

  // File operations
  const handleImport = async () => {
    if (!importForm.filePath.trim() || !selectedProfile) {
      setError('File path and profile are required')
      return
    }

    try {
      const response = await envApi.importFile(selectedProfile, importForm.filePath)
      setShowImportForm(false)
      setImportForm({ filePath: '' })
      fetchVariables(selectedProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import')
    }
  }

  const handleExport = async () => {
    if (!exportForm.filePath.trim() || !selectedProfile) {
      setError('File path and profile are required')
      return
    }

    try {
      await envApi.exportFile(selectedProfile, exportForm.filePath)
      setShowExportForm(false)
      setExportForm({ filePath: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export')
    }
  }

  const fetchServices = async () => {
    try {
      const response = await serviceApi.getAll()
      setServices(response || [])
    } catch (err) {
      console.error('[Environment] Error fetching services:', err)
    }
  }

  const handleOpenSyncModal = () => {
    fetchServices()
    setShowSyncModal(true)
  }

  const handleSyncToService = async (serviceId: string) => {
    if (!selectedProfile) {
      setError('No profile selected')
      return
    }

    setSyncing(true)
    try {
      await envApi.syncToService(selectedProfile, serviceId)
      setShowSyncModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync')
    } finally {
      setSyncing(false)
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

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    if (!profileSearchTerm.trim()) return true
    const search = profileSearchTerm.toLowerCase()
    return (
      profile.name.toLowerCase().includes(search) ||
      (profile.description && profile.description.toLowerCase().includes(search))
    )
  })

  // Group profiles by source
  const groupedProfiles = filteredProfiles.reduce((groups, profile) => {
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

  const sortedGroups = Object.values(groupedProfiles).sort((a, b) => {
    if (a.sourceType === 'manual' && b.sourceType !== 'manual') return -1
    if (a.sourceType !== 'manual' && b.sourceType === 'manual') return 1
    return a.name.localeCompare(b.name)
  })

  // Auto-expand all groups on mount
  useEffect(() => {
    if (sortedGroups.length > 0 && expandedGroups.size === 1 && expandedGroups.has('Manual Profiles')) {
      const allGroupNames = sortedGroups.map(g => g.name)
      setExpandedGroups(new Set(allGroupNames))
    }
  }, [sortedGroups.length])

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName)
    } else {
      newExpanded.add(groupName)
    }
    setExpandedGroups(newExpanded)
  }

  // Filter variables
  const filteredVariables = variables.filter(variable => {
    if (!variableSearchTerm.trim()) return true
    const search = variableSearchTerm.toLowerCase()
    return (
      variable.key.toLowerCase().includes(search) ||
      variable.value.toLowerCase().includes(search) ||
      (variable.description && variable.description.toLowerCase().includes(search))
    )
  })

  return (
    <div className="environment">
      <div className="environment-header">
        <h2>Environment Variables</h2>
        <button className="btn-secondary" onClick={fetchProfiles}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="environment-grid">
        {/* Profiles Sidebar */}
        <div className="profiles-sidebar">
          <div className="sidebar-header">
            <h3>Profiles</h3>
            <button
              className="btn-primary-small"
              onClick={() => setShowAddProfileForm(!showAddProfileForm)}
              title="Add Profile"
            >
              +
            </button>
          </div>

          {/* Profile Search */}
          {profiles.length > 0 && (
            <div className="search-box">
              <input
                type="text"
                value={profileSearchTerm}
                onChange={(e) => setProfileSearchTerm(e.target.value)}
                placeholder="Search profiles..."
              />
            </div>
          )}

          {/* Add Profile Form */}
          {showAddProfileForm && (
            <div className="profile-form">
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Profile name (e.g., dev, staging)"
              />
              <input
                type="text"
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                placeholder="Description (optional)"
              />
              <div className="form-actions">
                <button className="btn-primary" onClick={handleAddProfile}>
                  Add
                </button>
                <button className="btn-secondary" onClick={() => setShowAddProfileForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Profiles List - Hierarchical */}
          <div className="profiles-list">
            {profiles.length === 0 ? (
              <div className="empty-state">No profiles. Create one to get started.</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="empty-state">
                No profiles match your search.
                <button onClick={() => setProfileSearchTerm('')} className="btn-link">
                  Clear search
                </button>
              </div>
            ) : (
              sortedGroups.map(group => {
                const isExpanded = expandedGroups.has(group.name)
                return (
                  <div key={group.name} className="profile-group">
                    <button
                      className="group-header"
                      onClick={() => toggleGroup(group.name)}
                    >
                      <span className="group-icon">{isExpanded ? '▼' : '▶'}</span>
                      <span className="group-name">{group.name}</span>
                      <span className="group-count">({group.profiles.length})</span>
                    </button>

                    {isExpanded && (
                      <div className="group-profiles">
                        {group.profiles.map(profile => (
                          <div
                            key={profile.id}
                            onClick={() => setSelectedProfile(profile.id)}
                            className={`profile-item ${selectedProfile === profile.id ? 'selected' : ''}`}
                          >
                            <div className="profile-info">
                              <h4>{profile.name}</h4>
                              {profile.description && <p>{profile.description}</p>}
                            </div>
                            <div className="profile-actions">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyProfile(profile.id)
                                }}
                                title="Copy Profile"
                              >
                                Copy
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteProfile(profile.id)
                                }}
                                title="Delete Profile"
                              >
                                Delete
                              </button>
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
        <div className="variables-panel">
          {selectedProfile ? (
            <>
              <div className="panel-header">
                <h3>Variables</h3>
                <div className="panel-actions">
                  <button className="btn-success" onClick={() => setShowImportForm(true)}>
                    Import
                  </button>
                  <button className="btn-primary" onClick={() => setShowExportForm(true)}>
                    Export
                  </button>
                  <button className="btn-secondary" onClick={handleOpenSyncModal}>
                    Sync to Service
                  </button>
                  <button className="btn-primary" onClick={() => setShowAddVariableForm(true)}>
                    + Add Variable
                  </button>
                </div>
              </div>

              {/* Variable Search */}
              {variables.length > 0 && (
                <div className="search-box">
                  <input
                    type="text"
                    value={variableSearchTerm}
                    onChange={(e) => setVariableSearchTerm(e.target.value)}
                    placeholder="Search variables by key, value, or description..."
                  />
                  {variableSearchTerm && (
                    <p className="search-results">
                      Found {filteredVariables.length} variable{filteredVariables.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {/* Import Form */}
              {showImportForm && (
                <div className="import-form">
                  <h4>Import from .env file</h4>
                  <input
                    type="text"
                    value={importForm.filePath}
                    onChange={(e) => setImportForm({ filePath: e.target.value })}
                    placeholder="/path/to/.env"
                  />
                  <div className="form-actions">
                    <button className="btn-success" onClick={handleImport}>
                      Import
                    </button>
                    <button className="btn-secondary" onClick={() => setShowImportForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Export Form */}
              {showExportForm && (
                <div className="export-form">
                  <h4>Export to .env file</h4>
                  <input
                    type="text"
                    value={exportForm.filePath}
                    onChange={(e) => setExportForm({ filePath: e.target.value })}
                    placeholder="/path/to/.env"
                  />
                  <div className="form-actions">
                    <button className="btn-primary" onClick={handleExport}>
                      Export
                    </button>
                    <button className="btn-secondary" onClick={() => setShowExportForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Add Variable Form */}
              {showAddVariableForm && (
                <div className="variable-form">
                  <h4>Add New Variable</h4>
                  <input
                    type="text"
                    value={variableForm.key}
                    onChange={(e) => setVariableForm({ ...variableForm, key: e.target.value })}
                    placeholder="KEY"
                  />
                  <input
                    type="text"
                    value={variableForm.value}
                    onChange={(e) => setVariableForm({ ...variableForm, value: e.target.value })}
                    placeholder="value"
                  />
                  <input
                    type="text"
                    value={variableForm.description}
                    onChange={(e) => setVariableForm({ ...variableForm, description: e.target.value })}
                    placeholder="Description (optional)"
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={variableForm.isSecret}
                      onChange={(e) => setVariableForm({ ...variableForm, isSecret: e.target.checked })}
                    />
                    <span>Mark as secret</span>
                  </label>
                  <div className="form-actions">
                    <button className="btn-primary" onClick={handleAddVariable}>
                      Add
                    </button>
                    <button className="btn-secondary" onClick={() => setShowAddVariableForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Variables List */}
              <div className="variables-list">
                {loading ? (
                  <div className="empty-state">Loading variables...</div>
                ) : variables.length === 0 ? (
                  <div className="empty-state">No variables. Click "Add Variable" to create one.</div>
                ) : filteredVariables.length === 0 ? (
                  <div className="empty-state">
                    No variables match your search.
                    <button onClick={() => setVariableSearchTerm('')} className="btn-link">
                      Clear search
                    </button>
                  </div>
                ) : (
                  filteredVariables.map(variable => (
                    <div key={variable.id} className="variable-item">
                      {editingVariableId === variable.id ? (
                        <div className="variable-edit">
                          <input
                            type="text"
                            value={editVariableForm.key}
                            onChange={(e) => setEditVariableForm({ ...editVariableForm, key: e.target.value })}
                            placeholder="KEY"
                          />
                          <input
                            type="text"
                            value={editVariableForm.value}
                            onChange={(e) => setEditVariableForm({ ...editVariableForm, value: e.target.value })}
                            placeholder="value"
                          />
                          <input
                            type="text"
                            value={editVariableForm.description}
                            onChange={(e) => setEditVariableForm({ ...editVariableForm, description: e.target.value })}
                            placeholder="Description (optional)"
                          />
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={editVariableForm.isSecret}
                              onChange={(e) => setEditVariableForm({ ...editVariableForm, isSecret: e.target.checked })}
                            />
                            <span>Mark as secret</span>
                          </label>
                          <div className="form-actions">
                            <button className="btn-success" onClick={handleUpdateVariable}>
                              Save
                            </button>
                            <button className="btn-secondary" onClick={() => setEditingVariableId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="variable-info">
                            <div className="variable-header">
                              <strong>{variable.key}</strong>
                              {variable.isSecret && <span className="secret-badge">🔒 Secret</span>}
                            </div>
                            <div className="variable-value">
                              {variable.isSecret && !revealedSecrets.has(variable.id)
                                ? maskValue(variable.value)
                                : variable.value}
                              {variable.isSecret && (
                                <button
                                  className="btn-link"
                                  onClick={() => toggleRevealSecret(variable.id)}
                                >
                                  {revealedSecrets.has(variable.id) ? 'Hide' : 'Reveal'}
                                </button>
                              )}
                            </div>
                            {variable.description && (
                              <div className="variable-description">{variable.description}</div>
                            )}
                          </div>
                          <div className="variable-actions">
                            <button onClick={() => handleEditVariable(variable)}>Edit</button>
                            <button onClick={() => handleDeleteVariable(variable.id)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">Select a profile to view variables</div>
          )}
        </div>
      </div>

      {/* Sync to Service Modal */}
      {showSyncModal && (
        <div className="modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sync to Service</h3>
            <p>Select a service to sync environment variables to its .env file</p>
            <div className="services-list-modal">
              {services.length === 0 ? (
                <div className="empty-state">No services available</div>
              ) : (
                services.map(service => (
                  <div key={service.id} className="service-item-modal">
                    <div>
                      <strong>{service.name}</strong>
                      <div className="service-path">{service.repoPath}</div>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => handleSyncToService(service.id)}
                      disabled={syncing}
                    >
                      {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSyncModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog({ isOpen: false, type: 'profile', id: null, name: '' })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {confirmDialog.type === 'profile' ? 'Profile' : 'Variable'}</h3>
            <p>
              Are you sure you want to delete {confirmDialog.type === 'profile' ? 'profile' : 'variable'} "{confirmDialog.name}"?
              {confirmDialog.type === 'profile' && ' All variables in this profile will also be deleted.'}
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDialog({ isOpen: false, type: 'profile', id: null, name: '' })}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={confirmDialog.type === 'profile' ? confirmDeleteProfile : confirmDeleteVariable}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
