import { useEffect, useState } from 'react'
import {
  Save,
  RotateCcw,
  Trash2,
  Plus,
  Download,
  Zap,
  GitBranch,
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Folder,
  ChevronRight,
  Home,
  Layers,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ConfirmDialog from './ConfirmDialog'
import { SkeletonLoader } from './Loading'
import type { Workspace, WorkspaceSnapshot } from '@devhub/shared'

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

  // UI state
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [showCreateWorkspaceForm, setShowCreateWorkspaceForm] = useState(false)
  const [showCreateSnapshotForm, setShowCreateSnapshotForm] = useState(false)
  const [showScanForm, setShowScanForm] = useState(false)

  // Forms
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
  })
  const [scanForm, setScanForm] = useState({
    path: '',
    name: '',
    description: '',
    depth: '3',
    tags: '',
  })

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'restore' | 'delete-workspace' | 'delete-snapshot'
    id: string | null
    name: string
  }>({
    isOpen: false,
    type: 'restore',
    id: null,
    name: '',
  })

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/workspaces')
      setWorkspaces(response.data.workspaces || [])
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      toast.error('Failed to fetch workspaces')
    } finally {
      setLoading(false)
    }
  }

  // Fetch snapshots for a specific workspace
  const fetchSnapshots = async (workspaceId: string) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/workspaces/${workspaceId}/snapshots`)
      setSnapshots(response.data.snapshots || [])
    } catch (error) {
      console.error('Error fetching snapshots:', error)
      toast.error('Failed to fetch snapshots')
    } finally {
      setLoading(false)
    }
  }

  // Fetch snapshot details
  const fetchSnapshotDetails = async (snapshotId: string) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/workspaces/snapshots/${snapshotId}`)
      setSelectedSnapshot(response.data.snapshot)
    } catch (error) {
      console.error('Error fetching snapshot details:', error)
      toast.error('Failed to fetch snapshot details')
    } finally {
      setLoading(false)
    }
  }

  // Initial load - fetch workspaces
  useEffect(() => {
    if (viewLevel === 'workspace-list') {
      fetchWorkspaces()
    } else if (viewLevel === 'workspace-detail' && selectedWorkspaceId) {
      fetchSnapshots(selectedWorkspaceId)
    } else if (viewLevel === 'snapshot-detail' && selectedSnapshotId) {
      fetchSnapshotDetails(selectedSnapshotId)
    }
  }, [viewLevel, selectedWorkspaceId, selectedSnapshotId])

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
      toast.error('Workspace name is required')
      return
    }

    try {
      const tags = createWorkspaceForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await axios.post('/api/workspaces', {
        name: createWorkspaceForm.name,
        description: createWorkspaceForm.description || undefined,
        folderPath: createWorkspaceForm.folderPath || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      setShowCreateWorkspaceForm(false)
      setCreateWorkspaceForm({ name: '', description: '', folderPath: '', tags: '' })
      fetchWorkspaces()
      toast.success(`Workspace "${createWorkspaceForm.name}" created successfully!`)
    } catch (error: any) {
      toast.error(`Failed to create workspace: ${error.response?.data?.error || error.message}`)
    }
  }

  // Activate workspace
  const handleActivateWorkspace = async (workspaceId: string) => {
    try {
      await axios.post(`/api/workspaces/${workspaceId}/activate`)
      fetchWorkspaces()
      toast.success('Workspace activated!')
    } catch (error: any) {
      toast.error(`Failed to activate workspace: ${error.response?.data?.error || error.message}`)
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
      await axios.delete(`/api/workspaces/${confirmDialog.id}`)
      if (selectedWorkspaceId === confirmDialog.id) {
        handleBackToWorkspaces()
      }
      fetchWorkspaces()
      toast.success(`Workspace "${confirmDialog.name}" deleted`)
    } catch (error: any) {
      toast.error(`Failed to delete workspace: ${error.response?.data?.error || error.message}`)
    }
  }

  // Quick snapshot (creates in active workspace)
  const handleQuickSnapshot = async () => {
    try {
      await axios.post('/api/workspaces/snapshots/quick')
      if (selectedWorkspaceId) {
        fetchSnapshots(selectedWorkspaceId)
      }
      toast.success('Quick snapshot created!')
    } catch (error: any) {
      toast.error(`Failed to create snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  // Create snapshot
  const handleCreateSnapshot = async () => {
    if (!selectedWorkspaceId) {
      toast.error('No workspace selected')
      return
    }

    if (!createSnapshotForm.name.trim()) {
      toast.error('Snapshot name is required')
      return
    }

    if (!createSnapshotForm.repoPaths.trim()) {
      toast.error('At least one repository path is required')
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

      await axios.post(`/api/workspaces/${selectedWorkspaceId}/snapshots`, {
        name: createSnapshotForm.name,
        description: createSnapshotForm.description || undefined,
        repoPaths,
        tags: tags.length > 0 ? tags : undefined,
      })

      setShowCreateSnapshotForm(false)
      setCreateSnapshotForm({ name: '', description: '', repoPaths: '', tags: '' })
      fetchSnapshots(selectedWorkspaceId)
      toast.success(`Snapshot "${createSnapshotForm.name}" created successfully!`)
    } catch (error: any) {
      toast.error(`Failed to create snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  // Restore snapshot
  const handleRestore = (snapshotId: string, snapshotName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      id: snapshotId,
      name: snapshotName,
    })
  }

  const confirmRestore = async () => {
    if (!confirmDialog.id) return

    setRestoring(true)
    try {
      const response = await axios.post(`/api/workspaces/snapshots/${confirmDialog.id}/restore`)

      if (response.data.success) {
        toast.success(
          `Workspace restored! Started ${response.data.servicesStarted} service(s), switched ${response.data.branchesSwitched} branch(es)`,
          { duration: 5000 }
        )
      } else if (response.data.errors && response.data.errors.length > 0) {
        toast.error(
          `Workspace partially restored. Started ${response.data.servicesStarted} service(s), but ${response.data.errors.length} error(s) occurred`,
          { duration: 5000 }
        )
      }
    } catch (error: any) {
      toast.error(`Failed to restore workspace: ${error.response?.data?.error || error.message}`)
    } finally {
      setRestoring(false)
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
    if (!confirmDialog.id || !selectedWorkspaceId) return

    try {
      await axios.delete(`/api/workspaces/snapshots/${confirmDialog.id}`)
      if (selectedSnapshotId === confirmDialog.id) {
        handleBackToSnapshots()
      }
      fetchSnapshots(selectedWorkspaceId)
      toast.success(`Snapshot "${confirmDialog.name}" deleted`)
    } catch (error: any) {
      toast.error(`Failed to delete snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  // Export snapshot
  const handleExport = async (snapshotId: string, snapshotName: string) => {
    try {
      const response = await axios.get(`/api/workspaces/snapshots/${snapshotId}/export`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `snapshot-${snapshotName}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success(`Snapshot "${snapshotName}" exported`)
    } catch (error: any) {
      toast.error(`Failed to export snapshot: ${error.message}`)
    }
  }

  // Scan folder and create snapshot in workspace
  const handleScanFolder = async () => {
    if (!scanForm.path.trim()) {
      toast.error('Folder path is required')
      return
    }

    if (!scanForm.name.trim()) {
      toast.error('Snapshot name is required')
      return
    }

    try {
      const tags = scanForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      const response = await axios.post('/api/workspaces/snapshots/scan', {
        path: scanForm.path,
        name: scanForm.name,
        description: scanForm.description || undefined,
        depth: parseInt(scanForm.depth, 10),
        tags: tags.length > 0 ? tags : undefined,
      })

      setShowScanForm(false)
      setScanForm({ path: '', name: '', description: '', depth: '3', tags: '' })

      // Refresh workspaces to show the new/updated workspace
      fetchWorkspaces()

      toast.success(
        `Snapshot "${scanForm.name}" created! Found ${response.data.scanResult?.count || 0} repositories.`,
        { duration: 5000 }
      )
    } catch (error: any) {
      toast.error(`Failed to scan folder: ${error.response?.data?.error || error.message}`)
    }
  }

  // Get data for current view
  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Breadcrumb navigation
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={handleBackToWorkspaces}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
      >
        <Home className="w-4 h-4" />
        Workspaces
      </button>
      {selectedWorkspace && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {viewLevel === 'workspace-detail' ? (
            <span className="text-gray-900">{selectedWorkspace.name}</span>
          ) : (
            <button
              onClick={handleBackToSnapshots}
              className="text-blue-600 hover:text-blue-800"
            >
              {selectedWorkspace.name}
            </button>
          )}
        </>
      )}
      {selectedSnapshot && viewLevel === 'snapshot-detail' && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{selectedSnapshot.name}</span>
        </>
      )}
    </div>
  )

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      {viewLevel !== 'workspace-list' && renderBreadcrumb()}

      {/* View Level 1: Workspace List */}
      {viewLevel === 'workspace-list' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Workspaces</h1>
            <div className="flex gap-2">
              <button
                onClick={fetchWorkspaces}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowScanForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <Folder className="w-4 h-4" />
                Scan Folder
              </button>
              <button
                onClick={() => setShowCreateWorkspaceForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                New Workspace
              </button>
            </div>
          </div>

          {/* Create Workspace Form */}
          {showCreateWorkspaceForm && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold mb-3">Create New Workspace</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={createWorkspaceForm.name}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, name: e.target.value })}
                  placeholder="Workspace name *"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.description}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.folderPath}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, folderPath: e.target.value })}
                  placeholder="Folder path (optional)"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.tags}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreateWorkspace}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateWorkspaceForm(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && workspaces.length === 0 ? (
              <SkeletonLoader count={3} />
            ) : workspaces.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500">
                <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No workspaces yet</p>
                <p className="text-sm mt-2">Create your first workspace to get started</p>
              </div>
            ) : (
              workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 p-4 cursor-pointer transition-colors"
                  onClick={() => handleWorkspaceClick(workspace.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{workspace.name}</h3>
                    {workspace.active && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Active</span>
                    )}
                  </div>
                  {workspace.description && (
                    <p className="text-sm text-gray-600 mb-3">{workspace.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      {workspace.snapshotCount || 0} snapshots
                    </span>
                    {workspace.folderPath && (
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        {workspace.folderPath.split('/').pop()}
                      </span>
                    )}
                  </div>
                  {workspace.tags && workspace.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {workspace.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleActivateWorkspace(workspace.id)
                      }}
                      className="flex-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Activate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWorkspace(workspace.id, workspace.name)
                      }}
                      className="px-3 py-1 text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* View Level 2: Workspace Detail (Snapshots List) */}
      {viewLevel === 'workspace-detail' && selectedWorkspace && (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{selectedWorkspace.name}</h1>
              {selectedWorkspace.description && (
                <p className="text-gray-600 mt-1">{selectedWorkspace.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchSnapshots(selectedWorkspaceId!)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleQuickSnapshot}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                <Zap className="w-4 h-4" />
                Quick Snapshot
              </button>
              <button
                onClick={() => setShowCreateSnapshotForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                New Snapshot
              </button>
            </div>
          </div>

          {/* Create Snapshot Form */}
          {showCreateSnapshotForm && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold mb-3">Create Snapshot</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={createSnapshotForm.name}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, name: e.target.value })}
                  placeholder="Snapshot name *"
                  className="w-full px-3 py-2 border rounded"
                />
                <textarea
                  value={createSnapshotForm.description}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
                <textarea
                  value={createSnapshotForm.repoPaths}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, repoPaths: e.target.value })}
                  placeholder="Repository paths (comma-separated) *"
                  className="w-full px-3 py-2 border rounded font-mono text-sm"
                  rows={3}
                />
                <input
                  type="text"
                  value={createSnapshotForm.tags}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreateSnapshot}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateSnapshotForm(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Snapshots List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && snapshots.length === 0 ? (
              <SkeletonLoader count={3} />
            ) : snapshots.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500">
                <Save className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No snapshots yet</p>
                <p className="text-sm mt-2">Create your first snapshot to save your workspace state</p>
              </div>
            ) : (
              snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 p-4 cursor-pointer transition-colors"
                  onClick={() => handleSnapshotClick(snapshot.id)}
                >
                  <h3 className="font-bold text-lg mb-2">{snapshot.name}</h3>
                  {snapshot.description && (
                    <p className="text-sm text-gray-600 mb-3">{snapshot.description}</p>
                  )}
                  <div className="flex gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {snapshot.runningServices.length} services
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {snapshot.repositories.length} repos
                    </span>
                  </div>
                  {snapshot.tags && snapshot.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {snapshot.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {formatDate(snapshot.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* View Level 3: Snapshot Detail */}
      {viewLevel === 'snapshot-detail' && selectedSnapshot && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{selectedSnapshot.name}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport(selectedSnapshot.id, selectedSnapshot.name)}
                className="p-2 text-blue-600 hover:text-blue-800"
                title="Export"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleRestore(selectedSnapshot.id, selectedSnapshot.name)}
                disabled={restoring}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
              <button
                onClick={() => handleDeleteSnapshot(selectedSnapshot.id, selectedSnapshot.name)}
                className="p-2 text-red-600 hover:text-red-800"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {selectedSnapshot.description && (
            <p className="text-gray-600 mb-6">{selectedSnapshot.description}</p>
          )}

          {/* Running Services */}
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Server className="w-5 h-5" />
              Running Services ({selectedSnapshot.runningServices.length})
            </h3>
            {selectedSnapshot.runningServices.length === 0 ? (
              <p className="text-sm text-gray-500 ml-7">No services were running</p>
            ) : (
              <div className="space-y-2 ml-7">
                {selectedSnapshot.runningServices.map((service, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{service.serviceName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repository Branches */}
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <GitBranch className="w-5 h-5" />
              Repository Branches ({selectedSnapshot.repositories.length})
            </h3>
            {selectedSnapshot.repositories.length === 0 ? (
              <p className="text-sm text-gray-500 ml-7">No repositories tracked</p>
            ) : (
              <div className="space-y-3 ml-7">
                {selectedSnapshot.repositories.map((repo, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-blue-600">{repo.branch}</span>
                      {repo.hasChanges && (
                        <span title="Had uncommitted changes">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{repo.path}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t text-sm text-gray-500">
            <div>Created: {formatDate(selectedSnapshot.createdAt)}</div>
            <div>Updated: {formatDate(selectedSnapshot.updatedAt)}</div>
          </div>
        </div>
      )}

      {/* Scan Folder Form (shown at workspace list level) */}
      {showScanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Scan Folder & Create Snapshot</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={scanForm.path}
                onChange={(e) => setScanForm({ ...scanForm, path: e.target.value })}
                placeholder="Folder path to scan *"
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                value={scanForm.name}
                onChange={(e) => setScanForm({ ...scanForm, name: e.target.value })}
                placeholder="Snapshot name *"
                className="w-full px-3 py-2 border rounded"
              />
              <textarea
                value={scanForm.description}
                onChange={(e) => setScanForm({ ...scanForm, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={scanForm.depth}
                  onChange={(e) => setScanForm({ ...scanForm, depth: e.target.value })}
                  placeholder="Scan depth"
                  min="0"
                  max="5"
                  className="w-24 px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={scanForm.tags}
                  onChange={(e) => setScanForm({ ...scanForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="flex-1 px-3 py-2 border rounded"
                />
              </div>
              <p className="text-xs text-gray-600">
                This will scan the folder for git repositories and create a workspace + snapshot.
              </p>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowScanForm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleScanFolder}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Scan & Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'restore', id: null, name: '' })}
        onConfirm={
          confirmDialog.type === 'restore' 
            ? confirmRestore 
            : confirmDialog.type === 'delete-workspace'
            ? confirmDeleteWorkspace
            : confirmDeleteSnapshot
        }
        title={
          confirmDialog.type === 'restore' 
            ? 'Restore Snapshot' 
            : confirmDialog.type === 'delete-workspace'
            ? 'Delete Workspace'
            : 'Delete Snapshot'
        }
        message={
          confirmDialog.type === 'restore'
            ? `Are you sure you want to restore snapshot "${confirmDialog.name}"? This will stop all running services and switch git branches.`
            : confirmDialog.type === 'delete-workspace'
            ? `Are you sure you want to delete workspace "${confirmDialog.name}"? This will also delete all its snapshots. This action cannot be undone.`
            : `Are you sure you want to delete snapshot "${confirmDialog.name}"? This action cannot be undone.`
        }
        confirmText={
          confirmDialog.type === 'restore' ? 'Restore' : 'Delete'
        }
        variant={confirmDialog.type === 'restore' ? 'warning' : 'danger'}
      />
    </div>
  )
}
