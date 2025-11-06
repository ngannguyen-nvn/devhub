/**
 * Workspaces Component
 *
 * Features:
 * - 3-level navigation (Workspace List → Workspace Detail → Snapshot Detail)
 * - Workspace CRUD operations
 * - Snapshot CRUD operations
 * - Quick snapshot creation
 * - Snapshot restore with optional .env sync
 * - Export snapshot config
 * - Activate workspace
 */

import { useState, useEffect } from 'react'
import { workspaceApi, vscode } from '../messaging/vscodeApi'
import '../styles/Workspaces.css'

interface Workspace {
  id: string
  name: string
  description?: string
  folderPath?: string
  active: number
  tags?: string[]
  createdAt: string
  updatedAt: string
}

interface WorkspaceSnapshot {
  id: string
  name: string
  description?: string
  workspaceId: string
  config: any
  createdAt: string
  updatedAt: string
}

type ViewLevel = 'workspace-list' | 'workspace-detail' | 'snapshot-detail'

export default function Workspaces() {
  // Navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>('workspace-list')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)

  // Data state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<WorkspaceSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forms
  const [showCreateWorkspaceForm, setShowCreateWorkspaceForm] = useState(false)
  const [showCreateSnapshotForm, setShowCreateSnapshotForm] = useState(false)
  const [showQuickSnapshotDialog, setShowQuickSnapshotDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)

  const [createWorkspaceForm, setCreateWorkspaceForm] = useState({
    name: '',
    description: '',
    folderPath: '',
    tags: '',
  })

  const [createSnapshotForm, setCreateSnapshotForm] = useState({
    name: '',
    description: '',
    repoPaths: '',
    tags: '',
    autoImportEnv: false,
  })

  const [quickSnapshotOptions, setQuickSnapshotOptions] = useState({
    autoImportEnv: false,
  })

  const [restoreOptions, setRestoreOptions] = useState({
    applyEnvToFiles: false,
  })

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'delete-workspace' | 'delete-snapshot'
    id: string | null
    name: string
  }>({
    isOpen: false,
    type: 'delete-workspace',
    id: null,
    name: '',
  })

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    setLoading(true)
    try {
      const response = await workspaceApi.getAll()
      // Backend returns array directly, not { workspaces: [] }
      const workspacesArray = Array.isArray(response) ? response : []
      setWorkspaces(workspacesArray)
    } catch (err) {
      console.error('[Workspaces] Error fetching workspaces:', err)
      setError('Failed to fetch workspaces')
    } finally {
      setLoading(false)
    }
  }

  // Fetch snapshots for a workspace
  const fetchSnapshots = async (workspaceId: string) => {
    setLoading(true)
    try {
      const response = await workspaceApi.getSnapshots(workspaceId)
      // Backend returns array directly, not { snapshots: [] }
      setSnapshots(Array.isArray(response) ? response : [])
    } catch (err) {
      console.error('[Workspaces] Error fetching snapshots:', err)
      setError('Failed to fetch snapshots')
    } finally {
      setLoading(false)
    }
  }

  // Fetch snapshot details
  const fetchSnapshotDetails = async (snapshotId: string) => {
    setLoading(true)
    try {
      const response = await workspaceApi.getSnapshot(snapshotId)
      setSelectedSnapshot(response.snapshot)
    } catch (err) {
      console.error('[Workspaces] Error fetching snapshot details:', err)
      setError('Failed to fetch snapshot details')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (viewLevel === 'workspace-list') {
      fetchWorkspaces()
    } else if (viewLevel === 'workspace-detail' && selectedWorkspaceId) {
      fetchSnapshots(selectedWorkspaceId)
    } else if (viewLevel === 'snapshot-detail' && selectedSnapshotId) {
      fetchSnapshotDetails(selectedSnapshotId)
    }
  }, [viewLevel, selectedWorkspaceId, selectedSnapshotId])

  // Listen for messages from extension (e.g., snapshot deleted from tree view)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'snapshotDeleted') {
        // Refresh snapshots list if we're viewing snapshots
        if (viewLevel === 'workspace-detail' && selectedWorkspaceId) {
          fetchSnapshots(selectedWorkspaceId)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [viewLevel, selectedWorkspaceId])

  // Navigation handlers
  const handleWorkspaceClick = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId)
    setViewLevel('workspace-detail')
  }

  const handleSnapshotClick = (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId)
    setViewLevel('snapshot-detail')
  }

  const handleBackToWorkspaces = () => {
    setSelectedWorkspaceId(null)
    setSnapshots([])
    setViewLevel('workspace-list')
  }

  const handleBackToSnapshots = () => {
    setSelectedSnapshotId(null)
    setSelectedSnapshot(null)
    setViewLevel('workspace-detail')
  }

  // Create workspace
  const handleCreateWorkspace = async () => {
    if (!createWorkspaceForm.name.trim()) {
      setError('Workspace name is required')
      return
    }

    try {
      const tags = createWorkspaceForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await workspaceApi.create({
        name: createWorkspaceForm.name,
        description: createWorkspaceForm.description || undefined,
        folderPath: createWorkspaceForm.folderPath || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      setShowCreateWorkspaceForm(false)
      setCreateWorkspaceForm({ name: '', description: '', folderPath: '', tags: '' })
      fetchWorkspaces()

      // Notify other components about workspace change
      window.dispatchEvent(new CustomEvent('workspace-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    }
  }

  // Activate workspace
  const handleActivateWorkspace = async (workspaceId: string) => {
    try {
      await workspaceApi.setActive(workspaceId)
      fetchWorkspaces()

      // Notify other components (like WorkspaceSwitcher) about workspace change
      window.dispatchEvent(new CustomEvent('workspace-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate workspace')
    }
  }

  // Delete workspace
  const handleDeleteWorkspace = (workspaceId: string, workspaceName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete-workspace',
      id: workspaceId,
      name: workspaceName,
    })
  }

  const confirmDeleteWorkspace = async () => {
    if (!confirmDialog.id) return

    try {
      await workspaceApi.delete(confirmDialog.id)
      if (selectedWorkspaceId === confirmDialog.id) {
        handleBackToWorkspaces()
      }
      fetchWorkspaces()
      setConfirmDialog({ isOpen: false, type: 'delete-workspace', id: null, name: '' })

      // Notify other components about workspace change
      window.dispatchEvent(new CustomEvent('workspace-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace')
    }
  }

  // Quick snapshot
  const handleQuickSnapshot = () => {
    setShowQuickSnapshotDialog(true)
  }

  const confirmQuickSnapshot = async () => {
    setLoading(true)
    setError(null)
    try {
      await workspaceApi.createQuickSnapshot()

      if (selectedWorkspaceId) {
        await fetchSnapshots(selectedWorkspaceId)
      }

      setShowQuickSnapshotDialog(false)
      setQuickSnapshotOptions({ autoImportEnv: false })

      // Refresh workspaces tree view
      vscode.postMessage({ type: 'refreshWorkspacesTree' })
    } catch (err) {
      console.error('[Workspaces] Error creating quick snapshot:', err)
      setError(err instanceof Error ? err.message : 'Failed to create snapshot')
    } finally {
      setLoading(false)
    }
  }

  // Create snapshot
  const handleCreateSnapshot = async () => {
    if (!selectedWorkspaceId) {
      setError('No workspace selected')
      return
    }

    if (!createSnapshotForm.name.trim()) {
      setError('Snapshot name is required')
      return
    }

    if (!createSnapshotForm.repoPaths.trim()) {
      setError('At least one repository path is required')
      return
    }

    try {
      const repoPaths = createSnapshotForm.repoPaths
        .split(',')
        .map(p => p.trim())
        .filter(p => p)

      const tags = createSnapshotForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await workspaceApi.createSnapshot({
        workspaceId: selectedWorkspaceId,
        name: createSnapshotForm.name,
        description: createSnapshotForm.description || undefined,
        repoPaths,
        tags: tags.length > 0 ? tags : undefined,
        autoImportEnv: createSnapshotForm.autoImportEnv,
      })

      setShowCreateSnapshotForm(false)
      setCreateSnapshotForm({ name: '', description: '', repoPaths: '', tags: '', autoImportEnv: false })
      await fetchSnapshots(selectedWorkspaceId)

      // Refresh workspaces tree view
      vscode.postMessage({ type: 'refreshWorkspacesTree' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create snapshot')
    }
  }

  // Restore snapshot
  const handleRestoreSnapshot = (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId)
    setShowRestoreDialog(true)
  }

  const confirmRestore = async () => {
    if (!selectedSnapshotId) return

    try {
      await workspaceApi.restoreSnapshot(selectedSnapshotId, restoreOptions)
      setShowRestoreDialog(false)
      setRestoreOptions({ applyEnvToFiles: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore snapshot')
    }
  }

  // Delete snapshot
  const handleDeleteSnapshot = (snapshotId: string, snapshotName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete-snapshot',
      id: snapshotId,
      name: snapshotName,
    })
  }

  const confirmDeleteSnapshot = async () => {
    if (!confirmDialog.id) return

    try {
      await workspaceApi.deleteSnapshot(confirmDialog.id)
      if (selectedWorkspaceId) {
        fetchSnapshots(selectedWorkspaceId)
      }
      setConfirmDialog({ isOpen: false, type: 'delete-snapshot', id: null, name: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete snapshot')
    }
  }

  // Export snapshot
  const handleExportSnapshot = async (snapshotId: string) => {
    try {
      const response = await workspaceApi.exportSnapshot(snapshotId)
      const blob = new Blob([JSON.stringify(response.config, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `snapshot-${snapshotId}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export snapshot')
    }
  }

  // Render breadcrumb navigation
  const renderBreadcrumb = () => {
    const items = []

    items.push(
      <button
        key="workspaces"
        className={`breadcrumb-item ${viewLevel === 'workspace-list' ? 'active' : ''}`}
        onClick={handleBackToWorkspaces}
      >
        Workspaces
      </button>
    )

    if (viewLevel !== 'workspace-list' && selectedWorkspaceId) {
      const workspace = workspaces.find(w => w.id === selectedWorkspaceId)
      items.push(<span key="sep1" className="breadcrumb-sep">→</span>)
      items.push(
        <button
          key="workspace-detail"
          className={`breadcrumb-item ${viewLevel === 'workspace-detail' ? 'active' : ''}`}
          onClick={handleBackToSnapshots}
        >
          {workspace?.name || 'Loading...'}
        </button>
      )
    }

    if (viewLevel === 'snapshot-detail' && selectedSnapshot) {
      items.push(<span key="sep2" className="breadcrumb-sep">→</span>)
      items.push(
        <span key="snapshot-detail" className="breadcrumb-item active">
          {selectedSnapshot.name}
        </span>
      )
    }

    return <div className="breadcrumb">{items}</div>
  }

  return (
    <div className="workspaces">
      <div className="workspaces-header">
        <div>
          <h2>Workspaces & Snapshots</h2>
          {renderBreadcrumb()}
        </div>
        <button className="btn-secondary" onClick={() => {
          if (viewLevel === 'workspace-list') fetchWorkspaces()
          else if (viewLevel === 'workspace-detail' && selectedWorkspaceId) fetchSnapshots(selectedWorkspaceId)
          else if (viewLevel === 'snapshot-detail' && selectedSnapshotId) fetchSnapshotDetails(selectedSnapshotId)
        }}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Workspace List View */}
      {viewLevel === 'workspace-list' && (
        <div className="workspace-list-view">
          <div className="view-header">
            <h3>All Workspaces</h3>
            <button className="btn-primary" onClick={() => setShowCreateWorkspaceForm(true)}>
              + Create Workspace
            </button>
          </div>

          {/* Create Workspace Form */}
          {showCreateWorkspaceForm && (
            <div className="workspace-form">
              <h4>Create New Workspace</h4>
              <input
                type="text"
                value={createWorkspaceForm.name}
                onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, name: e.target.value })}
                placeholder="Workspace name"
              />
              <input
                type="text"
                value={createWorkspaceForm.description}
                onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, description: e.target.value })}
                placeholder="Description (optional)"
              />
              <input
                type="text"
                value={createWorkspaceForm.folderPath}
                onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, folderPath: e.target.value })}
                placeholder="Folder path (optional)"
              />
              <input
                type="text"
                value={createWorkspaceForm.tags}
                onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, tags: e.target.value })}
                placeholder="Tags (comma-separated, optional)"
              />
              <div className="form-actions">
                <button className="btn-primary" onClick={handleCreateWorkspace}>
                  Create
                </button>
                <button className="btn-secondary" onClick={() => setShowCreateWorkspaceForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Workspaces Grid */}
          <div className="workspaces-grid">
            {loading ? (
              <div className="empty-state">Loading workspaces...</div>
            ) : workspaces.length === 0 ? (
              <div className="empty-state">No workspaces. Create one to get started.</div>
            ) : (
              workspaces.map(workspace => (
                <div
                  key={workspace.id}
                  className={`workspace-card ${workspace.active ? 'active' : ''}`}
                  onClick={() => handleWorkspaceClick(workspace.id)}
                >
                  <div className="workspace-header">
                    <h4>{workspace.name}</h4>
                    {workspace.active === 1 && <span className="active-badge">Active</span>}
                  </div>
                  {workspace.description && <p className="workspace-description">{workspace.description}</p>}
                  {workspace.folderPath && <div className="workspace-path">{workspace.folderPath}</div>}
                  <div className="workspace-card-actions">
                    {workspace.active !== 1 && (
                      <button
                        className="btn-success btn-small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivateWorkspace(workspace.id)
                        }}
                      >
                        Activate
                      </button>
                    )}
                    <button
                      className="btn-danger btn-small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWorkspace(workspace.id, workspace.name)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Workspace Detail View (Snapshots) */}
      {viewLevel === 'workspace-detail' && selectedWorkspaceId && (
        <div className="workspace-detail-view">
          <div className="view-header">
            <h3>Snapshots</h3>
            <div className="header-actions">
              <button className="btn-success" onClick={handleQuickSnapshot}>
                ⚡ Quick Snapshot
              </button>
              <button className="btn-primary" onClick={() => setShowCreateSnapshotForm(true)}>
                + New Snapshot
              </button>
            </div>
          </div>

          {/* Create Snapshot Form */}
          {showCreateSnapshotForm && (
            <div className="snapshot-form">
              <h4>Create New Snapshot</h4>
              <input
                type="text"
                value={createSnapshotForm.name}
                onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, name: e.target.value })}
                placeholder="Snapshot name"
              />
              <input
                type="text"
                value={createSnapshotForm.description}
                onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, description: e.target.value })}
                placeholder="Description (optional)"
              />
              <textarea
                value={createSnapshotForm.repoPaths}
                onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, repoPaths: e.target.value })}
                placeholder="Repository paths (comma-separated)"
                rows={3}
              />
              <input
                type="text"
                value={createSnapshotForm.tags}
                onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, tags: e.target.value })}
                placeholder="Tags (comma-separated, optional)"
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={createSnapshotForm.autoImportEnv}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, autoImportEnv: e.target.checked })}
                />
                <span>Auto-import .env files</span>
              </label>
              <div className="form-actions">
                <button className="btn-primary" onClick={handleCreateSnapshot}>
                  Create
                </button>
                <button className="btn-secondary" onClick={() => setShowCreateSnapshotForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Snapshots List */}
          <div className="snapshots-list">
            {loading ? (
              <div className="empty-state">Loading snapshots...</div>
            ) : snapshots.length === 0 ? (
              <div className="empty-state">No snapshots. Create one to capture current state.</div>
            ) : (
              snapshots.map(snapshot => (
                <div
                  key={snapshot.id}
                  className="snapshot-card"
                  onClick={() => handleSnapshotClick(snapshot.id)}
                >
                  <div className="snapshot-header">
                    <h4>{snapshot.name}</h4>
                    <span className="snapshot-date">
                      {new Date(snapshot.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {snapshot.description && <p className="snapshot-description">{snapshot.description}</p>}
                  <div className="snapshot-card-actions">
                    <button
                      className="btn-success btn-small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestoreSnapshot(snapshot.id)
                      }}
                    >
                      Restore
                    </button>
                    <button
                      className="btn-secondary btn-small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExportSnapshot(snapshot.id)
                      }}
                    >
                      Export
                    </button>
                    <button
                      className="btn-danger btn-small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSnapshot(snapshot.id, snapshot.name)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Snapshot Detail View */}
      {viewLevel === 'snapshot-detail' && selectedSnapshot && (
        <div className="snapshot-detail-view">
          <div className="view-header">
            <h3>Snapshot Details</h3>
            <div className="header-actions">
              <button className="btn-success" onClick={() => handleRestoreSnapshot(selectedSnapshot.id)}>
                Restore
              </button>
              <button className="btn-primary" onClick={() => handleExportSnapshot(selectedSnapshot.id)}>
                Export
              </button>
            </div>
          </div>

          <div className="snapshot-details">
            <div className="detail-section">
              <h4>Information</h4>
              <div className="detail-row">
                <span className="label">Name:</span>
                <span className="value">{selectedSnapshot.name}</span>
              </div>
              {selectedSnapshot.description && (
                <div className="detail-row">
                  <span className="label">Description:</span>
                  <span className="value">{selectedSnapshot.description}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="label">Created:</span>
                <span className="value">{new Date(selectedSnapshot.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="detail-section">
              <h4>Configuration</h4>
              <pre className="config-json">
                {JSON.stringify(selectedSnapshot.config, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Quick Snapshot Dialog */}
      {showQuickSnapshotDialog && (
        <div className="modal-overlay" onClick={() => setShowQuickSnapshotDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Quick Snapshot</h3>
            <p>Capture current workspace state quickly</p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={quickSnapshotOptions.autoImportEnv}
                onChange={(e) => setQuickSnapshotOptions({ autoImportEnv: e.target.checked })}
              />
              <span>Auto-import .env files</span>
            </label>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowQuickSnapshotDialog(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={confirmQuickSnapshot}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Dialog */}
      {showRestoreDialog && (
        <div className="modal-overlay" onClick={() => setShowRestoreDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Restore Snapshot</h3>
            <p>Restore workspace to this snapshot's state</p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={restoreOptions.applyEnvToFiles}
                onChange={(e) => setRestoreOptions({ applyEnvToFiles: e.target.checked })}
              />
              <span>Sync environment variables to .env files</span>
            </label>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowRestoreDialog(false)}>
                Cancel
              </button>
              <button className="btn-success" onClick={confirmRestore}>
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog({ isOpen: false, type: 'delete-workspace', id: null, name: '' })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {confirmDialog.type === 'delete-workspace' ? 'Workspace' : 'Snapshot'}</h3>
            <p>
              Are you sure you want to delete {confirmDialog.type === 'delete-workspace' ? 'workspace' : 'snapshot'} "{confirmDialog.name}"?
              {confirmDialog.type === 'delete-workspace' && ' All snapshots in this workspace will also be deleted.'}
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDialog({ isOpen: false, type: 'delete-workspace', id: null, name: '' })}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={confirmDialog.type === 'delete-workspace' ? confirmDeleteWorkspace : confirmDeleteSnapshot}
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
