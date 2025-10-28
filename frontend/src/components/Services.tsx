import { useEffect, useState } from 'react'
import { Play, Square, Trash2, Plus, Terminal, RefreshCw, AlertCircle, FolderInput, CheckSquare, Square as SquareIcon } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { SkeletonLoader } from './Loading'
import ConfirmDialog from './ConfirmDialog'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface Service {
  id: string
  name: string
  repoPath: string
  command: string
  port?: number
  running?: {
    pid: number
    status: 'running' | 'stopped' | 'error'
    startedAt: string
  } | null
}

export default function Services() {
  const { activeWorkspace } = useWorkspace()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    serviceId: string | null
    serviceName: string
  }>({
    isOpen: false,
    serviceId: null,
    serviceName: '',
  })

  // New service form
  const [newService, setNewService] = useState({
    name: '',
    repoPath: '',
    command: '',
    port: '',
  })

  // Import from workspace state
  const [showImportModal, setShowImportModal] = useState(false)
  const [workspaceRepos, setWorkspaceRepos] = useState<Array<{ path: string; name: string }>>([])
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const fetchServices = async () => {
    if (!activeWorkspace) {
      setServices([])
      return
    }

    setLoading(true)
    try {
      const response = await axios.get('/api/services')
      setServices(response.data.services)
    } catch (error: any) {
      console.error('Error fetching services:', error)
      const errorMessage = error.response?.data?.error || error.message
      if (errorMessage.includes('No active workspace')) {
        toast.error('Please activate a workspace first')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async (serviceId: string) => {
    try {
      const response = await axios.get(`/api/services/${serviceId}/logs`)
      setLogs(response.data.logs)
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  useEffect(() => {
    fetchServices()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchServices, 10000)
    return () => clearInterval(interval)
  }, [activeWorkspace]) // Refresh when workspace changes

  useEffect(() => {
    if (selectedService) {
      fetchLogs(selectedService)
      const interval = setInterval(() => fetchLogs(selectedService), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedService])

  const handleAddService = async () => {
    try {
      await axios.post('/api/services', {
        name: newService.name,
        repoPath: newService.repoPath,
        command: newService.command,
        port: newService.port ? parseInt(newService.port) : undefined,
      })
      setShowAddForm(false)
      setNewService({ name: '', repoPath: '', command: '', port: '' })
      fetchServices()
      toast.success(`Service "${newService.name}" created successfully`)
    } catch (error) {
      console.error('Error adding service:', error)
      toast.error('Failed to add service')
    }
  }

  const fetchWorkspaceRepos = async () => {
    if (!activeWorkspace) return

    try {
      // Get all snapshots from active workspace
      const response = await axios.get(`/api/workspaces/${activeWorkspace.id}/snapshots`)
      const snapshots = response.data.snapshots || []

      // Extract unique repository paths from all snapshots
      const repoPathsSet = new Set<string>()
      snapshots.forEach((snapshot: any) => {
        if (snapshot.repositories) {
          snapshot.repositories.forEach((repo: any) => {
            if (repo.path) {
              repoPathsSet.add(repo.path)
            }
          })
        }
      })

      // Convert to array with name
      const repos = Array.from(repoPathsSet).map(path => ({
        path,
        name: path.split('/').pop() || path,
      }))

      setWorkspaceRepos(repos)
      setSelectedRepos(new Set(repos.map(r => r.path))) // Select all by default
    } catch (error) {
      console.error('Error fetching workspace repos:', error)
      toast.error('Failed to load workspace repositories')
    }
  }

  const toggleRepo = (path: string) => {
    const newSelected = new Set(selectedRepos)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedRepos(newSelected)
  }

  const handleImportFromWorkspace = async () => {
    if (selectedRepos.size === 0) {
      toast.error('Please select at least one repository')
      return
    }

    setImporting(true)
    let successCount = 0
    let failCount = 0
    let skippedCount = 0

    try {
      const repoPaths = Array.from(selectedRepos)

      for (const repoPath of repoPaths) {
        try {
          // Check if service with this repoPath already exists
          const existingService = services.find(s => s.repoPath === repoPath)
          if (existingService) {
            console.log(`Skipping ${repoPath}: Service "${existingService.name}" already exists`)
            skippedCount++
            continue
          }

          // Analyze the repository to get name, command, and port
          const analysisResponse = await axios.post('/api/repos/analyze', { repoPath })
          const analysis = analysisResponse.data.analysis

          // Create service with analyzed data
          await axios.post('/api/services', {
            name: analysis.name,
            repoPath: repoPath,
            command: analysis.command || 'npm start', // Fallback to npm start
            port: analysis.port || undefined,
          })

          successCount++
        } catch (error) {
          console.error(`Error importing ${repoPath}:`, error)
          failCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} service${successCount > 1 ? 's' : ''}`)
        fetchServices()
      }

      if (skippedCount > 0) {
        toast(`Skipped ${skippedCount} service${skippedCount > 1 ? 's' : ''} (already exists)`)
      }

      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} service${failCount > 1 ? 's' : ''}`)
      }

      if (successCount === 0 && skippedCount === 0 && failCount === 0) {
        toast('No services to import')
      }

      setShowImportModal(false)
      setSelectedRepos(new Set())
    } catch (error) {
      console.error('Error importing services:', error)
      toast.error('Failed to import services')
    } finally {
      setImporting(false)
    }
  }

  const openImportModal = () => {
    fetchWorkspaceRepos()
    setShowImportModal(true)
  }

  const handleStartService = async (id: string) => {
    try {
      await axios.post(`/api/services/${id}/start`)
      fetchServices()
      const service = services.find(s => s.id === id)
      toast.success(`Service "${service?.name || 'Unknown'}" started`)
    } catch (error) {
      console.error('Error starting service:', error)
      toast.error('Failed to start service')
    }
  }

  const handleStopService = async (id: string) => {
    try {
      await axios.post(`/api/services/${id}/stop`)
      fetchServices()
      const service = services.find(s => s.id === id)
      toast.success(`Service "${service?.name || 'Unknown'}" stopped`)
    } catch (error) {
      console.error('Error stopping service:', error)
      toast.error('Failed to stop service')
    }
  }

  const handleDeleteService = (id: string) => {
    const service = services.find(s => s.id === id)
    setConfirmDialog({
      isOpen: true,
      serviceId: id,
      serviceName: service?.name || 'Unknown',
    })
  }

  const confirmDeleteService = async () => {
    if (!confirmDialog.serviceId) return

    try {
      await axios.delete(`/api/services/${confirmDialog.serviceId}`)
      fetchServices()
      if (selectedService === confirmDialog.serviceId) {
        setSelectedService(null)
      }
      toast.success(`Service "${confirmDialog.serviceName}" deleted`)
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Failed to delete service')
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* No Workspace Warning */}
      {!activeWorkspace && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm text-yellow-700">
                <strong className="font-medium">No active workspace.</strong> Please create or activate a workspace to manage services.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Manager</h1>
          <p className="text-gray-600">
            Start, stop, and monitor your services
            {activeWorkspace && <span className="text-blue-600 font-medium"> in {activeWorkspace.name}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchServices}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            data-testid="service-refresh-button"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openImportModal}
            disabled={!activeWorkspace}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="service-import-button"
          >
            <FolderInput size={18} />
            Import from Workspace
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            data-testid="service-add-button"
          >
            <Plus size={18} />
            Add Service
          </button>
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" data-testid="service-create-form">
            <h2 className="text-xl font-bold mb-4">Add New Service</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="e.g., Auth Service"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="service-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repository Path
                </label>
                <input
                  type="text"
                  value={newService.repoPath}
                  onChange={(e) => setNewService({ ...newService, repoPath: e.target.value })}
                  placeholder="/home/user/my-service"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="service-repoPath-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Command
                </label>
                <input
                  type="text"
                  value={newService.command}
                  onChange={(e) => setNewService({ ...newService, command: e.target.value })}
                  placeholder="npm start"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="service-command-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port (optional)
                </label>
                <input
                  type="number"
                  value={newService.port}
                  onChange={(e) => setNewService({ ...newService, port: e.target.value })}
                  placeholder="3000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="service-port-input"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                data-testid="service-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                disabled={!newService.name || !newService.repoPath || !newService.command}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="service-create-button"
              >
                Add Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Workspace Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="service-import-form">
            <h2 className="text-xl font-bold mb-4">Import Services from Workspace</h2>
            <p className="text-gray-600 mb-6">
              Select repositories from <span className="font-medium text-blue-600">{activeWorkspace?.name}</span> to import as services.
              Service details will be auto-detected from package.json and .env files.
            </p>

            {workspaceRepos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderInput size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No repositories found in this workspace.</p>
                <p className="text-sm mt-2">Add repositories by creating a snapshot from the Dashboard.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (selectedRepos.size === workspaceRepos.length) {
                        setSelectedRepos(new Set())
                      } else {
                        setSelectedRepos(new Set(workspaceRepos.map(r => r.path)))
                      }
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
                    data-testid="service-select-all-button"
                  >
                    {selectedRepos.size === workspaceRepos.length ? (
                      <>
                        <CheckSquare size={18} />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <SquareIcon size={18} />
                        Select All
                      </>
                    )}
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedRepos.size} of {workspaceRepos.length} selected
                  </span>
                </div>

                <div className="space-y-2 mb-6 max-h-96 overflow-y-auto" data-testid="service-import-repo-list">
                  {workspaceRepos.map((repo) => {
                    const isSelected = selectedRepos.has(repo.path)
                    const alreadyExists = services.find(s => s.repoPath === repo.path)
                    return (
                      <div
                        key={repo.path}
                        onClick={() => toggleRepo(repo.path)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        data-testid={`service-import-repo-${repo.path.replace(/\//g, '-')}`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare size={20} className="text-blue-600 flex-shrink-0" />
                          ) : (
                            <SquareIcon size={20} className="text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{repo.name}</p>
                              {alreadyExists && (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                                  Already added
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{repo.path}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setSelectedRepos(new Set())
                }}
                disabled={importing}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                data-testid="service-import-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleImportFromWorkspace}
                disabled={importing || selectedRepos.size === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="service-import-confirm-button"
              >
                {importing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FolderInput size={18} />
                    Import {selectedRepos.size} Service{selectedRepos.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-auto">
        {/* Services List */}
        <div className="space-y-4" data-testid="service-list">
          {loading && services.length === 0 && (
            <SkeletonLoader count={3} />
          )}

          {services.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <Terminal size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No services defined yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-blue-600 hover:underline"
                data-testid="service-add-first-button"
              >
                Add your first service
              </button>
            </div>
          )}

          {services.map((service) => {
            const isRunning = service.running?.status === 'running'
            const isSelected = selectedService === service.id

            return (
              <div
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:shadow-sm'
                }`}
                data-testid={`service-item-${service.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          isRunning
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isRunning ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-mono">{service.command}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  <p className="truncate">{service.repoPath}</p>
                  {service.port && <p>Port: {service.port}</p>}
                  {service.running?.pid && <p>PID: {service.running.pid}</p>}
                </div>

                <div className="flex gap-2">
                  {isRunning ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStopService(service.id)
                      }}
                      className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center justify-center gap-2"
                      data-testid={`service-stop-button-${service.id}`}
                    >
                      <Square size={14} />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartService(service.id)
                      }}
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                      data-testid={`service-start-button-${service.id}`}
                    >
                      <Play size={14} />
                      Start
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteService(service.id)
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 flex items-center gap-2"
                    data-testid={`service-delete-button-${service.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Logs Viewer */}
        <div className="bg-gray-900 rounded-lg p-4 overflow-hidden flex flex-col" data-testid="service-logs-viewer">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Service Logs</h3>
            {selectedService && (
              <button
                onClick={() => fetchLogs(selectedService)}
                className="text-gray-400 hover:text-white"
                data-testid="service-logs-refresh-button"
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>

          {!selectedService ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a service to view logs
            </div>
          ) : (
            <div className="flex-1 overflow-auto font-mono text-xs text-green-400 space-y-1" data-testid="service-logs-content">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs available</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all">
                    {log}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, serviceId: null, serviceName: '' })}
        onConfirm={confirmDeleteService}
        title="Delete Service"
        message={`Are you sure you want to delete "${confirmDialog.serviceName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
