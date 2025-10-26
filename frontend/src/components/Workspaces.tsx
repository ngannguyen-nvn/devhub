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
  Folder,
  Container,
  FileText,
  Database,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ConfirmDialog from './ConfirmDialog'
import { SkeletonLoader } from './Loading'

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
  dockerContainers?: Array<{
    id: string
    name: string
    image: string
    state: string
    ports: Array<{
      privatePort: number
      publicPort?: number
    }>
  }>
  envVariables?: Record<string, Record<string, string>>
  serviceLogs?: Record<string, string[]>
  wikiNotes?: Array<{
    id: string
    title: string
    content: string
    tags?: string[]
  }>
  activeEnvProfile?: string
  tags?: string[]
  autoRestore?: boolean
  scannedPath?: string
}

export default function Workspaces() {
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showImportForm, setShowImportForm] = useState(false)
  const [showScanForm, setShowScanForm] = useState(false)
  const [showSelectiveRestore, setShowSelectiveRestore] = useState(false)

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    repoPaths: '',
    tags: '',
  })
  const [importForm, setImportForm] = useState({ jsonData: '' })
  const [scanForm, setScanForm] = useState({
    path: '',
    name: '',
    description: '',
    depth: '3',
    tags: '',
  })
  const [selectiveRestoreOptions, setSelectiveRestoreOptions] = useState({
    restoreBranches: true,
    restoreServices: true,
    restoreDocker: false,
    restoreEnvVars: false,
  })

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

  // Scan folder and create workspace
  const handleScanFolder = async () => {
    if (!scanForm.path.trim()) {
      toast.error('Folder path is required')
      return
    }

    if (!scanForm.name.trim()) {
      toast.error('Workspace name is required')
      return
    }

    try {
      const tags = scanForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      const response = await axios.post('/api/workspaces/scan', {
        path: scanForm.path,
        name: scanForm.name,
        description: scanForm.description || undefined,
        depth: parseInt(scanForm.depth, 10),
        tags: tags.length > 0 ? tags : undefined,
      })

      setShowScanForm(false)
      setScanForm({ path: '', name: '', description: '', depth: '3', tags: '' })
      fetchSnapshots()
      toast.success(
        `Workspace "${scanForm.name}" created! Found ${response.data.repositoriesFound} repositories.`,
        { duration: 5000 }
      )
    } catch (error: any) {
      toast.error(`Failed to scan folder: ${error.response?.data?.error || error.message}`)
    }
  }

  // Selective restore
  const handleSelectiveRestore = () => {
    if (!selectedSnapshot) return
    setShowSelectiveRestore(true)
  }

  const confirmSelectiveRestore = async () => {
    if (!selectedSnapshot) return

    setRestoring(true)
    setShowSelectiveRestore(false)
    try {
      const response = await axios.post(`/api/workspaces/${selectedSnapshot}/restore-selective`, selectiveRestoreOptions)

      const parts = []
      if (response.data.branchesSwitched > 0) parts.push(`switched ${response.data.branchesSwitched} branch(es)`)
      if (response.data.servicesStarted > 0) parts.push(`started ${response.data.servicesStarted} service(s)`)
      if (response.data.containersStarted > 0) parts.push(`started ${response.data.containersStarted} container(s)`)
      if (response.data.envVarsApplied > 0) parts.push(`applied ${response.data.envVarsApplied} env var(s)`)

      if (parts.length > 0) {
        toast.success(`Workspace restored! ${parts.join(', ')}`, { duration: 5000 })
      } else {
        toast.success('Workspace restored (no changes)')
      }

      if (response.data.errors && response.data.errors.length > 0) {
        console.error('Restore errors:', response.data.errors)
        toast.error(`${response.data.errors.length} error(s) occurred during restoration`, { duration: 3000 })
      }
    } catch (error: any) {
      toast.error(`Failed to restore workspace: ${error.response?.data?.error || error.message}`)
    } finally {
      setRestoring(false)
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
          <button
            onClick={() => setShowScanForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <Folder className="w-4 h-4" />
            Scan Folder
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

          {/* Scan Folder Form */}
          {showScanForm && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded">
              <h3 className="font-semibold mb-2">Scan Folder & Create Workspace</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={scanForm.path}
                  onChange={(e) => setScanForm({ ...scanForm, path: e.target.value })}
                  placeholder="Folder path to scan (e.g., /home/user/projects)"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={scanForm.name}
                  onChange={(e) => setScanForm({ ...scanForm, name: e.target.value })}
                  placeholder="Workspace name"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={scanForm.description}
                  onChange={(e) => setScanForm({ ...scanForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border rounded"
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
                  This will scan the folder for git repositories and capture all running services, Docker containers, environment variables, and notes.
                </p>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleScanFolder}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Scan & Create
                </button>
                <button
                  onClick={() => setShowScanForm(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Snapshots List */}
          {loading && snapshots.length === 0 ? (
            <SkeletonLoader count={3} />
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
                    {restoring ? 'Restoring...' : 'Restore All'}
                  </button>
                  <button
                    onClick={handleSelectiveRestore}
                    disabled={restoring}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Selective Restore
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

              {/* Docker Containers */}
              {selectedSnapshotData.dockerContainers && selectedSnapshotData.dockerContainers.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <Container className="w-4 h-4" />
                    Docker Containers ({selectedSnapshotData.dockerContainers.length})
                  </h3>
                  <div className="space-y-2 ml-6">
                    {selectedSnapshotData.dockerContainers.map((container, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{container.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            container.state === 'running' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {container.state}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">{container.image}</div>
                        {container.ports.length > 0 && (
                          <div className="text-xs text-gray-400">
                            Ports: {container.ports.map(p => p.publicPort ? `${p.publicPort}:${p.privatePort}` : p.privatePort).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Environment Variables */}
              {selectedSnapshotData.envVariables && Object.keys(selectedSnapshotData.envVariables).length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4" />
                    Environment Variables ({Object.values(selectedSnapshotData.envVariables).reduce((sum, vars) => sum + Object.keys(vars).length, 0)} total)
                  </h3>
                  <div className="space-y-2 ml-6 text-sm">
                    {Object.entries(selectedSnapshotData.envVariables).map(([serviceId, vars]) => (
                      <div key={serviceId}>
                        <div className="font-medium text-gray-700">Service: {serviceId.slice(0, 12)}</div>
                        <div className="text-xs text-gray-500 ml-2">{Object.keys(vars).length} variables</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Logs */}
              {selectedSnapshotData.serviceLogs && Object.keys(selectedSnapshotData.serviceLogs).length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Service Logs ({Object.keys(selectedSnapshotData.serviceLogs).length} services)
                  </h3>
                  <div className="space-y-1 ml-6 text-sm">
                    {Object.entries(selectedSnapshotData.serviceLogs).map(([serviceId, logs]) => (
                      <div key={serviceId} className="text-gray-600">
                        {serviceId.slice(0, 12)}: {logs.length} log lines
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wiki Notes */}
              {selectedSnapshotData.wikiNotes && selectedSnapshotData.wikiNotes.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Wiki Notes ({selectedSnapshotData.wikiNotes.length})
                  </h3>
                  <div className="space-y-1 ml-6 text-sm">
                    {selectedSnapshotData.wikiNotes.map((note, i) => (
                      <div key={i} className="text-gray-700">
                        {note.title}
                        {note.tags && note.tags.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            [{note.tags.join(', ')}]
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scanned Path */}
              {selectedSnapshotData.scannedPath && (
                <div className="mb-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <Folder className="w-4 h-4" />
                    Scanned Path
                  </h3>
                  <p className="text-sm ml-6 font-mono text-gray-600">{selectedSnapshotData.scannedPath}</p>
                </div>
              )}

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

      {/* Selective Restore Dialog */}
      {showSelectiveRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Selective Restore</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose which components to restore from the snapshot:
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectiveRestoreOptions.restoreBranches}
                  onChange={(e) =>
                    setSelectiveRestoreOptions({
                      ...selectiveRestoreOptions,
                      restoreBranches: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">Git Branches</div>
                  <div className="text-xs text-gray-500">Switch all repositories to their saved branches</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectiveRestoreOptions.restoreServices}
                  onChange={(e) =>
                    setSelectiveRestoreOptions({
                      ...selectiveRestoreOptions,
                      restoreServices: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">Services</div>
                  <div className="text-xs text-gray-500">Stop all current services and start saved ones</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectiveRestoreOptions.restoreDocker}
                  onChange={(e) =>
                    setSelectiveRestoreOptions({
                      ...selectiveRestoreOptions,
                      restoreDocker: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">Docker Containers</div>
                  <div className="text-xs text-gray-500">Start saved Docker containers</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectiveRestoreOptions.restoreEnvVars}
                  onChange={(e) =>
                    setSelectiveRestoreOptions({
                      ...selectiveRestoreOptions,
                      restoreEnvVars: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">Environment Variables</div>
                  <div className="text-xs text-gray-500">Create a new profile with saved variables</div>
                </div>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSelectiveRestore(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmSelectiveRestore}
                disabled={
                  !selectiveRestoreOptions.restoreBranches &&
                  !selectiveRestoreOptions.restoreServices &&
                  !selectiveRestoreOptions.restoreDocker &&
                  !selectiveRestoreOptions.restoreEnvVars
                }
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Restore Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
