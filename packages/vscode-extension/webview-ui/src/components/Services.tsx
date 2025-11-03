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
import { serviceApi, repoApi, groupApi, workspaceApi } from '../messaging/vscodeApi'
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

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [workspaceRepos, setWorkspaceRepos] = useState<Array<{path: string, name: string}>>([])
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  // Groups
  const [groups, setGroups] = useState<Group[]>([])
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  useEffect(() => {
    fetchServices()
    fetchGroups()
    const interval = setInterval(fetchServices, 5000)
    return () => clearInterval(interval)
  }, [])

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

  const fetchServices = async () => {
    try {
      const [allServices, running] = await Promise.all([
        serviceApi.getAll(),
        serviceApi.getRunning()
      ])

      const allServicesArray = Array.isArray(allServices) ? allServices : []
      const runningArray = Array.isArray(running) ? running : []

      // Merge status from running services
      const servicesWithStatus = allServicesArray.map((s: Service) => ({
        ...s,
        status: runningArray.find((r: Service) => r.id === s.id) ? 'running' : 'stopped'
      }))

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
      // Fetch full state after a brief delay to allow process to fully start
      setTimeout(() => fetchServices(), 500)
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
      // Fetch full state after a brief delay to allow process to fully stop
      setTimeout(() => fetchServices(), 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop service')
      // Revert on error
      fetchServices()
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

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

  const handleStopAll = async () => {
    if (!confirm('Stop all running services?')) return

    setLoading(true)
    const runningServices = services.filter(s => s.status === 'running')

    for (const service of runningServices) {
      try {
        await serviceApi.stop(service.id)
      } catch (err) {
        console.error(`Failed to stop ${service.name}:`, err)
      }
    }

    await fetchServices()
    setLoading(false)
  }

  const handleOpenImportModal = async () => {
    try {
      // Get active workspace
      const workspace = await workspaceApi.getActive()

      // Get snapshots to extract repos
      const snapshots = await workspaceApi.getSnapshots(workspace.id)

      // Extract unique repos from all snapshots
      const reposMap = new Map()
      snapshots.forEach((snapshot: any) => {
        const config = typeof snapshot.config === 'string' ? JSON.parse(snapshot.config) : snapshot.config
        if (config.repositories) {
          config.repositories.forEach((repo: any) => {
            if (!reposMap.has(repo.path)) {
              reposMap.set(repo.path, {
                path: repo.path,
                name: repo.path.split('/').pop() || repo.path
              })
            }
          })
        }
      })

      setWorkspaceRepos(Array.from(reposMap.values()))
      setShowImportModal(true)
    } catch (err) {
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

      // Analyze repos
      const analyses = await repoApi.analyzeBatch(selectedRepoPaths)

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
    if (!newGroupName.trim()) {
      setError('Group name is required')
      return
    }

    try {
      await groupApi.create({ name: newGroupName, description: '', color: '#3B82F6' })
      setNewGroupName('')
      await fetchGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group?')) return

    try {
      await groupApi.delete(groupId)
      await fetchGroups()
      await fetchServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group')
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

      {/* Services Grid */}
      <div className="services-grid">
        <div className="services-list">
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <p>No services yet. Create your first service to get started.</p>
            </div>
          ) : (
            filteredServices.map(service => (
              <div
                key={service.id}
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

        {/* Service Logs Panel */}
        <div className="logs-panel">
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

            <div className="group-form">
              <input
                type="text"
                placeholder="New group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button className="btn-primary" onClick={handleCreateGroup}>
                Create Group
              </button>
            </div>

            <div className="groups-list">
              {groups.length === 0 ? (
                <p>No groups yet</p>
              ) : (
                groups.map(group => (
                  <div key={group.id} className="group-item">
                    <div>
                      <strong>{group.name}</strong>
                      <span className="group-count"> ({group.serviceIds.length} services)</span>
                    </div>
                    <button
                      className="btn-danger-small"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))
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
    </div>
  )
}
