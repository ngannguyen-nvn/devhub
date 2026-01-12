import { useEffect, useState } from 'react'
import { Play, Square, Trash2, Plus, Terminal, RefreshCw, FolderInput, CheckSquare, Square as SquareIcon, Search, Tags, AlertCircle, Pencil } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { SkeletonLoader } from './Loading'
import ConfirmDialog from './ConfirmDialog'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { ServiceStatusBadge } from './ui/StatusBadge'
import { EmptyState, EmptyServices } from './ui/EmptyState'
import { Button, IconButton } from './ui/Button'
import { Modal } from './ui/Modal'

declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string
    directory?: string
  }
}

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

  // Edit service state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    repoPath: '',
    command: '',
    port: '',
  })

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

  const openEditModal = (service: Service) => {
    setEditingService(service)
    setEditForm({
      name: service.name,
      repoPath: service.repoPath,
      command: service.command,
      port: service.port?.toString() || '',
    })
    setShowEditModal(true)
  }

  const handleEditService = async () => {
    if (!editingService) return

    try {
      await axios.put(`/api/services/${editingService.id}`, {
        name: editForm.name,
        repoPath: editForm.repoPath,
        command: editForm.command,
        port: editForm.port ? parseInt(editForm.port) : undefined,
      })
      setShowEditModal(false)
      setEditingService(null)
      setEditForm({ name: '', repoPath: '', command: '', port: '' })
      fetchServices()
      toast.success(`Service "${editForm.name}" updated successfully`)
    } catch (error) {
      console.error('Error updating service:', error)
      toast.error('Failed to update service')
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

  const handleOpenTerminal = async (id: string) => {
    try {
      const service = services.find(s => s.id === id)
      await axios.post(`/api/services/${id}/terminal`)
      toast.success(`Opened "${service?.name || 'Unknown'}" in terminal`)
    } catch (error: any) {
      console.error('Error opening terminal:', error)
      toast.error(error.response?.data?.error || 'Failed to open terminal')
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
    <div className="h-full flex flex-col p-8">
      {!activeWorkspace && (
        <div className="mb-6 p-4 bg-[hsla(var(--warning),0.1)] border border-[hsla(var(--warning),0.3)] rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0" />
            <div>
              <p className="text-sm text-[hsl(var(--foreground))]">
                <strong className="font-medium">No active workspace.</strong>{' '}
                <span className="text-[hsl(var(--foreground-muted))]">Please create or activate a workspace to manage services.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-1">Service Manager</h1>
          <p className="text-[hsl(var(--foreground-muted))] text-sm">
            Start, stop, and monitor your services
            {activeWorkspace && <span className="text-[hsl(var(--primary))] font-medium ml-1">in {activeWorkspace.name}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={fetchServices}
            disabled={loading}
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
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
            icon={<Square size={16} />}
          >
            Stop All
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowGroupsModal(true)}
            disabled={!activeWorkspace}
            icon={<Tags size={16} />}
          >
            Groups
          </Button>
          <Button
            variant="outline"
            onClick={openImportModal}
            disabled={!activeWorkspace}
            icon={<FolderInput size={16} />}
          >
            Import
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            icon={<Plus size={16} />}
          >
            Add Service
          </Button>
        </div>
      </div>

      {/* Add Service Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Add New Service"
        size="md"
      >
        <div className="p-6" data-testid="service-create-form">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Service Name
              </label>
              <input
                type="text"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g., Auth Service"
                className="input-field"
                data-testid="service-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Repository Path
              </label>
              <input
                type="text"
                value={newService.repoPath}
                onChange={(e) => setNewService({ ...newService, repoPath: e.target.value })}
                placeholder="/home/user/my-service"
                className="input-field terminal-text"
                data-testid="service-repoPath-input"
              />
              <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">Enter the absolute path to your service directory</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Start Command
              </label>
              <input
                type="text"
                value={newService.command}
                onChange={(e) => setNewService({ ...newService, command: e.target.value })}
                placeholder="npm start"
                className="input-field terminal-text"
                data-testid="service-command-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Port (optional)
              </label>
              <input
                type="number"
                value={newService.port}
                onChange={(e) => setNewService({ ...newService, port: e.target.value })}
                placeholder="3000"
                className="input-field"
                data-testid="service-port-input"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAddForm(false)}
              className="flex-1"
              data-testid="service-cancel-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddService}
              disabled={!newService.name || !newService.repoPath || !newService.command}
              className="flex-1"
              data-testid="service-create-button"
            >
              Add Service
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import from Workspace Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setSelectedRepos(new Set())
        }}
        title="Import Services from Workspace"
        description={`Select repositories from ${activeWorkspace?.name} to import as services. Service details will be auto-detected from package.json and .env files.`}
        size="lg"
      >
        <div className="p-6" data-testid="service-import-form">
          {workspaceRepos.length === 0 ? (
            <EmptyState
              icon={<FolderInput size={48} className="text-[hsl(var(--foreground-muted))]" />}
              title="No repositories found"
              description="Add repositories by creating a snapshot from the Dashboard."
            />
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
                  className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-glow))] font-medium text-sm flex items-center gap-2 transition-colors"
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
                <span className="text-sm text-[hsl(var(--foreground-muted))]">
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
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'border-[hsl(var(--primary))] bg-[hsla(var(--primary),0.08)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--background-elevated))]'
                      }`}
                      data-testid={`service-import-repo-${repo.path.replace(/\//g, '-')}`}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected ? (
                          <CheckSquare size={20} className="text-[hsl(var(--primary))] flex-shrink-0" />
                        ) : (
                          <SquareIcon size={20} className="text-[hsl(var(--foreground-muted))] flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[hsl(var(--foreground))]">{repo.name}</p>
                            {alreadyExists && (
                              <span className="px-2 py-0.5 bg-[hsl(var(--border))] text-[hsl(var(--foreground-muted))] text-xs rounded-full">
                                Already added
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[hsl(var(--foreground-muted))] truncate terminal-text">{repo.path}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false)
                setSelectedRepos(new Set())
              }}
              disabled={importing}
              className="flex-1"
              data-testid="service-import-cancel-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportFromWorkspace}
              disabled={importing || selectedRepos.size === 0}
              loading={importing}
              icon={!importing ? <FolderInput size={18} /> : undefined}
              className="flex-1"
              data-testid="service-import-confirm-button"
            >
              {importing ? 'Importing...' : `Import ${selectedRepos.size} Service${selectedRepos.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group Filter Tabs & Search Bar */}
      {services.length > 0 && (
        <div className="mb-6 space-y-4">
          {/* Group Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedGroup === 'all'
                  ? 'btn-glow text-[hsl(var(--background))]'
                  : 'bg-[hsl(var(--border))] text-[hsl(var(--foreground-muted))] hover:bg-[hsla(var(--primary),0.1)] hover:text-[hsl(var(--foreground))]'
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
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                    selectedGroup === group.name
                      ? 'text-white'
                      : 'bg-[hsl(var(--border))] text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background-elevated))]'
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--foreground-muted))]" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services by name, path, command, or port..."
              className="input-field pl-10"
              data-testid="service-search-input"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-[hsl(var(--foreground-muted))]">
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
            <EmptyServices
              onAddService={() => setShowAddForm(true)}
              onImportFromWorkspace={openImportModal}
            />
          )}

          {filteredServices.length === 0 && services.length > 0 && !loading && (
            <EmptyState
              title="No services match your search"
              description="Try adjusting your search or filters"
              action={{ label: 'Clear search', onClick: () => setSearchTerm('') }}
            />
          )}

          {filteredServices.map((service) => {
            const isRunning = service.status === 'running'

            return (
              <div
                key={service.id}
                className="glass-card rounded-xl p-4 card-hover"
                data-testid={`service-item-${service.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] truncate">{service.name}</h3>
                      <ServiceStatusBadge status={service.status} healthStatus={service.healthStatus as 'healthy' | 'unhealthy' | 'unknown' | null} />
                      {service.tags && service.tags.length > 0 && (
                        <div className="flex gap-1">
                          {service.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-[hsla(var(--primary),0.1)] text-[hsl(var(--primary))] text-xs rounded-lg">
                              {tag}
                            </span>
                          ))}
                          {service.tags.length > 2 && (
                            <span className="px-1.5 py-0.5 bg-[hsl(var(--border))] text-[hsl(var(--foreground-muted))] text-xs rounded-lg">
                              +{service.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(var(--foreground-muted))] font-mono terminal-text truncate">{service.command}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[hsl(var(--foreground-muted))] mb-3 terminal-text">
                  <span className="truncate max-w-full">{service.repoPath}</span>
                  {service.port && <span>Port: {service.port}</span>}
                  {service.pid && <span>PID: {service.pid}</span>}
                  {!isRunning && service.exitCode !== undefined && (
                    <span className={service.exitCode === 0 ? '' : 'text-[hsl(var(--danger))]'}>
                      Exit: {service.exitCode}
                    </span>
                  )}
                  {service.stoppedAt && (
                    <span>Stopped: {new Date(service.stoppedAt).toLocaleTimeString()}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {isRunning ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStopService(service.id)
                      }}
                      className="flex-1"
                      data-testid={`service-stop-button-${service.id}`}
                      icon={<Square size={14} />}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartService(service.id)
                      }}
                      className="flex-1"
                      data-testid={`service-start-button-${service.id}`}
                      icon={<Play size={14} />}
                    >
                      Start
                    </Button>
                  )}
                  <IconButton
                    variant="secondary"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenTerminal(service.id)
                    }}
                    icon={<Terminal size={16} />}
                    title="Open in terminal"
                    data-testid={`service-terminal-button-${service.id}`}
                  />
                  <IconButton
                    variant="secondary"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(service)
                    }}
                    icon={<Pencil size={16} />}
                    title="Edit service"
                    data-testid={`service-edit-button-${service.id}`}
                  />
                  <IconButton
                    variant="secondary"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedServiceForGroups(service)
                      setShowAssignGroupModal(true)
                    }}
                    icon={<Tags size={16} />}
                    title="Assign to groups"
                  />
                  <IconButton
                    variant="ghost"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteService(service.id)
                    }}
                    icon={<Trash2 size={16} />}
                    title="Delete"
                    data-testid={`service-delete-button-${service.id}`}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabbed Logs Viewer */}
        <div className="glass-card rounded-xl overflow-hidden flex flex-col scanlines" data-testid="service-logs-viewer">
          {/* Header with title and controls */}
          <div className="flex items-center justify-between p-4 pb-0">
            <div className="flex items-center gap-3">
              <h3 className="text-[hsl(var(--foreground))] font-semibold">Service Logs</h3>
              <span className="text-[hsl(var(--foreground-muted))] text-xs terminal-text">
                ({services.filter(s => s.status === 'running').length} services running)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCentralLogs(!showCentralLogs)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  showCentralLogs
                    ? 'bg-[hsl(var(--success))] text-[hsl(var(--background))]'
                    : 'bg-[hsl(var(--border))] text-[hsl(var(--foreground-muted))]'
                }`}
              >
                {showCentralLogs ? 'Live' : 'Paused'}
              </button>
              <button
                onClick={() => activeLogTab === 'all' ? fetchAllLogs() : fetchSingleServiceLogs(activeLogTab)}
                className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--primary))] transition-colors"
                data-testid="service-logs-refresh-button"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-[hsl(var(--border))] overflow-x-auto">
            <button
              onClick={() => setActiveLogTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeLogTab === 'all'
                  ? 'bg-[hsl(var(--background))] text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))]/50'
              }`}
            >
              All Services
            </button>
            {services.filter(s => s.status === 'running').map(service => (
              <button
                key={service.id}
                onClick={() => setActiveLogTab(service.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  activeLogTab === service.id
                    ? 'bg-[hsl(var(--background))] text-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))]/50'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>

          {/* Log Content */}
          <div className="p-4 flex-1 overflow-hidden flex flex-col bg-[hsl(var(--background))]">
            {services.filter(s => s.status === 'running').length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[hsl(var(--foreground-muted))]">
                No services are currently running
              </div>
            ) : (
              <div className="flex-1 overflow-auto font-mono text-xs space-y-1 terminal-text" data-testid="service-logs-content">
                {activeLogTab === 'all' ? (
                  // Show all services logs with prefix
                  allLogs.length === 0 ? (
                    <p className="text-[hsl(var(--foreground-muted))]">Waiting for logs...</p>
                  ) : (
                    allLogs.map((logEntry, i) => (
                      <div key={i} className="whitespace-pre-wrap break-all">
                        <span className="text-[hsl(var(--info))] font-semibold">[{logEntry.serviceName}]</span>{' '}
                        <span className="text-[hsl(var(--success))]">{logEntry.log}</span>
                      </div>
                    ))
                  )
                ) : (
                  // Show single service logs without prefix
                  singleServiceLogs.length === 0 ? (
                    <p className="text-[hsl(var(--foreground-muted))]">No logs available</p>
                  ) : (
                    singleServiceLogs.map((log, i) => (
                      <div key={i} className="whitespace-pre-wrap break-all text-[hsl(var(--success))]">
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
      <Modal
        isOpen={showGroupsModal}
        onClose={() => setShowGroupsModal(false)}
        title="Manage Groups"
        size="lg"
      >
        <div className="p-6">
          {/* Create New Group */}
          <div className="mb-6 p-4 bg-[hsl(var(--background-elevated))] rounded-xl border border-[hsl(var(--border))]">
            <h3 className="font-semibold mb-3 text-[hsl(var(--foreground))]">Create New Group</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Backend Services"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Optional description"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newGroup.color}
                  onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                  className="h-10 w-20 rounded-lg cursor-pointer bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                />
              </div>
              <Button
                onClick={handleCreateGroup}
                fullWidth
              >
                Create Group
              </Button>
            </div>
          </div>

          {/* Existing Groups */}
          <div>
            <h3 className="font-semibold mb-3 text-[hsl(var(--foreground))]">Existing Groups ({groups.length})</h3>
            {groups.length === 0 ? (
              <p className="text-[hsl(var(--foreground-muted))] text-center py-8">No groups created yet</p>
            ) : (
              <div className="space-y-2">
                {groups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-[hsl(var(--background-elevated))] rounded-xl border border-[hsl(var(--border))]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: group.color || '#3B82F6' }}
                      />
                      <div>
                        <p className="font-medium text-[hsl(var(--foreground))]">{group.name}</p>
                        {group.description && (
                          <p className="text-sm text-[hsl(var(--foreground-muted))]">{group.description}</p>
                        )}
                        <p className="text-xs text-[hsl(var(--foreground-muted))]">
                          {group.serviceIds.length} service{group.serviceIds.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="text-[hsl(var(--danger))] hover:bg-[hsla(var(--danger),0.1)]"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Assign Groups Modal */}
      <Modal
        isOpen={showAssignGroupModal && !!selectedServiceForGroups}
        onClose={() => {
          setShowAssignGroupModal(false)
          setSelectedServiceForGroups(null)
        }}
        title="Assign to Groups"
        description={selectedServiceForGroups ? `Service: ${selectedServiceForGroups.name}` : ''}
        size="sm"
      >
        <div className="p-6">
          {groups.length === 0 ? (
            <EmptyState
              title="No groups available"
              action={{
                label: 'Create a group first',
                onClick: () => {
                  setShowAssignGroupModal(false)
                  setShowGroupsModal(true)
                },
              }}
            />
          ) : (
            <div className="space-y-2">
              {groups.map(group => {
                const isInGroup = selectedServiceForGroups ? group.serviceIds.includes(selectedServiceForGroups.id) : false
                return (
                  <button
                    key={group.id}
                    onClick={() => selectedServiceForGroups && handleToggleServiceGroup(group.id, selectedServiceForGroups.id, isInGroup)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      isInGroup
                        ? 'border-[hsl(var(--primary))] bg-[hsla(var(--primary),0.08)]'
                        : 'border-[hsl(var(--border))] hover:border-[hsla(var(--primary),0.3)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: group.color || '#3B82F6' }}
                      />
                      <span className="font-medium text-[hsl(var(--foreground))]">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isInGroup && (
                        <CheckSquare size={20} className="text-[hsl(var(--primary))]" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingService(null)
          setEditForm({ name: '', repoPath: '', command: '', port: '' })
        }}
        title="Edit Service"
        size="md"
      >
        <div className="p-6" data-testid="service-edit-form">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Service Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Auth Service"
                className="input-field"
                data-testid="service-edit-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Repository Path
              </label>
              <input
                type="text"
                value={editForm.repoPath}
                onChange={(e) => setEditForm({ ...editForm, repoPath: e.target.value })}
                placeholder="/home/user/my-service"
                className="input-field terminal-text"
                data-testid="service-edit-repoPath-input"
              />
              <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">Enter the absolute path to your service directory</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Start Command
              </label>
              <input
                type="text"
                value={editForm.command}
                onChange={(e) => setEditForm({ ...editForm, command: e.target.value })}
                placeholder="npm start"
                className="input-field terminal-text"
                data-testid="service-edit-command-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Port (optional)
              </label>
              <input
                type="number"
                value={editForm.port}
                onChange={(e) => setEditForm({ ...editForm, port: e.target.value })}
                placeholder="3000"
                className="input-field"
                data-testid="service-edit-port-input"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false)
                setEditingService(null)
                setEditForm({ name: '', repoPath: '', command: '', port: '' })
              }}
              className="flex-1"
              data-testid="service-edit-cancel-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditService}
              disabled={!editForm.name || !editForm.repoPath || !editForm.command}
              className="flex-1"
              data-testid="service-edit-save-button"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

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
