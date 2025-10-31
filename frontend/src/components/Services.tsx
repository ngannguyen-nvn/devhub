import { useEffect, useState } from 'react'
import { Play, Square, Trash2, Plus, Terminal, RefreshCw, AlertCircle, FolderInput, CheckSquare, Square as SquareIcon, Search, Tags, X } from 'lucide-react'
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
  status?: 'running' | 'stopped' | 'error'
  pid?: number
  startedAt?: string
  stoppedAt?: string
  exitCode?: number
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown'
  tags?: string[]
}

export default function Services() {
  const { activeWorkspace } = useWorkspace()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [allLogs, setAllLogs] = useState<Array<{serviceId: string, serviceName: string, log: string, timestamp: string}>>([])
  const [showCentralLogs, setShowCentralLogs] = useState(true)
  const [activeLogTab, setActiveLogTab] = useState<string>('all') // 'all' or serviceId
  const [singleServiceLogs, setSingleServiceLogs] = useState<string[]>([]) // For individual service tab

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

  // Stop all confirmation dialog
  const [confirmStopAll, setConfirmStopAll] = useState(false)

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

  // Group management state
  const [groups, setGroups] = useState<Array<{id: string, name: string, description?: string, color?: string, icon?: string, serviceIds: string[]}>>([])
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false)
  const [selectedServiceForGroups, setSelectedServiceForGroups] = useState<Service | null>(null)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', color: '#3B82F6' })

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

  const fetchAllLogs = async () => {
    const runningServices = services.filter(s => s.status === 'running')
    if (runningServices.length === 0) {
      setAllLogs([])
      return
    }

    try {
      const logsPromises = runningServices.map(async service => {
        try {
          const response = await axios.get(`/api/services/${service.id}/logs`)
          return response.data.logs.map((log: string) => ({
            serviceId: service.id,
            serviceName: service.name,
            log,
            timestamp: new Date().toISOString(),
          }))
        } catch (error) {
          console.error(`Error fetching logs for ${service.name}:`, error)
          return []
        }
      })

      const logsArrays = await Promise.all(logsPromises)
      const combinedLogs = logsArrays.flat()
      setAllLogs(combinedLogs)
    } catch (error) {
      console.error('Error fetching all logs:', error)
    }
  }

  const fetchSingleServiceLogs = async (serviceId: string) => {
    try {
      const response = await axios.get(`/api/services/${serviceId}/logs`)
      setSingleServiceLogs(response.data.logs)
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  const fetchGroups = async () => {
    if (!activeWorkspace) return

    try {
      const response = await axios.get(`/api/groups/${activeWorkspace.id}`)
      setGroups(response.data.groups)
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const handleCreateGroup = async () => {
    if (!activeWorkspace || !newGroup.name.trim()) {
      toast.error('Group name is required')
      return
    }

    try {
      await axios.post('/api/groups', {
        workspaceId: activeWorkspace.id,
        name: newGroup.name,
        description: newGroup.description,
        color: newGroup.color,
      })
      toast.success(`Group "${newGroup.name}" created`)
      setNewGroup({ name: '', description: '', color: '#3B82F6' })
      fetchGroups()
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error('Failed to create group')
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      await axios.delete(`/api/groups/${groupId}`)
      toast.success(`Group "${groupName}" deleted`)
      fetchGroups()
      fetchServices() // Refresh to update tags
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('Failed to delete group')
    }
  }

  const handleToggleServiceGroup = async (groupId: string, serviceId: string, isCurrentlyIn: boolean) => {
    try {
      if (isCurrentlyIn) {
        await axios.delete(`/api/groups/${groupId}/services/${serviceId}`)
        toast.success('Service removed from group')
      } else {
        await axios.post(`/api/groups/${groupId}/services`, { serviceId })
        toast.success('Service added to group')
      }
      fetchGroups()
      fetchServices() // Refresh to update tags
    } catch (error) {
      console.error('Error toggling service group:', error)
      toast.error('Failed to update service group')
    }
  }

  useEffect(() => {
    fetchServices()
    fetchGroups()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchServices, 10000)
    return () => clearInterval(interval)
  }, [activeWorkspace]) // Refresh when workspace changes

  // Fetch logs based on active tab
  useEffect(() => {
    if (!showCentralLogs) return

    if (activeLogTab === 'all') {
      fetchAllLogs()
      const interval = setInterval(fetchAllLogs, 3000) // Poll every 3 seconds
      return () => clearInterval(interval)
    } else {
      // Fetch logs for specific service
      fetchSingleServiceLogs(activeLogTab)
      const interval = setInterval(() => fetchSingleServiceLogs(activeLogTab), 3000)
      return () => clearInterval(interval)
    }
  }, [showCentralLogs, activeLogTab, services]) // Re-fetch when tab or services change

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

  const handleStopAll = async () => {
    setConfirmStopAll(false)

    // Get filtered and running services
    const filtered = services.filter(service => {
      // Filter by group
      if (selectedGroup !== 'all' && !service.tags?.includes(selectedGroup)) {
        return false
      }
      // Filter by search term
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase()
        return (
          service.name.toLowerCase().includes(search) ||
          service.repoPath.toLowerCase().includes(search) ||
          service.command.toLowerCase().includes(search)
        )
      }
      return true
    })

    const runningServices = filtered.filter(s => s.status === 'running')

    if (runningServices.length === 0) {
      toast.error('No running services to stop')
      return
    }

    const groupLabel = selectedGroup === 'all'
      ? 'all services'
      : `group "${selectedGroup}"`

    toast.loading(`Stopping ${runningServices.length} services in ${groupLabel}...`)

    try {
      const stopPromises = runningServices.map(service =>
        axios.post(`/api/services/${service.id}/stop`)
      )

      await Promise.all(stopPromises)
      fetchServices()
      toast.dismiss()
      toast.success(`Successfully stopped ${runningServices.length} services`)
    } catch (error) {
      console.error('Error stopping services:', error)
      toast.dismiss()
      toast.error('Failed to stop some services')
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
      toast.success(`Service "${confirmDialog.serviceName}" deleted`)
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Failed to delete service')
    }
  }

  // Filter services based on search term and group
  const filteredServices = services.filter(service => {
    // Filter by group first
    if (selectedGroup !== 'all' && !service.tags?.includes(selectedGroup)) {
      return false
    }

    // Then filter by search term
    if (!searchTerm.trim()) return true

    const search = searchTerm.toLowerCase()
    return (
      service.name.toLowerCase().includes(search) ||
      service.repoPath.toLowerCase().includes(search) ||
      service.command.toLowerCase().includes(search) ||
      (service.port && service.port.toString().includes(search))
    )
  })

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
            onClick={() => {
              const filtered = services.filter(service => {
                if (selectedGroup !== 'all' && !service.tags?.includes(selectedGroup)) {
                  return false
                }
                if (searchTerm.trim()) {
                  const search = searchTerm.toLowerCase()
                  return (
                    service.name.toLowerCase().includes(search) ||
                    service.repoPath.toLowerCase().includes(search) ||
                    service.command.toLowerCase().includes(search)
                  )
                }
                return true
              })
              const runningCount = filtered.filter(s => s.status === 'running').length
              if (runningCount === 0) {
                toast.error('No running services to stop')
              } else {
                setConfirmStopAll(true)
              }
            }}
            disabled={!activeWorkspace}
            className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="service-stop-all-button"
          >
            <Square size={18} />
            Stop All
          </button>
          <button
            onClick={() => setShowGroupsModal(true)}
            disabled={!activeWorkspace}
            className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Tags size={18} />
            Manage Groups
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

      {/* Group Filter Tabs & Search Bar */}
      {services.length > 0 && (
        <div className="mb-6 space-y-4">
          {/* Group Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedGroup === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Services ({services.length})
            </button>
            {groups.map(group => {
              const count = services.filter(s => s.tags?.includes(group.name)).length
              if (count === 0) return null // Don't show groups with no services

              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                    selectedGroup === group.name
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    selectedGroup === group.name
                      ? { backgroundColor: group.color || '#3B82F6' }
                      : {}
                  }
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: group.color || '#3B82F6' }}
                  />
                  {group.name} ({count})
                </button>
              )
            })}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services by name, path, command, or port..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="service-search-input"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-600">
              Found {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} matching "{searchTerm}"
            </p>
          )}
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

          {filteredServices.length === 0 && services.length > 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <Terminal size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No services match your search</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:underline"
              >
                Clear search
              </button>
            </div>
          )}

          {filteredServices.map((service) => {
            const isRunning = service.status === 'running'
            const isError = service.status === 'error'

            return (
              <div
                key={service.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all"
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
                            : isError
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isRunning ? 'Running' : isError ? 'Error' : 'Stopped'}
                      </span>
                      {/* Health Status Badge */}
                      {isRunning && service.healthStatus && (
                        <span
                          className={`text-xs ${
                            service.healthStatus === 'healthy'
                              ? '🟢'
                              : service.healthStatus === 'unhealthy'
                              ? '🔴'
                              : '🟡'
                          }`}
                          title={`Health: ${service.healthStatus}`}
                        >
                          {service.healthStatus === 'healthy' ? '🟢' : service.healthStatus === 'unhealthy' ? '🔴' : '🟡'}
                        </span>
                      )}
                      {/* Tags */}
                      {service.tags && service.tags.length > 0 && (
                        <div className="flex gap-1">
                          {service.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                          {service.tags.length > 2 && (
                            <span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 text-xs rounded">
                              +{service.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 font-mono">{service.command}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  <p className="truncate">{service.repoPath}</p>
                  {service.port && <p>Port: {service.port}</p>}
                  {service.pid && <p>PID: {service.pid}</p>}
                  {!isRunning && service.exitCode !== undefined && (
                    <p className={service.exitCode === 0 ? 'text-gray-500' : 'text-red-600'}>
                      Exit code: {service.exitCode}
                    </p>
                  )}
                  {service.stoppedAt && (
                    <p className="text-gray-500">
                      Stopped: {new Date(service.stoppedAt).toLocaleTimeString()}
                    </p>
                  )}
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
                      setSelectedServiceForGroups(service)
                      setShowAssignGroupModal(true)
                    }}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded text-sm hover:bg-purple-100 flex items-center gap-2"
                    title="Assign to groups"
                  >
                    <Tags size={14} />
                  </button>
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

        {/* Tabbed Logs Viewer */}
        <div className="bg-gray-900 rounded-lg overflow-hidden flex flex-col" data-testid="service-logs-viewer">
          {/* Header with title and controls */}
          <div className="flex items-center justify-between p-4 pb-0">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-semibold">Service Logs</h3>
              <span className="text-gray-400 text-xs">
                ({services.filter(s => s.status === 'running').length} services running)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCentralLogs(!showCentralLogs)}
                className={`px-3 py-1 rounded text-xs ${
                  showCentralLogs
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {showCentralLogs ? 'Live' : 'Paused'}
              </button>
              <button
                onClick={() => activeLogTab === 'all' ? fetchAllLogs() : fetchSingleServiceLogs(activeLogTab)}
                className="text-gray-400 hover:text-white"
                data-testid="service-logs-refresh-button"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveLogTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap ${
                activeLogTab === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              All Services
            </button>
            {services.filter(s => s.status === 'running').map(service => (
              <button
                key={service.id}
                onClick={() => setActiveLogTab(service.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap ${
                  activeLogTab === service.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>

          {/* Log Content */}
          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {services.filter(s => s.status === 'running').length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                No services are currently running
              </div>
            ) : (
              <div className="flex-1 overflow-auto font-mono text-xs space-y-1" data-testid="service-logs-content">
                {activeLogTab === 'all' ? (
                  // Show all services logs with prefix
                  allLogs.length === 0 ? (
                    <p className="text-gray-500">Waiting for logs...</p>
                  ) : (
                    allLogs.map((logEntry, i) => (
                      <div key={i} className="whitespace-pre-wrap break-all">
                        <span className="text-blue-400 font-semibold">[{logEntry.serviceName}]</span>{' '}
                        <span className="text-green-400">{logEntry.log}</span>
                      </div>
                    ))
                  )
                ) : (
                  // Show single service logs without prefix
                  singleServiceLogs.length === 0 ? (
                    <p className="text-gray-500">No logs available</p>
                  ) : (
                    singleServiceLogs.map((log, i) => (
                      <div key={i} className="whitespace-pre-wrap break-all text-green-400">
                        {log}
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manage Groups Modal */}
      {showGroupsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Manage Groups</h2>
              <button
                onClick={() => setShowGroupsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Create New Group */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Create New Group</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    placeholder="e.g., Backend Services"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newGroup.color}
                    onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleCreateGroup}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create Group
                </button>
              </div>
            </div>

            {/* Existing Groups */}
            <div>
              <h3 className="font-semibold mb-3">Existing Groups ({groups.length})</h3>
              {groups.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No groups created yet</p>
              ) : (
                <div className="space-y-2">
                  {groups.map(group => (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: group.color || '#3B82F6' }}
                        />
                        <div>
                          <p className="font-medium">{group.name}</p>
                          {group.description && (
                            <p className="text-sm text-gray-500">{group.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {group.serviceIds.length} service{group.serviceIds.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Groups Modal */}
      {showAssignGroupModal && selectedServiceForGroups && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Assign to Groups</h2>
              <button
                onClick={() => {
                  setShowAssignGroupModal(false)
                  setSelectedServiceForGroups(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Service: <span className="font-semibold">{selectedServiceForGroups.name}</span>
            </p>

            {groups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-3">No groups available</p>
                <button
                  onClick={() => {
                    setShowAssignGroupModal(false)
                    setShowGroupsModal(true)
                  }}
                  className="text-purple-600 hover:underline"
                >
                  Create a group first
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map(group => {
                  const isInGroup = group.serviceIds.includes(selectedServiceForGroups.id)
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleToggleServiceGroup(group.id, selectedServiceForGroups.id, isInGroup)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                        isInGroup
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: group.color || '#3B82F6' }}
                        />
                        <span className="font-medium">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isInGroup && (
                          <CheckSquare size={20} className="text-purple-600" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Confirm Stop All Dialog */}
      <ConfirmDialog
        isOpen={confirmStopAll}
        onClose={() => setConfirmStopAll(false)}
        onConfirm={handleStopAll}
        title="Stop All Services"
        message={`Are you sure you want to stop all running services ${
          selectedGroup === 'all'
            ? 'in all groups'
            : `in group "${selectedGroup}"`
        }? This will stop ${
          services
            .filter(service => {
              if (selectedGroup !== 'all' && !service.tags?.includes(selectedGroup)) return false
              if (searchTerm.trim()) {
                const search = searchTerm.toLowerCase()
                return (
                  service.name.toLowerCase().includes(search) ||
                  service.repoPath.toLowerCase().includes(search) ||
                  service.command.toLowerCase().includes(search)
                )
              }
              return true
            })
            .filter(s => s.status === 'running').length
        } service(s).`}
        confirmText="Stop All"
        variant="danger"
      />
    </div>
  )
}
