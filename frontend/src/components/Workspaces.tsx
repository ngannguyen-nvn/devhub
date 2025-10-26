import { useEffect, useState } from 'react'
import {
  Save,
  RotateCcw,
  Trash2,
  Plus,
  Download,
  Upload,
  Copy,
  Zap,
  GitBranch,
  Server,
  Clock,
  Tag,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ConfirmDialog from './ConfirmDialog'

interface WorkspaceSnapshot {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  runningServices: Array<{
    serviceId: string
    serviceName: string
  }>
  repositories: Array<{
    path: string
    branch: string
    hasChanges: boolean
  }>
  activeEnvProfile?: string
  tags?: string[]
  autoRestore?: boolean
}

export default function Workspaces() {
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showImportForm, setShowImportForm] = useState(false)

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    repoPaths: '',
    tags: '',
  })
  const [importForm, setImportForm] = useState({ jsonData: '' })

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'restore' | 'delete'
    id: string | null
    name: string
  }>({
    isOpen: false,
    type: 'restore',
    id: null,
    name: '',
  })

  // Fetch snapshots
  const fetchSnapshots = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/workspaces')
      setSnapshots(response.data.snapshots || [])
    } catch (error) {
      console.error('Error fetching snapshots:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSnapshots()
  }, [])

  // Quick snapshot
  const handleQuickSnapshot = async () => {
    try {
      await axios.post('/api/workspaces/quick')
      fetchSnapshots()
      toast.success('Quick snapshot created!')
    } catch (error: any) {
      toast.error(`Failed to create snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  // Create snapshot
  const handleCreateSnapshot = async () => {
    if (!createForm.name.trim()) {
      toast.error('Snapshot name is required')
      return
    }

    if (!createForm.repoPaths.trim()) {
      toast.error('At least one repository path is required')
      return
    }

    try {
      const repoPaths = createForm.repoPaths
        .split(',')
        .map(p => p.trim())
        .filter(p => p)

      const tags = createForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await axios.post('/api/workspaces', {
        name: createForm.name,
        description: createForm.description || undefined,
        repoPaths,
        tags: tags.length > 0 ? tags : undefined,
      })

      setShowCreateForm(false)
      setCreateForm({ name: '', description: '', repoPaths: '', tags: '' })
      fetchSnapshots()
      toast.success(`Snapshot "${createForm.name}" created successfully!`)
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
      const response = await axios.post(`/api/workspaces/${confirmDialog.id}/restore`)

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
  const handleDelete = (snapshotId: string, snapshotName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      id: snapshotId,
      name: snapshotName,
    })
  }

  const confirmDelete = async () => {
    if (!confirmDialog.id) return

    try {
      await axios.delete(`/api/workspaces/${confirmDialog.id}`)
      if (selectedSnapshot === confirmDialog.id) {
        setSelectedSnapshot(null)
      }
      fetchSnapshots()
      toast.success(`Snapshot "${confirmDialog.name}" deleted`)
    } catch (error: any) {
      toast.error(`Failed to delete snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  // Export snapshot
  const handleExport = async (snapshotId: string, snapshotName: string) => {
    try {
      const response = await axios.get(`/api/workspaces/${snapshotId}/export`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `workspace-${snapshotName}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success(`Workspace "${snapshotName}" exported`)
    } catch (error: any) {
      toast.error(`Failed to export snapshot: ${error.message}`)
    }
  }

  // Import snapshot
  const handleImport = async () => {
    if (!importForm.jsonData.trim()) {
      toast.error('JSON data is required')
      return
    }

    try {
      await axios.post('/api/workspaces/import', {
        jsonData: importForm.jsonData,
      })

      setShowImportForm(false)
      setImportForm({ jsonData: '' })
      fetchSnapshots()
      toast.success('Workspace imported successfully!')
    } catch (error: any) {
      toast.error(`Failed to import workspace: ${error.response?.data?.error || error.message}`)
    }
  }

  const selectedSnapshotData = snapshots.find(s => s.id === selectedSnapshot)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workspace Snapshots</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchSnapshots}
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Snapshots List */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Saved Snapshots</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportForm(true)}
                className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                title="Import"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                title="Create Snapshot"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold mb-2">Create Snapshot</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Snapshot name"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createForm.repoPaths}
                  onChange={(e) => setCreateForm({ ...createForm, repoPaths: e.target.value })}
                  placeholder="Repository paths (comma-separated)"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createForm.tags}
                  onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
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
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Import Form */}
          {showImportForm && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold mb-2">Import Workspace</h3>
              <textarea
                value={importForm.jsonData}
                onChange={(e) => setImportForm({ jsonData: e.target.value })}
                placeholder="Paste JSON data here..."
                className="w-full px-3 py-2 border rounded font-mono text-sm h-32"
              />
              <div className="flex gap-2 mt-3">
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

          {/* Snapshots List */}
          {loading && snapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading snapshots...</div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Save className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No snapshots saved yet.</p>
              <p className="text-sm mt-1">Create your first snapshot to save your workspace state.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {snapshots.map(snapshot => (
                <div
                  key={snapshot.id}
                  onClick={() => setSelectedSnapshot(snapshot.id)}
                  className={`p-3 rounded border cursor-pointer ${
                    selectedSnapshot === snapshot.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{snapshot.name}</h3>
                      {snapshot.description && (
                        <p className="text-sm text-gray-600">{snapshot.description}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          {snapshot.runningServices.length} services
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          {snapshot.repositories.length} repos
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(snapshot.createdAt)}
                        </span>
                      </div>
                      {snapshot.tags && snapshot.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {snapshot.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Snapshot Details */}
        <div className="bg-white rounded-lg shadow p-4">
          {selectedSnapshotData ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{selectedSnapshotData.name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport(selectedSnapshotData.id, selectedSnapshotData.name)}
                    className="p-2 text-blue-600 hover:text-blue-800"
                    title="Export"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRestore(selectedSnapshotData.id, selectedSnapshotData.name)}
                    disabled={restoring}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {restoring ? 'Restoring...' : 'Restore'}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedSnapshotData.id, selectedSnapshotData.name)}
                    className="p-2 text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedSnapshotData.description && (
                <p className="text-gray-600 mb-4">{selectedSnapshotData.description}</p>
              )}

              {/* Running Services */}
              <div className="mb-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4" />
                  Running Services ({selectedSnapshotData.runningServices.length})
                </h3>
                {selectedSnapshotData.runningServices.length === 0 ? (
                  <p className="text-sm text-gray-500 ml-6">No services were running</p>
                ) : (
                  <div className="space-y-1 ml-6">
                    {selectedSnapshotData.runningServices.map((service, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>{service.serviceName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Repository Branches */}
              <div className="mb-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4" />
                  Repository Branches ({selectedSnapshotData.repositories.length})
                </h3>
                {selectedSnapshotData.repositories.length === 0 ? (
                  <p className="text-sm text-gray-500 ml-6">No repositories tracked</p>
                ) : (
                  <div className="space-y-2 ml-6">
                    {selectedSnapshotData.repositories.map((repo, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600">{repo.branch}</span>
                          {repo.hasChanges && (
                            <AlertCircle className="w-3 h-3 text-yellow-600" title="Had uncommitted changes" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{repo.path}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Environment Profile */}
              {selectedSnapshotData.activeEnvProfile && (
                <div className="mb-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4" />
                    Environment Profile
                  </h3>
                  <p className="text-sm ml-6">{selectedSnapshotData.activeEnvProfile}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                <div>Created: {formatDate(selectedSnapshotData.createdAt)}</div>
                <div>Updated: {formatDate(selectedSnapshotData.updatedAt)}</div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <Save className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select a snapshot to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'restore', id: null, name: '' })}
        onConfirm={confirmDialog.type === 'restore' ? confirmRestore : confirmDelete}
        title={confirmDialog.type === 'restore' ? 'Restore Workspace' : 'Delete Snapshot'}
        message={
          confirmDialog.type === 'restore'
            ? `Are you sure you want to restore workspace "${confirmDialog.name}"? This will stop all running services and switch git branches.`
            : `Are you sure you want to delete snapshot "${confirmDialog.name}"? This action cannot be undone.`
        }
        confirmText={confirmDialog.type === 'restore' ? 'Restore' : 'Delete'}
        variant={confirmDialog.type === 'restore' ? 'warning' : 'danger'}
      />
    </div>
  )
}
