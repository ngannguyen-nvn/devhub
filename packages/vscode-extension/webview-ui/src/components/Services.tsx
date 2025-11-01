/**
 * Services Component
 *
 * Displays list of services with start/stop controls.
 * Adapted from web app frontend/src/components/Services.tsx
 */

import { useState, useEffect } from 'react'
import { serviceApi } from '../messaging/vscodeApi'

interface Service {
  id: string
  name: string
  repoPath: string
  command: string
  port?: number
  status?: 'running' | 'stopped' | 'error'
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [runningServices, setRunningServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for creating new service
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    repoPath: '',
    command: '',
    port: ''
  })

  // Fetch services on mount and periodically
  useEffect(() => {
    fetchServices()
    const interval = setInterval(fetchServices, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Fetch logs when service is selected
  useEffect(() => {
    if (selectedService) {
      fetchLogs(selectedService)
      const interval = setInterval(() => fetchLogs(selectedService), 3000)
      return () => clearInterval(interval)
    }
  }, [selectedService])

  const fetchServices = async () => {
    try {
      const [allServices, running] = await Promise.all([
        serviceApi.getAll(),
        serviceApi.getRunning()
      ])
      setServices(allServices)
      setRunningServices(running)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services')
    }
  }

  const fetchLogs = async (serviceId: string) => {
    try {
      const logs = await serviceApi.getLogs(serviceId)
      setLogs(logs || [])
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }

  const handleStartService = async (serviceId: string) => {
    setLoading(true)
    try {
      await serviceApi.start(serviceId)
      await fetchServices()
      setSelectedService(serviceId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start service')
    } finally {
      setLoading(false)
    }
  }

  const handleStopService = async (serviceId: string) => {
    setLoading(true)
    try {
      await serviceApi.stop(serviceId)
      await fetchServices()
      if (selectedService === serviceId) {
        setSelectedService(null)
        setLogs([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop service')
    } finally {
      setLoading(false)
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
      setShowForm(false)
      setFormData({ name: '', repoPath: '', command: '', port: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service')
    } finally {
      setLoading(false)
    }
  }

  const isRunning = (serviceId: string) => {
    return runningServices.some(s => s.id === serviceId)
  }

  return (
    <div className="services">
      <div className="services-header">
        <h2>Services ({services.length})</h2>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? 'Cancel' : '+ New Service'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showForm && (
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
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="services-grid">
        <div className="services-list">
          {services.length === 0 ? (
            <div className="empty-state">
              <p>No services yet. Create your first service to get started.</p>
            </div>
          ) : (
            services.map(service => (
              <div
                key={service.id}
                className={`service-card ${isRunning(service.id) ? 'running' : ''} ${
                  selectedService === service.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedService(service.id)}
              >
                <div className="service-header">
                  <h3>{service.name}</h3>
                  <div className="service-status">
                    {isRunning(service.id) ? (
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
                </div>
                <div className="service-actions">
                  {isRunning(service.id) ? (
                    <button
                      className="btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStopService(service.id)
                      }}
                      disabled={loading}
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
                      disabled={loading}
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

        <div className="logs-panel">
          {selectedService ? (
            <>
              <div className="logs-header">
                <h3>Logs</h3>
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
    </div>
  )
}
