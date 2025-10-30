import { useEffect, useState } from 'react'
import { FileText, Search, Filter, Trash2, Calendar } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface LogSession {
  id: string
  serviceId: string
  startedAt: string
  stoppedAt?: string
  exitCode?: number
  exitReason?: string
  logsCount: number
}

interface LogEntry {
  id: number
  sessionId: string
  serviceId: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}

interface Service {
  id: string
  name: string
}

export default function LogViewer() {
  const { activeWorkspace } = useWorkspace()
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [sessions, setSessions] = useState<LogSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')

  useEffect(() => {
    if (activeWorkspace) {
      fetchServices()
    }
  }, [activeWorkspace])

  useEffect(() => {
    if (selectedServiceId) {
      fetchSessions(selectedServiceId)
    }
  }, [selectedServiceId])

  useEffect(() => {
    if (selectedSessionId) {
      fetchLogs(selectedSessionId)
    }
  }, [selectedSessionId, searchTerm, levelFilter])

  // Auto-refresh logs every 3 seconds
  useEffect(() => {
    if (!selectedSessionId) return

    const interval = setInterval(() => {
      fetchLogs(selectedSessionId)
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedSessionId, searchTerm, levelFilter])

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

  const fetchSessions = async (serviceId: string) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/logs/sessions/${serviceId}`)
      setSessions(response.data.sessions || [])
      if (response.data.sessions.length > 0) {
        setSelectedSessionId(response.data.sessions[0].id)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async (sessionId: string) => {
    setLoading(true)
    try {
      const params: any = {}
      if (levelFilter !== 'all') params.level = levelFilter
      if (searchTerm) params.search = searchTerm

      const response = await axios.get(`/api/logs/session/${sessionId}`, { params })
      setLogs(response.data.logs || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this log session? This cannot be undone.')) return

    try {
      await axios.delete(`/api/logs/session/${sessionId}`)
      toast.success('Session deleted')
      if (selectedServiceId) {
        fetchSessions(selectedServiceId)
      }
    } catch (error) {
      toast.error('Failed to delete session')
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warn': return 'text-yellow-600 bg-yellow-50'
      case 'debug': return 'text-purple-600 bg-purple-50'
      default: return 'text-blue-600 bg-blue-50'
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  const getExitCodeColor = (code?: number) => {
    if (code === undefined) return 'text-gray-600'
    return code === 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Historical Logs
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          View persistent logs with session tracking
        </p>
      </div>

      {/* Service Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Service
        </label>
        <select
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a service...</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sessions List (Left Sidebar) */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Log Sessions
              </h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loading && sessions.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>
              ) : sessions.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">No sessions</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedSessionId === session.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {formatDate(session.startedAt)}
                      </div>
                      <div className="text-sm font-medium text-gray-800 mb-1">
                        {session.logsCount} logs
                      </div>
                      {session.stoppedAt && (
                        <div className={`text-xs ${getExitCodeColor(session.exitCode)}`}>
                          {session.exitReason} ({session.exitCode ?? 'N/A'})
                        </div>
                      )}
                      {!session.stoppedAt && (
                        <div className="text-xs text-green-600">Running</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logs Viewer (Main Content) */}
        <div className="col-span-9">
          <div className="bg-white rounded-lg shadow-md">
            {/* Filters */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search logs..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>
                {selectedSessionId && (
                  <button
                    onClick={() => handleDeleteSession(selectedSessionId)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Logs */}
            <div className="max-h-[600px] overflow-y-auto font-mono text-xs">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No logs found</p>
                  {(searchTerm || levelFilter !== 'all') && (
                    <p className="text-gray-500 text-xs mt-1">Try adjusting your filters</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <div key={log.id} className={`px-6 py-2 hover:bg-gray-50 ${getLevelColor(log.level)}`}>
                      <div className="flex items-start gap-4">
                        <span className="text-gray-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.level === 'error' ? 'bg-red-100 text-red-700' :
                          log.level === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                          log.level === 'debug' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="flex-1 text-gray-800 whitespace-pre-wrap break-words">
                          {log.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {logs.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-200 text-xs text-gray-500">
                Showing {logs.length} logs
                {(searchTerm || levelFilter !== 'all') && ' (filtered)'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
