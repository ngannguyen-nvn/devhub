/**
 * Services Component - Full Implementation
 *
 * Features:
 * - Service list with search and group filtering
 * - Create/start/stop/delete services
 * - Import services from workspace repos
 * - Central logs view (all services)
 * - Individual service logs
 * - Service groups management
 * - Real-time status updates
 */

import { useState, useEffect } from 'react'
import { serviceApi, repoApi, groupApi, workspaceApi, vscode } from '../messaging/vscodeApi'
import '../styles/Services.css'

interface Service {
  id: string
  name: string
  repoPath: string
  command: string
  port?: number
  status?: 'running' | 'stopped' | 'error'
  pid?: number
  startedAt?: string
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown'
  tags?: string[]
}

interface Group {
  id: string
  name: string
  description?: string
  color?: string
  serviceIds: string[]
}

interface ServicesProps {
  initialSelectedServiceId?: string
}

export default function Services({ initialSelectedServiceId }: ServicesProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resizable layout state
  const [leftWidth, setLeftWidth] = useState(60) // percentage
  const [isDragging, setIsDragging] = useState(false)

  // Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    repoPath: '',
    command: '',
    port: ''
  })

  // Logs state
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [showCentralLogs, setShowCentralLogs] = useState(false)
  const [allLogs, setAllLogs] = useState<Array<{serviceId: string, serviceName: string, log: string}>>([])

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    type: 'service' | 'group' | 'stopAll'
    id?: string
    message: string
  }>({ show: false, type: 'service', message: '' })

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [workspaceRepos, setWorkspaceRepos] = useState<Array<{path: string, name: string}>>([])
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  // Groups
  const [groups, setGroups] = useState<Group[]>([])
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
    port: ''
  })

  useEffect(() => {
    console.log('[Services] Component mounted')
    fetchServices()
    fetchGroups()
    const interval = setInterval(fetchServices, 5000)

    // Listen for workspace changes
    const handleWorkspaceChanged = () => {
      console.log('[Services] Workspace changed, refreshing...')
      fetchServices()
      fetchGroups()
      setSelectedService(null)
      setLogs([])
    }

    window.addEventListener('workspace-changed', handleWorkspaceChanged)

    return () => {
      console.log('[Services] Component unmounting')
      clearInterval(interval)
      window.removeEventListener('workspace-changed', handleWorkspaceChanged)
    }
  }, [])

  // Handle initial selected service from tree view navigation
  useEffect(() => {
    if (initialSelectedServiceId) {
      setSelectedService(initialSelectedServiceId)

      // Scroll to the selected service after a short delay to ensure DOM is updated
      setTimeout(() => {
        const serviceElement = document.querySelector(`[data-service-id="${initialSelectedServiceId}"]`)
        if (serviceElement) {
          serviceElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [initialSelectedServiceId])

  useEffect(() => {
    if (selectedService) {
      fetchLogs(selectedService)
      const interval = setInterval(() => fetchLogs(selectedService), 3000)
      return () => clearInterval(interval)
    }
  }, [selectedService])

  useEffect(() => {
    if (showCentralLogs) {
      fetchAllLogs()
      const interval = setInterval(fetchAllLogs, 3000)
      return () => clearInterval(interval)
    }
  }, [showCentralLogs, services])

  // Resize handlers
  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    const containerWidth = window.innerWidth - 40 // Account for padding
    const newWidth = (e.clientX / containerWidth) * 100
    if (newWidth >= 30 && newWidth <= 70) { // Min 30%, max 70%
      setLeftWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const fetchServices = async () => {
    try {
      console.log('[Services] Fetching services...')
      const [allServices, running] = await Promise.all([
        serviceApi.getAll(),
        serviceApi.getRunning()
      ])

      const allServicesArray = Array.isArray(allServices) ? allServices : []
      const runningArray = Array.isArray(running) ? running : []

      console.log('[Services] Fetched', allServicesArray.length, 'services')

      // Merge status from running services
      const servicesWithStatus = allServicesArray.map((s: Service) => ({
        ...s,
        status: runningArray.find((r: Service) => r.id === s.id) ? 'running' : 'stopped'
      }))

      // Sort by name alphabetically
      servicesWithStatus.sort((a, b) => a.name.localeCompare(b.name))

      setServices(servicesWithStatus)
      setError(null)
    } catch (err) {
      console.error('[Services] Error fetching:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch services')
    }
  }

  const fetchLogs = async (serviceId: string) => {
    try {
      const logs = await serviceApi.getLogs(serviceId)
      setLogs(logs || [])
    } catch (err) {
      console.error('[Services] Error fetching logs:', err)
    }
  }

  const fetchAllLogs = async () => {
    const runningServices = services.filter(s => s.status === 'running')
    if (runningServices.length === 0) {
      setAllLogs([])
      return
    }

    try {
      const logsPromises = runningServices.map(async (service) => {
        try {
          const logs = await serviceApi.getLogs(service.id)
          return logs.map((log: string) => ({
            serviceId: service.id,
            serviceName: service.name,
            log
          }))
        } catch {
          return []
        }
      })

      const logsArrays = await Promise.all(logsPromises)
      setAllLogs(logsArrays.flat())
    } catch (err) {
      console.error('[Services] Error fetching all logs:', err)
    }
  }

  const fetchGroups = async () => {
    try {
      const groups = await groupApi.getAll()
      setGroups(groups)
    } catch (err) {
      console.error('[Services] Error fetching groups:', err)
    }
  }

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await serviceApi.create({
        name: formData.name,
        repoPath: formData.repoPath,
        command: formData.command,
        port: formData.port ? parseInt(formData.port) : undefined
      })
      await fetchServices()
      setShowAddForm(false)
      setFormData({ name: '', repoPath: '', command: '', port: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service')
    } finally {
      setLoading(false)
    }
  }

  const handleStartService = async (serviceId: string) => {
    try {
      await serviceApi.start(serviceId)
      // Immediately update UI optimistically
      setServices(prev => prev.map(s =>
        s.id === serviceId ? { ...s, status: 'running' as const } : s
      ))
      setSelectedService(serviceId)
      // Auto-refresh will pick up the actual state in next cycle
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start service')
      // Revert on error
      fetchServices()
    }
  }

  const handleStopService = async (serviceId: string) => {
    try {
      await serviceApi.stop(serviceId)
      // Immediately update UI optimistically
      setServices(prev => prev.map(s =>
        s.id === serviceId ? { ...s, status: 'stopped' as const, pid: undefined } : s
      ))
      if (selectedService === serviceId) {
        setSelectedService(null)
        setLogs([])
      }
      // Auto-refresh will pick up the actual state in next cycle
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop service')
      // Revert on error
      fetchServices()
    }
  }

  const handleOpenTerminal = async (serviceId: string) => {
    try {
      await serviceApi.openTerminal(serviceId)
      // Terminal will open visibly, no need for success message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open terminal')
    }
  }

  const handleDeleteService = (serviceId: string) => {
    setConfirmModal({
      show: true,
      type: 'service',
      id: serviceId,
      message: 'Are you sure you want to delete this service?'
    })
  }

  const handleDeleteServiceConfirmed = async (serviceId: string) => {
    setLoading(true)
    try {
      await serviceApi.delete(serviceId)
      await fetchServices()
      if (selectedService === serviceId) {
        setSelectedService(null)
        setLogs([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service')
    } finally {
      setLoading(false)
    }
  }

  const handleStopAll = () => {
    const runningServices = services.filter(s => s.status === 'running')

    if (runningServices.length === 0) {
      return
    }

    setConfirmModal({
      show: true,
      type: 'stopAll',
      message: `Stop all ${runningServices.length} running services?`
    })
  }

  const handleStopAllConfirmed = async () => {
    setLoading(true)
    const runningServices = services.filter(s => s.status === 'running')

    // Stop all services
    await Promise.all(
      runningServices.map(service =>
        serviceApi.stop(service.id).catch(err => {
          console.error(`Failed to stop ${service.name}:`, err)
        })
      )
    )

    // Immediately update UI optimistically
    setServices(prev => prev.map(s =>
      runningServices.find(r => r.id === s.id)
        ? { ...s, status: 'stopped' as const, pid: undefined }
        : s
    ))

    // Clear selected service if it was stopped
    if (selectedService && runningServices.find(s => s.id === selectedService)) {
      setSelectedService(null)
      setLogs([])
    }

    setLoading(false)
  }

  const handleOpenImportModal = async () => {
    console.log('[Services] ========== handleOpenImportModal CALLED ==========')
    try {
      // Get active workspace
      const workspace = await workspaceApi.getActive()
      console.log('[Services] Active workspace:', workspace)

      // Get existing services to filter out repos that are already services
      const existingServices = await serviceApi.getAll()
      const existingRepoPaths = new Set(existingServices.map((s: any) => s.repoPath))
      console.log('[Services] Existing service repo paths:', existingRepoPaths.size)

      // Get snapshots to extract repos
      const snapshots = await workspaceApi.getSnapshots(workspace.id)
      console.log('[Services] Snapshots:', snapshots)

      // Extract unique repos from all snapshots
      const reposMap = new Map()
      snapshots.forEach((snapshot: any) => {
        console.log('[Services] Processing snapshot:', snapshot.id)

        // Repositories could be at snapshot.repositories (top-level) or snapshot.config.repositories
        const repositories = snapshot.repositories ||
          (snapshot.config && typeof snapshot.config === 'string'
            ? JSON.parse(snapshot.config).repositories
            : snapshot.config?.repositories)

        console.log('[Services] Found repositories:', repositories?.length || 0)

        if (repositories && Array.isArray(repositories)) {
          repositories.forEach((repo: any) => {
            // Only add repos that don't already have services
            if (!reposMap.has(repo.path) && !existingRepoPaths.has(repo.path)) {
              reposMap.set(repo.path, {
                path: repo.path,
                name: repo.path.split('/').pop() || repo.path
              })
            }
          })
        }
      })

      console.log('[Services] Final repos map size:', reposMap.size)
      const reposArray = Array.from(reposMap.values())
      console.log('[Services] Repos array:', reposArray)
      setWorkspaceRepos(reposArray)
      setShowImportModal(true)
    } catch (err) {
      console.error('[Services] Error in handleOpenImportModal:', err)
      setError(err instanceof Error ? err.message : 'Failed to load workspace repos')
    }
  }

  const handleImportServices = async () => {
    if (selectedRepos.size === 0) {
      setError('Please select at least one repository')
      return
    }

    setImporting(true)
    try {
      const selectedRepoPaths = Array.from(selectedRepos)

      // Get existing services to avoid duplicates
      const existingServices = await serviceApi.getAll()
      const existingRepoPaths = new Set(existingServices.map((s: any) => s.repoPath))

      // Filter out repos that already have services
      const newRepoPaths = selectedRepoPaths.filter(path => !existingRepoPaths.has(path))

      if (newRepoPaths.length === 0) {
        setError('All selected repositories already have services')
        setImporting(false)
        return
      }

      // Analyze repos
      const analyses = await repoApi.analyzeBatch(newRepoPaths)

      // Create services from successful analyses
      const successfulAnalyses = analyses.filter((a: any) => a.success)
      const servicesToCreate = successfulAnalyses.map((result: any) => ({
        name: result.analysis.name,
        repoPath: result.repoPath,
        command: result.analysis.command || 'npm start',
        port: result.analysis.port || undefined
      }))

      if (servicesToCreate.length > 0) {
        await serviceApi.batchCreate(servicesToCreate)
      }

      setShowImportModal(false)
      setSelectedRepos(new Set())
      await fetchServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import services')
    } finally {
      setImporting(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      setError('Group name is required')
      return
    }

    try {
      await groupApi.create({
        name: newGroup.name,
        description: newGroup.description,
        color: newGroup.color
      })
      setNewGroup({ name: '', description: '', color: '#3B82F6' })
      await fetchGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    }
  }

  const handleDeleteGroup = (groupId: string) => {
    setConfirmModal({
      show: true,
      type: 'group',
      id: groupId,
      message: 'Delete this group?'
    })
  }

  const handleDeleteGroupConfirmed = async (groupId: string) => {
    try {
      await groupApi.delete(groupId)
      await fetchGroups()
      await fetchServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group')
    }
  }

  const handleToggleServiceGroup = async (groupId: string, serviceId: string, isCurrentlyIn: boolean) => {
    try {
      if (isCurrentlyIn) {
        await groupApi.removeService(groupId, serviceId)
      } else {
        await groupApi.addService(groupId, serviceId)
      }
      await fetchGroups()
      await fetchServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service group')
    }
  }

  const openEditModal = (service: Service) => {
    setEditingService(service)
    setEditForm({
      name: service.name,
      repoPath: service.repoPath,
      command: service.command,
      port: service.port?.toString() || ''
    })
    setShowEditModal(true)
  }

  const handleEditService = async () => {
    if (!editingService) return
    setLoading(true)
    try {
      await serviceApi.update(editingService.id, {
        name: editForm.name,
        repoPath: editForm.repoPath,
        command: editForm.command,
        port: editForm.port ? parseInt(editForm.port) : undefined
      })
      setShowEditModal(false)
      setEditingService(null)
      setEditForm({ name: '', repoPath: '', command: '', port: '' })
      await fetchServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service')
    } finally {
      setLoading(false)
    }
  }

  // Filter services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGroup = selectedGroup === 'all' ||
      groups.find(g => g.id === selectedGroup)?.serviceIds.includes(service.id)
    return matchesSearch && matchesGroup
  })

  const isRunning = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.status === 'running'
  }

  return (
    <div className="services">
      <div className="services-header">
        <h2>Services ({services.length})</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowGroupsModal(true)}>
            Manage Groups
          </button>
          <button className="btn-secondary" onClick={handleOpenImportModal}>
            Import from Workspace
          </button>
          <button className="btn-secondary" onClick={handleStopAll} disabled={loading}>
            Stop All
          </button>
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)} disabled={loading}>
            {showAddForm ? 'Cancel' : '+ New Service'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="services-filters">
        <input
          type="text"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="group-filter"
        >
          <option value="all">All Groups</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
        <button
          className="btn-secondary"
          onClick={() => setShowCentralLogs(!showCentralLogs)}
        >
          {showCentralLogs ? 'Hide' : 'Show'} Central Logs
        </button>
      </div>

      {/* Add Service Form */}
      {showAddForm && (
        <div className="service-form">
          <h3>Create New Service</h3>
          <form onSubmit={handleCreateService}>
            <div className="form-group">
              <label>Service Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., API Server"
                required
              />
            </div>
            <div className="form-group">
              <label>Repository Path</label>
              <input
                type="text"
                value={formData.repoPath}
                onChange={(e) => setFormData({ ...formData, repoPath: e.target.value })}
                placeholder="/path/to/repo"
                required
              />
            </div>
            <div className="form-group">
              <label>Start Command</label>
              <input
                type="text"
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                placeholder="npm start"
                required
              />
            </div>
            <div className="form-group">
              <label>Port (optional)</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="3000"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                Create Service
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Central Logs */}
      {showCentralLogs && (
        <div className="central-logs">
          <div className="logs-header">
            <h3>Central Logs (All Running Services)</h3>
            <button onClick={() => setAllLogs([])}>Clear</button>
          </div>
          <div className="logs-content">
            {allLogs.length === 0 ? (
              <p className="logs-empty">No logs yet...</p>
            ) : (
              allLogs.map((log, index) => (
                <div key={index} className="log-line">
                  <span className="log-service">[{log.serviceName}]</span>
                  <span>{log.log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Services Grid - Resizable */}
      <div className="services-grid-resizable">
        <div className="services-list" style={{ width: `${leftWidth}%` }}>
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <p>No services yet. Create your first service to get started.</p>
            </div>
          ) : (
            filteredServices.map(service => (
              <div
                key={service.id}
                data-service-id={service.id}
                className={`service-card ${service.status === 'running' ? 'running' : ''} ${
                  selectedService === service.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedService(service.id)}
              >
                <div className="service-header">
                  <h3>{service.name}</h3>
                  <div className="service-status">
                    {service.status === 'running' ? (
                      <span className="status-badge running">● Running</span>
                    ) : (
                      <span className="status-badge stopped">● Stopped</span>
                    )}
                  </div>
                </div>
                <div className="service-details">
                  <div className="detail-row">
                    <span className="label">Path:</span>
                    <span className="value">{service.repoPath}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Command:</span>
                    <span className="value">{service.command}</span>
                  </div>
                  {service.port && (
                    <div className="detail-row">
                      <span className="label">Port:</span>
                      <span className="value">{service.port}</span>
                    </div>
                  )}
                  {service.pid && (
                    <div className="detail-row">
                      <span className="label">PID:</span>
                      <span className="value">{service.pid}</span>
                    </div>
                  )}
                </div>
                <div className="service-actions">
                  {service.status === 'running' ? (
                    <button
                      className="btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStopService(service.id)
                      }}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      className="btn-success"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartService(service.id)
                      }}
                    >
                      Start
                    </button>
                  )}
                  <button
                    className="btn-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenTerminal(service.id)
                    }}
                    title="Open in terminal"
                  >
                    <span className="terminal-icon">&gt;_</span>
                  </button>
                  <button
                    className="btn-tags"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedServiceForGroups(service)
                      setShowAssignGroupModal(true)
                    }}
                    title="Assign to groups"
                  >
                    🏷️
                  </button>
                  <button
                    className="btn-edit"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(service)
                    }}
                    title="Edit service"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteService(service.id)
                    }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resize Divider */}
        <div
          className={`resize-divider ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleMouseDown}
        />

        {/* Service Logs Panel */}
        <div className="logs-panel" style={{ width: `${100 - leftWidth}%` }}>
          {selectedService ? (
            <>
              <div className="logs-header">
                <h3>Logs - {services.find(s => s.id === selectedService)?.name}</h3>
                <button onClick={() => setLogs([])}>Clear</button>
              </div>
              <div className="logs-content">
                {logs.length === 0 ? (
                  <p className="logs-empty">No logs yet...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="log-line">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="logs-empty-state">
              <p>Select a service to view its logs</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import Services from Workspace</h3>
            <p>Select repositories to create services</p>

            <div className="repo-list">
              {workspaceRepos.length === 0 ? (
                <p>No repositories found in workspace snapshots</p>
              ) : (
                workspaceRepos.map(repo => (
                  <label key={repo.path} className="repo-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRepos.has(repo.path)}
                      onChange={() => {
                        const newSelected = new Set(selectedRepos)
                        if (newSelected.has(repo.path)) {
                          newSelected.delete(repo.path)
                        } else {
                          newSelected.add(repo.path)
                        }
                        setSelectedRepos(newSelected)
                      }}
                    />
                    <span>{repo.name}</span>
                    <span className="repo-path">{repo.path}</span>
                  </label>
                ))
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowImportModal(false)}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleImportServices}
                disabled={importing || selectedRepos.size === 0}
              >
                {importing ? 'Importing...' : `Import ${selectedRepos.size} Services`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups Modal */}
      {showGroupsModal && (
        <div className="modal-overlay" onClick={() => setShowGroupsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Manage Service Groups</h3>

            {/* Create New Group */}
            <div className="group-form">
              <h4>Create New Group</h4>
              <div className="group-form-field">
                <label>Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Backend Services"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>
              <div className="group-form-field">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                />
              </div>
              <div className="group-form-field">
                <label>Color</label>
                <input
                  type="color"
                  value={newGroup.color}
                  onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                />
              </div>
              <button className="btn-primary" onClick={handleCreateGroup}>
                Create Group
              </button>
            </div>

            {/* Existing Groups */}
            <div className="groups-list">
              <h4>Existing Groups ({groups.length})</h4>
              {groups.length === 0 ? (
                <p className="groups-list-empty">No groups created yet</p>
              ) : (
                <div className="groups-list-items">
                  {groups.map(group => (
                    <div key={group.id} className="group-item">
                      <div className="group-item-info">
                        <div
                          className="group-color-indicator"
                          style={{ backgroundColor: group.color || '#3B82F6' }}
                        />
                        <div className="group-item-details">
                          <div className="group-item-name">{group.name}</div>
                          {group.description && (
                            <div className="group-item-description">{group.description}</div>
                          )}
                          <div className="group-item-count">
                            {group.serviceIds.length} service{group.serviceIds.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn-danger-small"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowGroupsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Groups Modal */}
      {showAssignGroupModal && selectedServiceForGroups && (
        <div className="modal-overlay" onClick={() => {
          setShowAssignGroupModal(false)
          setSelectedServiceForGroups(null)
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign to Groups</h3>

            <p className="assign-groups-modal-subtitle">
              Service: <strong>{selectedServiceForGroups.name}</strong>
            </p>

            {groups.length === 0 ? (
              <div className="assign-groups-empty">
                <p>No groups available</p>
                <button
                  onClick={() => {
                    setShowAssignGroupModal(false)
                    setShowGroupsModal(true)
                  }}
                  className="btn-secondary"
                >
                  Create a group first
                </button>
              </div>
            ) : (
              <div className="assign-groups-list">
                {groups.map(group => {
                  const isInGroup = group.serviceIds.includes(selectedServiceForGroups.id)
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleToggleServiceGroup(group.id, selectedServiceForGroups.id, isInGroup)}
                      className={`assign-group-button ${isInGroup ? 'selected' : ''}`}
                    >
                      <div className="assign-group-button-content">
                        <div
                          className="group-color-indicator"
                          style={{ backgroundColor: group.color || '#3B82F6' }}
                        />
                        <span className="assign-group-button-name">{group.name}</span>
                      </div>
                      {isInGroup && (
                        <span className="assign-group-checkmark">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowAssignGroupModal(false)
                  setSelectedServiceForGroups(null)
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="modal-overlay" onClick={() => setConfirmModal({ show: false, type: 'service', message: '' })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Action</h3>
            <p>{confirmModal.message}</p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmModal({ show: false, type: 'service', message: '' })}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (confirmModal.type === 'service' && confirmModal.id) {
                    handleDeleteServiceConfirmed(confirmModal.id)
                  } else if (confirmModal.type === 'group' && confirmModal.id) {
                    handleDeleteGroupConfirmed(confirmModal.id)
                  } else if (confirmModal.type === 'stopAll') {
                    handleStopAllConfirmed()
                  }
                  setConfirmModal({ show: false, type: 'service', message: '' })
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditModal && editingService && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false)
          setEditingService(null)
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Service</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleEditService()
            }}>
              <div className="form-group">
                <label>Service Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g., API Server"
                  required
                />
              </div>
              <div className="form-group">
                <label>Repository Path</label>
                <input
                  type="text"
                  value={editForm.repoPath}
                  onChange={(e) => setEditForm({ ...editForm, repoPath: e.target.value })}
                  placeholder="/path/to/repo"
                  required
                />
              </div>
              <div className="form-group">
                <label>Start Command</label>
                <input
                  type="text"
                  value={editForm.command}
                  onChange={(e) => setEditForm({ ...editForm, command: e.target.value })}
                  placeholder="npm start"
                  required
                />
              </div>
              <div className="form-group">
                <label>Port (optional)</label>
                <input
                  type="number"
                  value={editForm.port}
                  onChange={(e) => setEditForm({ ...editForm, port: e.target.value })}
                  placeholder="3000"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingService(null)
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
