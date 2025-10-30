import { useEffect, useState } from 'react'
import { Activity, Plus, Trash2, RefreshCw, AlertCircle, Play, CheckCircle, XCircle, Clock } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface HealthCheck {
  id: string
  serviceId: string
  type: 'http' | 'tcp' | 'command'
  endpoint?: string
  expectedStatus?: number
  expectedBody?: string
  port?: number
  command?: string
  interval: number
  timeout: number
  retries: number
  enabled: boolean
  createdAt: string
}

interface Service {
  id: string
  name: string
  healthStatus?: string
  lastHealthCheck?: string
}

export default function HealthChecks() {
  const { activeWorkspace } = useWorkspace()
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const [newCheck, setNewCheck] = useState<Partial<HealthCheck>>({
    type: 'http',
    interval: 30,
    timeout: 5000,
    retries: 3,
    enabled: true,
    expectedStatus: 200,
  })

  useEffect(() => {
    if (activeWorkspace) {
      fetchServices()
    }
  }, [activeWorkspace])

  useEffect(() => {
    if (selectedServiceId) {
      fetchHealthChecks(selectedServiceId)
    }
  }, [selectedServiceId])

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/services')
      setServices(response.data.services)
      if (response.data.services.length > 0 && !selectedServiceId) {
        setSelectedServiceId(response.data.services[0].id)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchHealthChecks = async (serviceId: string) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/health-checks/${serviceId}`)
      setHealthChecks(response.data.healthChecks || [])
    } catch (error) {
      console.error('Error fetching health checks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddHealthCheck = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedServiceId) {
      toast.error('Please select a service')
      return
    }

    try {
      await axios.post('/api/health-checks', {
        ...newCheck,
        serviceId: selectedServiceId,
      })
      toast.success('Health check added successfully')
      setShowAddForm(false)
      setNewCheck({
        type: 'http',
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
        expectedStatus: 200,
      })
      fetchHealthChecks(selectedServiceId)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add health check')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/health-checks/${id}`)
      toast.success('Health check removed')
      fetchHealthChecks(selectedServiceId)
    } catch (error) {
      toast.error('Failed to remove health check')
    }
  }

  const handleToggle = async (check: HealthCheck) => {
    try {
      await axios.put(`/api/health-checks/${check.id}`, {
        enabled: !check.enabled,
      })
      toast.success(check.enabled ? 'Health check disabled' : 'Health check enabled')
      fetchHealthChecks(selectedServiceId)
    } catch (error) {
      toast.error('Failed to update health check')
    }
  }

  const handleExecute = async (id: string) => {
    try {
      const response = await axios.post(`/api/health-checks/${id}/execute`)
      if (response.data.result.healthy) {
        toast.success('Health check passed')
      } else {
        toast.error(`Health check failed: ${response.data.result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      toast.error('Failed to execute health check')
    }
  }

  const getServiceName = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.name || 'Unknown'
  }

  const getHealthStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Health Checks
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor service health automatically
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          disabled={!selectedServiceId}
        >
          <Plus className="w-4 h-4" />
          Add Health Check
        </button>
      </div>

      {!activeWorkspace && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800">Please activate a workspace to manage health checks</span>
        </div>
      )}

      {/* Service Selector */}
      {services.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Service
          </label>
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} {service.healthStatus && `(${service.healthStatus})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add Health Check Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Health Check</h2>
          <form onSubmit={handleAddHealthCheck} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check Type
              </label>
              <select
                value={newCheck.type}
                onChange={(e) => setNewCheck({ ...newCheck, type: e.target.value as 'http' | 'tcp' | 'command' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="http">HTTP</option>
                <option value="tcp">TCP</option>
                <option value="command">Command</option>
              </select>
            </div>

            {newCheck.type === 'http' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={newCheck.endpoint || ''}
                    onChange={(e) => setNewCheck({ ...newCheck, endpoint: e.target.value })}
                    placeholder="http://localhost:3000/health"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Status Code
                    </label>
                    <input
                      type="number"
                      value={newCheck.expectedStatus || 200}
                      onChange={(e) => setNewCheck({ ...newCheck, expectedStatus: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Body (optional)
                    </label>
                    <input
                      type="text"
                      value={newCheck.expectedBody || ''}
                      onChange={(e) => setNewCheck({ ...newCheck, expectedBody: e.target.value })}
                      placeholder="OK"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {newCheck.type === 'tcp' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={newCheck.port || ''}
                  onChange={(e) => setNewCheck({ ...newCheck, port: parseInt(e.target.value) })}
                  placeholder="5432"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            {newCheck.type === 'command' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Command
                </label>
                <input
                  type="text"
                  value={newCheck.command || ''}
                  onChange={(e) => setNewCheck({ ...newCheck, command: e.target.value })}
                  placeholder="curl -f http://localhost:3000/health"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval (seconds)
                </label>
                <input
                  type="number"
                  value={newCheck.interval}
                  onChange={(e) => setNewCheck({ ...newCheck, interval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  value={newCheck.timeout}
                  onChange={(e) => setNewCheck({ ...newCheck, timeout: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retries
                </label>
                <input
                  type="number"
                  value={newCheck.retries}
                  onChange={(e) => setNewCheck({ ...newCheck, retries: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newCheck.enabled}
                  onChange={(e) => setNewCheck({ ...newCheck, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Enabled</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Health Check
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Health Checks List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Health Checks {selectedServiceId && `for ${getServiceName(selectedServiceId)}`}
          </h2>
          {selectedServiceId && (
            <div className="flex items-center gap-2">
              {getHealthStatusIcon(services.find(s => s.id === selectedServiceId)?.healthStatus)}
              <span className="text-sm text-gray-600">
                {services.find(s => s.id === selectedServiceId)?.healthStatus || 'unknown'}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading health checks...</div>
        ) : healthChecks.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No health checks configured</p>
            <p className="text-sm text-gray-500">
              Add health checks to monitor service availability
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {healthChecks.map((check) => (
              <div key={check.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        check.type === 'http' ? 'bg-blue-100 text-blue-700' :
                        check.type === 'tcp' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {check.type.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        check.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {check.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {check.type === 'http' && `${check.endpoint} (Status: ${check.expectedStatus})`}
                      {check.type === 'tcp' && `Port ${check.port}`}
                      {check.type === 'command' && check.command}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Every {check.interval}s • Timeout: {check.timeout}ms • Retries: {check.retries}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExecute(check.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Execute now"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(check)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      title={check.enabled ? 'Disable' : 'Enable'}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(check.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
