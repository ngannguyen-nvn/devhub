import { useEffect, useState } from 'react'
import { Download, Upload, Database as DatabaseIcon, HardDrive, Trash2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
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

  useEffect(() => {
    fetchStats()
  }, [])

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

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Management</h1>
          <p className="text-gray-600">
            Backup, restore, and manage your DevHub database
          </p>
        </div>

        {/* Statistics Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <HardDrive size={24} className="text-blue-600" />
              Database Statistics
            </h2>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading && !stats ? (
            <div className="text-center py-8 text-gray-500">Loading statistics...</div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{stats.sizeFormatted}</div>
                <div className="text-sm text-blue-600">Database Size</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{stats.services}</div>
                <div className="text-sm text-green-600">Services</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">{stats.workspaces}</div>
                <div className="text-sm text-purple-600">Workspaces</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-900">{stats.envProfiles}</div>
                <div className="text-sm text-orange-600">Env Profiles</div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-900">{stats.notes}</div>
                <div className="text-sm text-indigo-600">Notes</div>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <div className="text-2xl font-bold text-pink-900">{stats.groups}</div>
                <div className="text-sm text-pink-600">Groups</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.logs.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Log Entries</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm font-bold text-yellow-900">
                  {stats.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
                </div>
                <div className="text-sm text-yellow-600">Last Backup</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Backup & Restore Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <DatabaseIcon size={24} className="text-blue-600" />
            Backup & Restore
          </h2>

          <div className="space-y-4">
            {/* Download Backup */}
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <Download className="text-blue-600 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Download Backup</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Create a backup of your entire database. Recommended before major changes.
                </p>
                <button
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Download size={18} />
                  Download Backup
                </button>
              </div>
            </div>

            {/* Upload Restore */}
            <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <Upload className="text-yellow-600 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">Restore from Backup</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  ⚠️ This will replace ALL current data with the backup file. Cannot be undone!
                </p>
                <label className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 cursor-pointer inline-flex items-center gap-2">
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={24} className="text-orange-600" />
            Maintenance
          </h2>

          <div className="space-y-3">
            {/* Clear Old Logs */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">Clear Old Logs</h3>
                <p className="text-sm text-gray-600">Delete service logs older than 7 days</p>
              </div>
              <button
                onClick={handleClearLogs}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Trash2 size={18} />
                Clear Logs
              </button>
            </div>

            {/* Vacuum Database */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">Optimize Database</h3>
                <p className="text-sm text-gray-600">Vacuum and reclaim unused space</p>
              </div>
              <button
                onClick={handleVacuum}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <CheckCircle size={18} />
                Vacuum
              </button>
            </div>
          </div>
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
