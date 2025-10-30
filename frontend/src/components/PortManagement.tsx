import { useEffect, useState } from 'react'
import { Zap, RefreshCw, AlertCircle, CheckCircle, Wrench } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

interface PortConflict {
  serviceId: string
  serviceName: string
  port: number
  conflict: 'system' | 'service' | 'both'
  conflictingService?: string
}

interface PortStats {
  totalSystemPorts: number
  totalServicePorts: number
  availableInRange: number
  conflicts: number
}

export default function PortManagement() {
  const [conflicts, setConflicts] = useState<PortConflict[]>([])
  const [stats, setStats] = useState<PortStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [newPort, setNewPort] = useState<number>(3000)

  useEffect(() => {
    fetchConflicts()
    fetchStats()
  }, [])

  const fetchConflicts = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/ports/conflicts')
      setConflicts(response.data.conflicts || [])
    } catch (error) {
      console.error('Error fetching conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/ports/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleAutoFix = async () => {
    setFixing(true)
    try {
      const response = await axios.post('/api/ports/auto-assign')
      const assignments = response.data.assignments || []

      if (assignments.length === 0) {
        toast.success('No conflicts to fix')
      } else {
        toast.success(`Fixed ${assignments.length} port conflicts`)
        fetchConflicts()
        fetchStats()
      }
    } catch (error) {
      toast.error('Failed to fix port conflicts')
    } finally {
      setFixing(false)
    }
  }

  const handleStartEdit = (conflict: PortConflict) => {
    setEditingServiceId(conflict.serviceId)
    setNewPort(conflict.port)
  }

  const handleCancelEdit = () => {
    setEditingServiceId(null)
    setNewPort(3000)
  }

  const handleSavePort = async (serviceId: string) => {
    if (newPort < 1 || newPort > 65535) {
      toast.error('Port must be between 1 and 65535')
      return
    }

    try {
      // Update service port via services API
      await axios.put(`/api/services/${serviceId}`, { port: newPort })
      toast.success(`Port updated to ${newPort}`)
      setEditingServiceId(null)
      fetchConflicts()
      fetchStats()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update port')
    }
  }

  const getConflictBadgeColor = (conflict: string) => {
    switch (conflict) {
      case 'system':
        return 'bg-red-100 text-red-700'
      case 'service':
        return 'bg-yellow-100 text-yellow-700'
      case 'both':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Port Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Detect and fix port conflicts automatically
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchConflicts()
              fetchStats()
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {conflicts.length > 0 && (
            <button
              onClick={handleAutoFix}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              disabled={fixing}
            >
              <Wrench className="w-4 h-4" />
              {fixing ? 'Fixing...' : 'Auto-Fix All'}
            </button>
          )}
        </div>
      </div>

      {/* Port Statistics */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">System Ports</div>
            <div className="text-2xl font-bold text-gray-800">{stats.totalSystemPorts}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Service Ports</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalServicePorts}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Available (3000-9999)</div>
            <div className="text-2xl font-bold text-green-600">{stats.availableInRange}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Conflicts</div>
            <div className={`text-2xl font-bold ${stats.conflicts > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.conflicts}
            </div>
          </div>
        </div>
      )}

      {/* Conflicts Status */}
      {conflicts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold text-green-800">No Port Conflicts</h2>
              <p className="text-sm text-green-700 mt-1">
                All services have unique, available ports
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">
                  {conflicts.length} Port Conflict{conflicts.length !== 1 ? 's' : ''} Detected
                </h2>
                <p className="text-sm text-red-700 mt-1">
                  Click "Auto-Fix All" to automatically assign available ports
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts List */}
      {conflicts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Port Conflicts</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {conflicts.map((conflict, index) => (
              <div key={index} className="px-6 py-4">
                {editingServiceId === conflict.serviceId ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 mb-2">{conflict.serviceName}</div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">New Port:</label>
                        <input
                          type="number"
                          value={newPort}
                          onChange={(e) => setNewPort(parseInt(e.target.value) || 3000)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="1"
                          max="65535"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSavePort(conflict.serviceId)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-800">{conflict.serviceName}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getConflictBadgeColor(conflict.conflict)}`}>
                          {conflict.conflict.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Port {conflict.port}
                        {conflict.conflict === 'system' && ' is already in use by another process'}
                        {conflict.conflict === 'service' && conflict.conflictingService &&
                          ` conflicts with ${conflict.conflictingService}`}
                        {conflict.conflict === 'both' && ' has both system and service conflicts'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartEdit(conflict)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Change Port
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">About Port Conflicts</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>System:</strong> Port is used by another process on your machine</li>
          <li><strong>Service:</strong> Multiple services in DevHub are assigned the same port</li>
          <li><strong>Both:</strong> Port has both system and service conflicts</li>
        </ul>
        <p className="text-sm text-blue-700 mt-2">
          Auto-fix will automatically assign available ports from the range 3000-9999
        </p>
      </div>
    </div>
  )
}
