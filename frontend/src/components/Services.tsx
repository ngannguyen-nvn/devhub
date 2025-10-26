import { useEffect, useState } from 'react'
import { Play, Square, Trash2, Plus, Terminal, RefreshCw } from 'lucide-react'
import axios from 'axios'
import Loading, { SkeletonLoader } from './Loading'

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
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  // New service form
  const [newService, setNewService] = useState({
    name: '',
    repoPath: '',
    command: '',
    port: '',
  })

  const fetchServices = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/services')
      setServices(response.data.services)
    } catch (error) {
      console.error('Error fetching services:', error)
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
    // Auto-refresh every 3 seconds
    const interval = setInterval(fetchServices, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedService) {
      fetchLogs(selectedService)
      const interval = setInterval(() => fetchLogs(selectedService), 2000)
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
    } catch (error) {
      console.error('Error adding service:', error)
      alert('Failed to add service')
    }
  }

  const handleStartService = async (id: string) => {
    try {
      await axios.post(`/api/services/${id}/start`)
      fetchServices()
    } catch (error) {
      console.error('Error starting service:', error)
      alert('Failed to start service')
    }
  }

  const handleStopService = async (id: string) => {
    try {
      await axios.post(`/api/services/${id}/stop`)
      fetchServices()
    } catch (error) {
      console.error('Error stopping service:', error)
      alert('Failed to stop service')
    }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      await axios.delete(`/api/services/${id}`)
      fetchServices()
      if (selectedService === id) {
        setSelectedService(null)
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Failed to delete service')
    }
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Manager</h1>
          <p className="text-gray-600">Start, stop, and monitor your services</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchServices}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Service
          </button>
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                disabled={!newService.name || !newService.repoPath || !newService.command}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-auto">
        {/* Services List */}
        <div className="space-y-4">
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
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Logs Viewer */}
        <div className="bg-gray-900 rounded-lg p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Service Logs</h3>
            {selectedService && (
              <button
                onClick={() => fetchLogs(selectedService)}
                className="text-gray-400 hover:text-white"
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
            <div className="flex-1 overflow-auto font-mono text-xs text-green-400 space-y-1">
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
    </div>
  )
}
