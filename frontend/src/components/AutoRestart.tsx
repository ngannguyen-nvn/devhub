import { useEffect, useState } from 'react'
import { RotateCcw, RefreshCw, Settings, AlertCircle, Clock } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface RestartConfig {
  enabled: boolean
  maxRestarts: number
  restartCount: number
  backoffStrategy: 'immediate' | 'exponential' | 'fixed'
}

interface ServiceRestartInfo {
  serviceId: string
  serviceName: string
  config: RestartConfig
  isPending: boolean
}

export default function AutoRestart() {
  const { activeWorkspace } = useWorkspace()
  const [restartInfos, setRestartInfos] = useState<ServiceRestartInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [editingService, setEditingService] = useState<string | null>(null)
  const [pendingRestarts, setPendingRestarts] = useState<string[]>([])

  const [editConfig, setEditConfig] = useState<RestartConfig>({
    enabled: false,
    maxRestarts: 3,
    restartCount: 0,
    backoffStrategy: 'exponential',
  })

  useEffect(() => {
    if (activeWorkspace) {
      fetchData()
    }
  }, [activeWorkspace])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all services
      const servicesRes = await axios.get('/api/services')
      const servicesList = servicesRes.data.services || []

      // Fetch pending restarts
      const pendingRes = await axios.get('/api/auto-restart/pending')
      setPendingRestarts(pendingRes.data.serviceIds || [])

      // Fetch restart configs for all services in one call
      const serviceIds = servicesList.map((s: any) => s.id).join(',')
      const configsRes = await axios.get(`/api/auto-restart/bulk?serviceIds=${serviceIds}`)
      const configs = configsRes.data.configs || {}

      // Build infos array
      const infos: ServiceRestartInfo[] = servicesList.map((service: any) => ({
        serviceId: service.id,
        serviceName: service.name,
        config: configs[service.id] || {
          enabled: false,
          maxRestarts: 3,
          restartCount: 0,
          backoffStrategy: 'exponential',
        },
        isPending: pendingRes.data.serviceIds?.includes(service.id) || false,
      }))

      setRestartInfos(infos)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch auto-restart data')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (info: ServiceRestartInfo) => {
    setEditingService(info.serviceId)
    setEditConfig(info.config)
  }

  const handleSave = async (serviceId: string) => {
    try {
      await axios.put(`/api/auto-restart/${serviceId}`, {
        autoRestart: editConfig.enabled,
        maxRestarts: editConfig.maxRestarts,
        backoffStrategy: editConfig.backoffStrategy,
      })
      toast.success('Auto-restart config updated')
      setEditingService(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update config')
    }
  }

  const handleCancel = () => {
    setEditingService(null)
  }

  const handleReset = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Reset restart counter for ${serviceName}?`)) return

    try {
      await axios.post(`/api/auto-restart/${serviceId}/reset`)
      toast.success('Restart counter reset')
      fetchData()
    } catch (error) {
      toast.error('Failed to reset counter')
    }
  }

  const getBackoffDelay = (strategy: string, count: number): string => {
    switch (strategy) {
      case 'immediate':
        return '0s'
      case 'exponential':
        const delay = Math.min(Math.pow(2, count), 60)
        return `${delay}s`
      case 'fixed':
        return '5s'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <RotateCcw className="w-6 h-6" />
            Auto-Restart Configuration
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure automatic service restart with backoff strategies
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!activeWorkspace && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800">Please activate a workspace to manage auto-restart</span>
        </div>
      )}

      {/* Pending Restarts Alert */}
      {pendingRestarts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Pending Restarts ({pendingRestarts.length})</span>
          </div>
          <p className="text-sm text-blue-700">
            The following services have scheduled restarts:
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {pendingRestarts.map((serviceId) => {
              const info = restartInfos.find(i => i.serviceId === serviceId)
              return (
                <span key={serviceId} className="px-2 py-1 bg-blue-100 rounded text-sm">
                  {info?.serviceName || serviceId}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Service Auto-Restart Settings</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading services...</div>
        ) : restartInfos.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No services found</p>
            <p className="text-sm text-gray-500">
              Create services first to configure auto-restart
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {restartInfos.map((info) => (
              <div key={info.serviceId} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-800">{info.serviceName}</h3>
                      {info.config.enabled && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                          Enabled
                        </span>
                      )}
                      {info.isPending && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending Restart
                        </span>
                      )}
                    </div>

                    {editingService === info.serviceId ? (
                      /* Edit Mode */
                      <div className="space-y-3 mt-3">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editConfig.enabled}
                              onChange={(e) => setEditConfig({ ...editConfig, enabled: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Enable Auto-Restart</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Max Restarts
                            </label>
                            <input
                              type="number"
                              value={editConfig.maxRestarts}
                              onChange={(e) => setEditConfig({ ...editConfig, maxRestarts: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="0"
                              max="10"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Backoff Strategy
                            </label>
                            <select
                              value={editConfig.backoffStrategy}
                              onChange={(e) => setEditConfig({ ...editConfig, backoffStrategy: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="immediate">Immediate (0s)</option>
                              <option value="exponential">Exponential (1s, 2s, 4s...)</option>
                              <option value="fixed">Fixed (5s)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(info.serviceId)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Max Restarts:</span>
                            <span>{info.config.maxRestarts}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Backoff Strategy:</span>
                            <span className="capitalize">{info.config.backoffStrategy}</span>
                            <span className="text-gray-500">
                              ({getBackoffDelay(info.config.backoffStrategy, info.config.restartCount)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Restart Count:</span>
                            <span className={info.config.restartCount >= info.config.maxRestarts ? 'text-red-600 font-semibold' : ''}>
                              {info.config.restartCount} / {info.config.maxRestarts}
                            </span>
                            {info.config.restartCount >= info.config.maxRestarts && (
                              <span className="text-xs text-red-600">(Max reached)</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleEdit(info)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-1"
                          >
                            <Settings className="w-3 h-3" />
                            Configure
                          </button>
                          {info.config.restartCount > 0 && (
                            <button
                              onClick={() => handleReset(info.serviceId, info.serviceName)}
                              className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reset Counter
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backoff Strategy Info */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Backoff Strategies</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div>
            <span className="font-medium">Immediate:</span> Restart instantly (0s delay)
          </div>
          <div>
            <span className="font-medium">Exponential:</span> Increasing delay (1s, 2s, 4s, 8s, 16s... max 60s)
          </div>
          <div>
            <span className="font-medium">Fixed:</span> Always wait 5 seconds between restarts
          </div>
        </div>
      </div>
    </div>
  )
}
