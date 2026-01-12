import { useEffect, useState } from 'react'
import { Download, Upload, Database as DatabaseIcon, HardDrive, Trash2, AlertTriangle, CheckCircle, RefreshCw, Server, Table, CheckCircle2, XCircle, Loader } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ConfirmDialog from './ConfirmDialog'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface DatabaseStats {
  size: number
  sizeFormatted: string
  services: number
  workspaces: number
  envProfiles: number
  notes: number
  groups: number
  logs: number
  lastBackup?: string
}

interface EnvVariable {
  id: string
  key: string
  value: string
  profileId: string
  profileName: string
  isSecret: number | boolean
}

interface ServiceDatabaseInfo {
  connected: boolean
  type?: string
  host?: string
  database?: string
  tableCount?: number
  tables?: string[]
  error?: string
}

export default function Database() {
  const { activeWorkspace } = useWorkspace()
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'restore' | 'clear-logs' | 'vacuum'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'restore',
    title: '',
    message: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Service Database state
  const [envVars, setEnvVars] = useState<EnvVariable[]>([])
  const [selectedEnvVar, setSelectedEnvVar] = useState<string>('')
  const [serviceDbInfo, setServiceDbInfo] = useState<ServiceDatabaseInfo | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [loadingEnvVars, setLoadingEnvVars] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchEnvVars()
  }, [activeWorkspace])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/database/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching database stats:', error)
      toast.error('Failed to load database statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBackup = async () => {
    try {
      toast.loading('Preparing backup...')
      const response = await axios.get('/api/database/backup', {
        responseType: 'blob',
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      link.setAttribute('download', `devhub-backup-${timestamp}.db`)

      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.dismiss()
      toast.success('Backup downloaded successfully')
      fetchStats() // Refresh to update last backup time
    } catch (error) {
      console.error('Error downloading backup:', error)
      toast.dismiss()
      toast.error('Failed to download backup')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.db')) {
        toast.error('Please select a .db file')
        return
      }
      setSelectedFile(file)
      setConfirmDialog({
        isOpen: true,
        type: 'restore',
        title: 'Restore Database',
        message: `Are you sure you want to restore from "${file.name}"? This will replace ALL current data and cannot be undone!`,
      })
    }
  }

  const handleRestoreConfirm = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('database', selectedFile)

      await axios.post('/api/database/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success('Database restored successfully! Refreshing page...')

      // Refresh the page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error('Error restoring database:', error)
      toast.error(`Failed to restore: ${error.response?.data?.error || error.message}`)
    } finally {
      setUploading(false)
      setSelectedFile(null)
    }
  }

  const handleClearLogs = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'clear-logs',
      title: 'Clear Old Logs',
      message: 'This will delete all service logs older than 7 days. This action cannot be undone.',
    })
  }

  const handleVacuum = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'vacuum',
      title: 'Vacuum Database',
      message: 'This will optimize the database and reclaim unused space. This is safe but may take a few seconds.',
    })
  }

  const handleConfirm = async () => {
    switch (confirmDialog.type) {
      case 'restore':
        await handleRestoreConfirm()
        break
      case 'clear-logs':
        await executeClearLogs()
        break
      case 'vacuum':
        await executeVacuum()
        break
    }
  }

  const executeClearLogs = async () => {
    try {
      const response = await axios.post('/api/database/clear-logs')
      toast.success(`Cleared ${response.data.deleted} old log entries`)
      fetchStats()
    } catch (error: any) {
      toast.error(`Failed to clear logs: ${error.response?.data?.error || error.message}`)
    }
  }

  const executeVacuum = async () => {
    try {
      const response = await axios.post('/api/database/vacuum')
      toast.success(`Database optimized! Reclaimed ${response.data.savedSpace}`)
      fetchStats()
    } catch (error: any) {
      toast.error(`Failed to vacuum: ${error.response?.data?.error || error.message}`)
    }
  }

  // Service Database functions
  const fetchEnvVars = async () => {
    if (!activeWorkspace) return

    setLoadingEnvVars(true)
    try {
      // Get all env profiles for active workspace
      const profilesRes = await axios.get('/api/env/profiles')
      const profiles = profilesRes.data.profiles || []

      // Get all variables from all profiles
      const allVars: EnvVariable[] = []
      for (const profile of profiles) {
        const varsRes = await axios.get(`/api/env/profiles/${profile.id}/variables`)
        const vars = varsRes.data.variables || []
        vars.forEach((v: any) => {
          allVars.push({
            ...v,
            profileName: profile.name
          })
        })
      }

      // Filter to database-related variables
      const dbVars = allVars.filter(v => {
        const key = v.key.toUpperCase()
        return key.includes('DATABASE') || key.includes('DB_') ||
               key.includes('POSTGRES') || key.includes('MYSQL') ||
               key.includes('MONGO') || key.includes('REDIS') ||
               key.includes('CONNECTION')
      })

      setEnvVars(dbVars)
    } catch (error) {
      console.error('Error fetching env vars:', error)
    } finally {
      setLoadingEnvVars(false)
    }
  }

  const handleTestConnection = async () => {
    if (!selectedEnvVar) {
      toast.error('Please select a database connection string')
      return
    }

    const envVar = envVars.find(v => v.id === selectedEnvVar)
    if (!envVar) return

    setTestingConnection(true)
    setServiceDbInfo(null)

    try {
      const response = await axios.post('/api/database/service/test', {
        varId: envVar.id
      })
      setServiceDbInfo(response.data.info)
      if (response.data.info.connected) {
        toast.success(`Connected to ${response.data.info.type} database`)
      } else {
        toast.error(`Connection failed: ${response.data.info.error}`)
      }
    } catch (error: any) {
      console.error('Error testing connection:', error)
      setServiceDbInfo({
        connected: false,
        error: error.response?.data?.error || error.message
      })
      toast.error('Failed to test connection')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleBackupDatabase = async () => {
    if (!selectedEnvVar) {
      toast.error('Please select a database connection string')
      return
    }

    try {
      toast.loading('Creating backup...')
      const response = await axios.post('/api/database/service/backup', {
        varId: selectedEnvVar
      }, {
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = 'database-backup.sql'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.dismiss()
      toast.success('Database backup downloaded successfully')
    } catch (error: any) {
      console.error('Error backing up database:', error)
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Failed to backup database')
    }
  }

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!selectedEnvVar) {
      toast.error('Please select a database connection string')
      return
    }

    // Confirm action
    const confirmed = window.confirm(
      `WARNING: This will restore the database and replace ALL existing data!\n\n` +
      `Database: ${serviceDbInfo?.database}\n` +
      `File: ${file.name}\n\n` +
      `This action cannot be undone. Are you sure?`
    )

    if (!confirmed) {
      e.target.value = '' // Reset file input
      return
    }

    try {
      const formData = new FormData()
      formData.append('backup', file)
      formData.append('varId', selectedEnvVar)

      toast.loading('Restoring database...')
      await axios.post('/api/database/service/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.dismiss()
      toast.success('Database restored successfully!')

      // Reset file input
      e.target.value = ''

      // Re-test connection to refresh info
      await handleTestConnection()
    } catch (error: any) {
      console.error('Error restoring database:', error)
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Failed to restore database')
      e.target.value = '' // Reset file input
    }
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Database Management</h1>
          <p className="text-[hsl(var(--foreground-muted))]">
            Backup, restore, and manage your DevHub database
          </p>
        </div>

        {/* Statistics Card */}
        <div className="glass-card rounded-xl p-6 mb-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <HardDrive size={24} className="text-[hsl(var(--primary))]" />
              Database Statistics
            </h2>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] rounded-xl"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading && !stats ? (
            <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">Loading statistics...</div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="metric-card p-4 rounded-xl">
                <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.sizeFormatted}</div>
                <div className="text-sm text-[hsl(var(--primary))]">Database Size</div>
              </div>
              <div className="metric-card p-4 rounded-xl">
                <div className="text-2xl font-bold text-[hsl(var(--success))]">{stats.services}</div>
                <div className="text-sm text-[hsl(var(--foreground-muted))]">Services</div>
              </div>
              <div className="metric-card p-4 rounded-xl">
                <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.workspaces}</div>
                <div className="text-sm text-[hsl(var(--foreground-muted))]">Workspaces</div>
              </div>
              <div className="metric-card p-4 rounded-xl">
                <div className="text-2xl font-bold text-[hsl(var(--warning))]">{stats.envProfiles}</div>
                <div className="text-sm text-[hsl(var(--foreground-muted))]">Env Profiles</div>
              </div>
              <div className="metric-card p-4 rounded-xl">
                <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.notes}</div>
                <div className="text-sm text-[hsl(var(--foreground-muted))]">Notes</div>
              </div>
              <div className="metric-card p-4 rounded-xl">
                <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.groups}</div>
                <div className="text-sm text-[hsl(var(--foreground-muted))]">Groups</div>
              </div>
              <div className="metric-card p-4 rounded-xl">
                <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.logs.toLocaleString()}</div>
                <div className="text-sm text-[hsl(var(--foreground-muted))]">Log Entries</div>
              </div>
              <div className="metric-card p-4 rounded-xl">
                <div className="text-sm font-bold text-[hsl(var(--warning))]">
                  {stats.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
                </div>
                <div className="text-sm text-[hsl(var(--foreground-muted))]">Last Backup</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Backup & Restore Card */}
        <div className="glass-card rounded-xl p-6 mb-6 card-hover">
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
            <DatabaseIcon size={24} className="text-[hsl(var(--primary))]" />
            Backup & Restore
          </h2>

          <div className="space-y-4">
            {/* Download Backup */}
            <div className="flex items-start gap-4 p-4 bg-[hsla(var(--primary),0.08)] rounded-xl border border-[hsl(var(--border))]">
              <Download className="text-[hsl(var(--primary))] mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">Download Backup</h3>
                <p className="text-sm text-[hsl(var(--foreground-muted))] mb-3">
                  Create a backup of your entire database. Recommended before major changes.
                </p>
                <button
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl flex items-center gap-2"
                >
                  <Download size={18} />
                  Download Backup
                </button>
              </div>
            </div>

            {/* Upload Restore */}
            <div className="flex items-start gap-4 p-4 bg-[hsla(var(--warning),0.1)] rounded-xl border-2 border-[hsl(var(--warning))]">
              <Upload className="text-[hsl(var(--warning))] mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-[hsl(var(--warning))] mb-1">Restore from Backup</h3>
                <p className="text-sm text-[hsl(var(--foreground-muted))] mb-3">
                  This will replace ALL current data with the backup file. Cannot be undone!
                </p>
                <label className="px-4 py-2 bg-[hsl(var(--warning))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 cursor-pointer inline-flex items-center gap-2">
                  <Upload size={18} />
                  Upload & Restore
                  <input
                    type="file"
                    accept=".db"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Card */}
        <div className="glass-card rounded-xl p-6 mb-6 card-hover">
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
            <AlertTriangle size={24} className="text-[hsl(var(--warning))]" />
            Maintenance
          </h2>

          <div className="space-y-3">
            {/* Clear Old Logs */}
            <div className="flex items-center justify-between p-4 bg-[hsl(var(--background-elevated))] rounded-xl border border-[hsl(var(--border))]">
              <div>
                <h3 className="font-semibold text-[hsl(var(--foreground))]">Clear Old Logs</h3>
                <p className="text-sm text-[hsl(var(--foreground-muted))]">Delete service logs older than 7 days</p>
              </div>
              <button
                onClick={handleClearLogs}
                className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsla(var(--border),0.8)] flex items-center gap-2"
              >
                <Trash2 size={18} />
                Clear Logs
              </button>
            </div>

            {/* Vacuum Database */}
            <div className="flex items-center justify-between p-4 bg-[hsl(var(--background-elevated))] rounded-xl border border-[hsl(var(--border))]">
              <div>
                <h3 className="font-semibold text-[hsl(var(--foreground))]">Optimize Database</h3>
                <p className="text-sm text-[hsl(var(--foreground-muted))]">Vacuum and reclaim unused space</p>
              </div>
              <button
                onClick={handleVacuum}
                className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl flex items-center gap-2"
              >
                <CheckCircle size={18} />
                Vacuum
              </button>
            </div>
          </div>
        </div>

        {/* Service Databases Card */}
        <div className="glass-card rounded-xl p-6 card-hover">
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
            <Server size={24} className="text-[hsl(var(--primary))]" />
            Service Databases
          </h2>
          <p className="text-sm text-[hsl(var(--foreground-muted))] mb-4">
            Connect to your services' databases using environment variables
          </p>

          {!activeWorkspace ? (
            <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
              Please select a workspace to view service databases
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection String Selection */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Select Database Connection String
                  {loadingEnvVars && (
                    <span className="ml-2 text-[hsl(var(--primary))] text-xs">
                      <Loader size={14} className="inline animate-spin" /> Loading...
                    </span>
                  )}
                </label>
                <select
                  value={selectedEnvVar}
                  onChange={(e) => {
                    setSelectedEnvVar(e.target.value)
                    setServiceDbInfo(null)
                  }}
                  disabled={loadingEnvVars}
                  className="input-field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingEnvVars ? 'Loading environment variables...' : '-- Select an environment variable --'}
                  </option>
                  {envVars.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.key} ({v.profileName})
                    </option>
                  ))}
                </select>
                {!loadingEnvVars && envVars.length === 0 && (
                  <p className="text-sm text-[hsl(var(--foreground-muted))] mt-2">
                    No database-related environment variables found. Add them in the Environment tab.
                  </p>
                )}
              </div>

              {/* Test Connection Button */}
              {selectedEnvVar && (
                <div>
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl disabled:opacity-50 flex items-center gap-2"
                  >
                    {testingConnection ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Server size={18} />
                        Test Connection
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Connection Results */}
              {serviceDbInfo && (
                <div className={`p-4 rounded-xl border-2 ${
                  serviceDbInfo.connected
                    ? 'bg-[hsla(var(--success),0.1)] border-[hsl(var(--success))]'
                    : 'bg-[hsla(var(--danger),0.1)] border-[hsl(var(--danger))]'
                }`}>
                  <div className="flex items-start gap-3">
                    {serviceDbInfo.connected ? (
                      <CheckCircle2 size={24} className="text-[hsl(var(--success))] flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={24} className="text-[hsl(var(--danger))] flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {serviceDbInfo.connected ? (
                        <>
                          <h3 className="font-semibold text-[hsl(var(--success))] mb-2">Connection Successful</h3>
                          <div className="space-y-1 text-sm text-[hsl(var(--foreground))]">
                            <div><strong>Type:</strong> {serviceDbInfo.type}</div>
                            <div><strong>Host:</strong> <span className="terminal-text">{serviceDbInfo.host}</span></div>
                            <div><strong>Database:</strong> <span className="terminal-text">{serviceDbInfo.database}</span></div>
                            {serviceDbInfo.tableCount !== undefined && (
                              <div><strong>Tables:</strong> {serviceDbInfo.tableCount}</div>
                            )}
                          </div>
                          {serviceDbInfo.tables && serviceDbInfo.tables.length > 0 && (
                            <div className="mt-3">
                              <div className="font-semibold text-[hsl(var(--success))] mb-1 flex items-center gap-1">
                                <Table size={16} />
                                Tables:
                              </div>
                              <div className="max-h-40 overflow-y-auto bg-[hsl(var(--background-elevated))] rounded-xl p-2 border border-[hsl(var(--border))]">
                                <ul className="text-sm text-[hsl(var(--foreground))] space-y-1">
                                  {serviceDbInfo.tables.map((table, idx) => (
                                    <li key={idx} className="terminal-text">{table}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Backup & Restore Actions */}
                          <div className="mt-4 pt-4 border-t border-[hsl(var(--success))]">
                            <div className="flex gap-3">
                              <button
                                onClick={handleBackupDatabase}
                                className="flex-1 px-4 py-2 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 flex items-center justify-center gap-2"
                              >
                                <Download size={18} />
                                Download Backup
                              </button>
                              <label className="flex-1 px-4 py-2 bg-[hsl(var(--warning))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 cursor-pointer flex items-center justify-center gap-2">
                                <Upload size={18} />
                                Restore from Backup
                                <input
                                  type="file"
                                  accept=".sql,.dump,.gz"
                                  onChange={handleRestoreDatabase}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <p className="text-xs text-[hsl(var(--foreground-muted))] mt-2">
                              Restore will replace ALL data in the database. Make a backup first!
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold text-[hsl(var(--danger))] mb-1">Connection Failed</h3>
                          <p className="text-sm text-[hsl(var(--foreground-muted))]">{serviceDbInfo.error}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          setConfirmDialog({ ...confirmDialog, isOpen: false })
          setSelectedFile(null)
        }}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.type === 'restore' ? 'Restore' : 'Confirm'}
        variant={confirmDialog.type === 'restore' ? 'danger' : 'warning'}
      />
    </div>
  )
}
