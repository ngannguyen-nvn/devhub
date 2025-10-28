import { useEffect, useState, useRef } from 'react'
import { GitBranch, RefreshCw, Folder, AlertCircle, Save, CheckSquare, Square, Camera, Settings, FileText, Zap, Package, CheckCircle, Clock, Trash2 } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { SkeletonLoader } from './Loading'
import { useWorkspace } from '../contexts/WorkspaceContext'
import UncommittedChangesDialog from './UncommittedChangesDialog'

interface DashboardProps {
  onViewChange: (view: 'dashboard' | 'services' | 'workspaces' | 'docker' | 'env' | 'wiki') => void
}

interface Repository {
  name: string
  path: string
  branch: string
  hasChanges: boolean
  lastCommit: {
    message: string
    date: string
    author: string
  }
  hasDockerfile: boolean
  hasEnvFile: boolean
}

interface ServiceStats {
  totalServices: number
  runningServices: number
  stoppedServices: number
}

interface Snapshot {
  id: string
  name: string
  description: string
  workspaceId: string
  config: any
  createdAt: string
  updatedAt: string
}

interface UncommittedChange {
  path: string
  hasChanges: boolean
  files: {
    modified: string[]
    added: string[]
    deleted: string[]
    renamed: string[]
  }
}

export default function Dashboard({ onViewChange }: DashboardProps) {
  const { allWorkspaces, createWorkspace, refreshWorkspaces, activeWorkspace } = useWorkspace()

  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanPath, setScanPath] = useState(() => {
    // Load last scanned path from sessionStorage, default to /home/user
    return sessionStorage.getItem('lastScanPath') || '/home/user'
  })
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const scanPathInputRef = useRef<HTMLInputElement>(null)

  // Enhanced Dashboard state
  const [serviceStats, setServiceStats] = useState<ServiceStats>({ totalServices: 0, runningServices: 0, stoppedServices: 0 })
  const [recentSnapshots, setRecentSnapshots] = useState<Snapshot[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)

  // Save to workspace modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useState<'new' | 'existing'>('new')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDescription, setSnapshotDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [importEnvFiles, setImportEnvFiles] = useState(false)

  // Uncommitted changes dialog state
  const [uncommittedChangesDialog, setUncommittedChangesDialog] = useState<{
    isOpen: boolean
    snapshotId: string | null
    changes: UncommittedChange[]
    loading: boolean
  }>({
    isOpen: false,
    snapshotId: null,
    changes: [],
    loading: false,
  })

  // Delete snapshot handler
  const handleDeleteSnapshot = async (snapshotId: string, snapshotName: string) => {
    // Check if this is the active snapshot
    if (activeWorkspace?.activeSnapshotId === snapshotId) {
      toast.error('Cannot delete the active snapshot. Please clear or restore a different snapshot first.')
      return
    }

    if (!window.confirm(`Are you sure you want to delete snapshot "${snapshotName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await axios.delete(`/api/workspaces/snapshots/${snapshotId}`)
      toast.success(`Snapshot "${snapshotName}" deleted successfully`)
      fetchDashboardData()
    } catch (error: any) {
      toast.error(`Failed to delete snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  const fetchDashboardData = async () => {
    if (!activeWorkspace) {
      setDashboardLoading(false)
      return
    }

    setDashboardLoading(true)
    try {
      const [servicesRes, snapshotsRes] = await Promise.all([
        axios.get('/api/services'),
        axios.get(`/api/workspaces/${activeWorkspace.id}/snapshots?limit=5`),
      ])

      const services = servicesRes.data.services || []
      const runningCount = services.filter((s: any) => s.status === 'running').length
      setServiceStats({
        totalServices: services.length,
        runningServices: runningCount,
        stoppedServices: services.length - runningCount,
      })

      const snapshots = snapshotsRes.data.snapshots || []
      setRecentSnapshots(snapshots)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleQuickSnapshot = async () => {
    if (!activeWorkspace) {
      toast.error('No active workspace')
      return
    }

    try {
      // Backend generates its own timestamp-based name
      await axios.post('/api/workspaces/snapshots/quick')
      toast.success('Snapshot captured successfully')
      fetchDashboardData()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to capture snapshot'
      toast.error(errorMsg)
      console.error(err)
    }
  }

  // Check for uncommitted changes before restore
  const checkUncommittedChanges = async (snapshotId: string) => {
    try {
      const response = await axios.get(`/api/workspaces/snapshots/${snapshotId}/check-changes`)
      return response.data.changes || []
    } catch (error: any) {
      console.error('Error checking uncommitted changes:', error)
      toast.error('Failed to check for uncommitted changes')
      return []
    }
  }

  // Handle restore - check for uncommitted changes first
  const handleRestoreSnapshot = async (snapshotId: string) => {
    const changes = await checkUncommittedChanges(snapshotId)
    const hasUncommittedChanges = changes.some((c: UncommittedChange) => c.hasChanges)

    if (hasUncommittedChanges) {
      // Show uncommitted changes dialog
      setUncommittedChangesDialog({
        isOpen: true,
        snapshotId,
        changes,
        loading: false,
      })
    } else {
      // No uncommitted changes, proceed with restore
      await performRestore(snapshotId)
    }
  }

  // Handle stash and restore
  const handleStashAndRestore = async () => {
    if (!uncommittedChangesDialog.snapshotId) return

    setUncommittedChangesDialog(prev => ({ ...prev, loading: true }))

    try {
      // Get repos with changes
      const reposWithChanges = uncommittedChangesDialog.changes
        .filter(c => c.hasChanges)
        .map(c => c.path)

      // Stash changes
      const stashResponse = await axios.post(
        `/api/workspaces/snapshots/${uncommittedChangesDialog.snapshotId}/stash-changes`,
        { repoPaths: reposWithChanges }
      )

      if (!stashResponse.data.success) {
        throw new Error('Failed to stash changes')
      }

      // Close dialog
      setUncommittedChangesDialog({
        isOpen: false,
        snapshotId: null,
        changes: [],
        loading: false,
      })

      // Proceed with restore
      await performRestore(uncommittedChangesDialog.snapshotId)

      toast.success(
        `Stashed changes in ${stashResponse.data.stashed.length} ${
          stashResponse.data.stashed.length === 1 ? 'repository' : 'repositories'
        }`,
        { duration: 5000 }
      )
    } catch (error: any) {
      toast.error(`Failed to stash changes: ${error.response?.data?.error || error.message}`)
      setUncommittedChangesDialog(prev => ({ ...prev, loading: false }))
    }
  }

  // Handle commit and restore
  const handleCommitAndRestore = async (commitMessage: string) => {
    if (!uncommittedChangesDialog.snapshotId) return

    setUncommittedChangesDialog(prev => ({ ...prev, loading: true }))

    try {
      // Get repos with changes
      const reposWithChanges = uncommittedChangesDialog.changes
        .filter(c => c.hasChanges)
        .map(c => c.path)

      // Commit changes
      const commitResponse = await axios.post(
        `/api/workspaces/snapshots/${uncommittedChangesDialog.snapshotId}/commit-changes`,
        { repoPaths: reposWithChanges, commitMessage }
      )

      if (!commitResponse.data.success) {
        throw new Error('Failed to commit changes')
      }

      // Close dialog
      setUncommittedChangesDialog({
        isOpen: false,
        snapshotId: null,
        changes: [],
        loading: false,
      })

      // Proceed with restore
      await performRestore(uncommittedChangesDialog.snapshotId)

      toast.success(
        `Committed changes in ${commitResponse.data.committed.length} ${
          commitResponse.data.committed.length === 1 ? 'repository' : 'repositories'
        }`,
        { duration: 5000 }
      )
    } catch (error: any) {
      toast.error(`Failed to commit changes: ${error.response?.data?.error || error.message}`)
      setUncommittedChangesDialog(prev => ({ ...prev, loading: false }))
    }
  }

  // Perform the actual restore
  const performRestore = async (snapshotId: string) => {
    try {
      const response = await axios.post(`/api/workspaces/snapshots/${snapshotId}/restore`)

      if (response.data.success) {
        toast.success(
          `Snapshot restored! Started ${response.data.servicesStarted} service(s), switched ${response.data.branchesSwitched} branch(es)`,
          { duration: 5000 }
        )

        // Refresh dashboard data and workspace context
        fetchDashboardData()
        await refreshWorkspaces()
      } else if (response.data.errors && response.data.errors.length > 0) {
        toast.error(
          `Snapshot partially restored. Started ${response.data.servicesStarted} service(s), but ${response.data.errors.length} error(s) occurred`,
          { duration: 5000 }
        )

        // Still refresh data
        fetchDashboardData()
        await refreshWorkspaces()
      }
    } catch (error: any) {
      toast.error(`Failed to restore snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  const scanRepositories = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/repos/scan?path=${encodeURIComponent(scanPath)}`)
      const repositories = response.data.repositories
      setRepos(repositories)

      // Select all repos by default
      const allPaths = new Set<string>(repositories.map((repo: Repository) => repo.path))
      setSelectedRepos(allPaths)

      // Save last scanned path to sessionStorage
      sessionStorage.setItem('lastScanPath', scanPath)

      const count = repositories.length
      toast.success(`Found ${count} ${count === 1 ? 'repository' : 'repositories'}`)
    } catch (err) {
      const errorMsg = 'Failed to scan repositories'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleRepo = (path: string) => {
    const newSelected = new Set(selectedRepos)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedRepos(newSelected)
  }

  const toggleAllRepos = () => {
    if (selectedRepos.size === repos.length) {
      // Deselect all
      setSelectedRepos(new Set())
    } else {
      // Select all
      setSelectedRepos(new Set(repos.map(r => r.path)))
    }
  }

  const importEnvFilesToWorkspace = async (
    workspaceId: string,
    repoPaths: string[],
    snapshotName: string
  ) => {
    try {
      // Filter repos that have .env files
      const reposWithEnv = repos.filter(r => repoPaths.includes(r.path) && r.hasEnvFile)

      if (reposWithEnv.length === 0) {
        return
      }

      // Create one profile per repository + auto-create services (optimized)
      let successCount = 0
      let failCount = 0
      let servicesCreated = 0

      // Fetch existing services ONCE upfront
      const servicesResponse = await axios.get('/api/services', {
        params: { workspace_id: workspaceId }
      })
      const existingServices = servicesResponse.data.services || []

      for (const repo of reposWithEnv) {
        try {
          // Use repo name as profile name (e.g., "admin-api")
          const profileName = repo.name

          // 1. Create environment profile
          const createProfileResponse = await axios.post('/api/env/profiles', {
            name: profileName,
            description: `Auto-imported from ${repo.path} (${snapshotName})`,
            workspace_id: workspaceId,
          })

          const profileId = createProfileResponse.data.profile.id

          // 2. Import .env file to this profile
          const envFilePath = `${repo.path}/.env`
          await axios.post(`/api/env/profiles/${profileId}/import`, {
            filePath: envFilePath,
            serviceId: null, // Not tied to a specific service
            workspace_id: workspaceId, // Override active workspace check
          })

          // 3. Auto-create service if it doesn't exist
          try {
            const existingService = existingServices.find((s: any) => s.repoPath === repo.path)

            if (!existingService) {
              // Analyze the repository to get name, command, and port
              const analysisResponse = await axios.post('/api/repos/analyze', { repoPath: repo.path })
              const analysis = analysisResponse.data.analysis

              // Create service with analyzed data in the correct workspace
              await axios.post('/api/services', {
                name: analysis.name,
                repoPath: repo.path,
                command: analysis.command || 'npm start',
                port: analysis.port || undefined,
                workspace_id: workspaceId,
              })
              servicesCreated++
              // Add to existing services to avoid duplicates in same batch
              existingServices.push({ repoPath: repo.path })
            }
          } catch (serviceError) {
            console.error(`Failed to auto-create service for ${repo.path}:`, serviceError)
            // Don't fail the whole import if service creation fails
          }

          successCount++
        } catch (error) {
          console.error(`Failed to import .env from ${repo.path}:`, error)
          failCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Created ${successCount} environment profile${successCount > 1 ? 's' : ''} from .env files`)
      }
      if (servicesCreated > 0) {
        toast.success(`Auto-created ${servicesCreated} service${servicesCreated > 1 ? 's' : ''}`)
      }
      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} .env file${failCount > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error('Error importing env files:', error)
      toast.error('Failed to import environment files')
    }
  }

  const handleSaveToWorkspace = async () => {
    if (selectedRepos.size === 0) {
      toast.error('Please select at least one repository')
      return
    }

    if (workspaceMode === 'new' && !newWorkspaceName.trim()) {
      toast.error('Please enter a workspace name')
      return
    }

    if (workspaceMode === 'existing' && !selectedWorkspaceId) {
      toast.error('Please select a workspace')
      return
    }

    setSaving(true)
    try {
      let workspaceId = selectedWorkspaceId

      // Create new workspace if needed
      if (workspaceMode === 'new') {
        const workspace = await createWorkspace(
          newWorkspaceName,
          `Workspace for ${scanPath}`,
          scanPath
        )
        workspaceId = workspace.id

        // Activate the newly created workspace
        await axios.post(`/api/workspaces/${workspaceId}/activate`)
        await refreshWorkspaces() // Refresh to update active status

        toast.success(`Created and activated workspace: ${newWorkspaceName}`)
      }

      // Create snapshot with selected repos
      const repoPaths = Array.from(selectedRepos)
      const finalSnapshotName = snapshotName || `Scan - ${new Date().toLocaleString()}`
      const response = await axios.post(`/api/workspaces/${workspaceId}/snapshots`, {
        name: finalSnapshotName,
        description: snapshotDescription || `Scanned ${selectedRepos.size} repositories from ${scanPath}`,
        repoPaths,
        scannedPath: scanPath,
      })

      if (response.data.success) {
        toast.success(`Saved ${selectedRepos.size} repositories to workspace`)

        // Import .env files if checkbox is enabled
        if (importEnvFiles) {
          await importEnvFilesToWorkspace(workspaceId, Array.from(selectedRepos), finalSnapshotName)
        }

        setShowSaveModal(false)
        // Reset form
        setNewWorkspaceName('')
        setSnapshotName('')
        setSnapshotDescription('')
        setImportEnvFiles(false)
        await refreshWorkspaces()
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to save to workspace'
      toast.error(errorMsg)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Auto-select the scan path input on mount
  useEffect(() => {
    if (scanPathInputRef.current) {
      scanPathInputRef.current.select()
    }
  }, [])

  // Auto-populate workspace name when modal opens in "Create New" mode
  useEffect(() => {
    if (showSaveModal && workspaceMode === 'new') {
      // Extract folder name from path (e.g., /home/user/devhub -> devhub)
      const folderName = scanPath.split('/').filter(Boolean).pop() || 'workspace'
      // Capitalize first letter for nicer workspace name
      const workspaceName = folderName.charAt(0).toUpperCase() + folderName.slice(1)
      setNewWorkspaceName(workspaceName)
    }
  }, [showSaveModal, workspaceMode, scanPath])

  useEffect(() => {
    fetchDashboardData()
  }, [activeWorkspace])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your workspace and services</p>
      </div>

      {/* Active Workspace Section */}
      {activeWorkspace ? (
        <>
          {/* Workspace Overview */}
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Package size={28} />
                  <h2 className="text-2xl font-bold">{activeWorkspace.name}</h2>
                </div>
                {activeWorkspace.description && (
                  <p className="text-blue-100 mb-3">{activeWorkspace.description}</p>
                )}
                {activeWorkspace.folderPath && (
                  <p className="text-sm text-blue-100 font-mono">{activeWorkspace.folderPath}</p>
                )}
                {activeWorkspace.activeSnapshotId && (
                  <div className="mt-3 flex items-center gap-2 text-sm bg-green-500 bg-opacity-20 px-3 py-1.5 rounded-lg w-fit">
                    <CheckCircle size={16} />
                    <div className="flex flex-col">
                      <span className="font-semibold">Active Snapshot</span>
                      <span className="text-xs opacity-90">
                        {recentSnapshots.find(s => s.id === activeWorkspace.activeSnapshotId)?.name || 'Loading...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => onViewChange('workspaces')}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                data-testid="dashboard-manage-workspace-button"
              >
                Manage Workspace
              </button>
            </div>
          </div>

          {dashboardLoading ? (
            <SkeletonLoader count={3} />
          ) : (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Services Card */}
                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Services</h3>
                    <Settings className="text-gray-400" size={24} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="text-2xl font-bold text-gray-900">{serviceStats.totalServices}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Running</span>
                      </div>
                      <span className="text-lg font-semibold text-green-600">{serviceStats.runningServices}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">Stopped</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-600">{serviceStats.stoppedServices}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewChange('services')}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    data-testid="dashboard-manage-services-button"
                  >
                    Manage Services
                  </button>
                </div>

                {/* Snapshots Card */}
                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Snapshots</h3>
                    <Camera className="text-gray-400" size={24} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="text-2xl font-bold text-gray-900">{recentSnapshots.length}</span>
                    </div>
                    {recentSnapshots.length > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="text-gray-400" size={16} />
                          <span className="text-sm text-gray-600">Latest</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(recentSnapshots[0].createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {recentSnapshots.length === 0 ? (
                    <button
                      onClick={handleQuickSnapshot}
                      className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      data-testid="dashboard-quick-snapshot-button"
                    >
                      <Camera size={18} />
                      Quick Snapshot
                    </button>
                  ) : (
                    <button
                      onClick={() => onViewChange('workspaces')}
                      className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      data-testid="dashboard-manage-snapshots-button"
                    >
                      Manage Snapshots
                    </button>
                  )}
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                    <Zap className="text-yellow-500" size={24} />
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => onViewChange('env')}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left flex items-center gap-2"
                      data-testid="dashboard-environment-profiles-button"
                    >
                      <FileText size={18} />
                      Environment Profiles
                    </button>
                    <button
                      onClick={() => onViewChange('wiki')}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left flex items-center gap-2"
                      data-testid="dashboard-wiki-notes-button"
                    >
                      <FileText size={18} />
                      Wiki & Notes
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Snapshots List */}
              {recentSnapshots.length > 0 && (
                <div className="mb-6 bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Snapshots</h3>
                    <button
                      onClick={() => onViewChange('workspaces')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      data-testid="dashboard-view-all-snapshots-button"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3" data-testid="dashboard-snapshots-list">
                    {recentSnapshots.map((snapshot, index) => (
                      <div
                        key={snapshot.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          activeWorkspace.activeSnapshotId === snapshot.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                        data-testid={`dashboard-snapshot-item-${index}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{snapshot.name}</h4>
                            {activeWorkspace.activeSnapshotId === snapshot.id && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </div>
                          {snapshot.description && (
                            <p className="text-sm text-gray-600 mt-1">{snapshot.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(snapshot.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {activeWorkspace.activeSnapshotId !== snapshot.id && (
                          <div className="ml-4 flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreSnapshot(snapshot.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              data-testid={`dashboard-restore-snapshot-button-${index}`}
                            >
                              <RefreshCw size={16} />
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteSnapshot(snapshot.id, snapshot.name)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete snapshot"
                              data-testid={`dashboard-delete-snapshot-button-${index}`}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Workspace</h3>
              <p className="text-gray-700 mb-4">
                Create or activate a workspace to get started with DevHub.
              </p>
              <button
                onClick={() => onViewChange('workspaces')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                data-testid="dashboard-go-to-workspaces-button"
              >
                Go to Workspaces
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repository Scanner Section - Always Visible */}
      <div className="mb-6 bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Repository Scanner</h3>
          <p className="text-sm text-gray-600 mt-1">Scan for git repositories and save to workspace</p>
        </div>
        <div className="px-6 py-6">
          <div className="mb-6 flex gap-4">
            <input
              ref={scanPathInputRef}
              type="text"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              placeholder="Path to scan (e.g., /home/user)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="dashboard-scan-path-input"
            />
            <button
              onClick={scanRepositories}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="dashboard-scan-button"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {repos.length > 0 && (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleAllRepos}
                      className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium"
                      data-testid="dashboard-toggle-all-repos-button"
                    >
                      {selectedRepos.size === repos.length ? (
                        <CheckSquare size={20} />
                      ) : (
                        <Square size={20} />
                      )}
                      {selectedRepos.size === repos.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-blue-700">
                      {selectedRepos.size} of {repos.length} selected
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSaveModal(true)}
                    disabled={selectedRepos.size === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    data-testid="dashboard-save-to-workspace-button"
                  >
                    <Save size={18} />
                    Save to Workspace
                  </button>
                </div>
              </div>

              <div className="grid gap-4" data-testid="dashboard-repo-list">
                {repos.map((repo, index) => {
                  const isSelected = selectedRepos.has(repo.path)
                  return (
                    <div
                      key={repo.path}
                      className={`bg-white border rounded-lg p-6 hover:shadow-md transition-all cursor-pointer ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                      }`}
                      onClick={() => toggleRepo(repo.path)}
                      data-testid={`dashboard-repo-item-${index}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRepo(repo.path)
                            }}
                            className="mt-1"
                            data-testid={`dashboard-repo-checkbox-${index}`}
                          >
                            {isSelected ? (
                              <CheckSquare size={20} className="text-blue-600" />
                            ) : (
                              <Square size={20} className="text-gray-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">{repo.name}</h3>
                            <p className="text-sm text-gray-500 font-mono">{repo.path}</p>
                          </div>
                        </div>
                        {repo.hasDockerfile && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            Docker
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <GitBranch size={16} className="text-gray-400" />
                          <span className="font-medium">{repo.branch}</span>
                        </div>

                        {repo.hasChanges && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                            Uncommitted changes
                          </span>
                        )}
                      </div>

                      {repo.lastCommit && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-700 mb-1">{repo.lastCommit.message}</p>
                          <p className="text-xs text-gray-500">
                            {repo.lastCommit.author} • {new Date(repo.lastCommit.date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {loading && repos.length === 0 && (
            <SkeletonLoader count={3} />
          )}

          {repos.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-500">
              <Folder size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No repositories found. Try scanning a different path.</p>
            </div>
          )}
        </div>
      </div>

      {/* Save to Workspace Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Save to Workspace</h2>
            <p className="text-gray-600 mb-6">
              Save {selectedRepos.size} selected {selectedRepos.size === 1 ? 'repository' : 'repositories'} to a workspace
            </p>

            {/* Workspace Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workspace
              </label>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setWorkspaceMode('new')}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    workspaceMode === 'new'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                  data-testid="dashboard-workspace-mode-new-button"
                >
                  Create New
                </button>
                <button
                  onClick={() => setWorkspaceMode('existing')}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    workspaceMode === 'existing'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                  data-testid="dashboard-workspace-mode-existing-button"
                >
                  Use Existing
                </button>
              </div>

              {workspaceMode === 'new' ? (
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="dashboard-workspace-name-input"
                />
              ) : (
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="dashboard-workspace-select"
                >
                  <option value="">Select a workspace</option>
                  {allWorkspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Snapshot Details */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Snapshot Name (optional)
              </label>
              <input
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Auto-generated: Scan YYYY-MM-DD HH:MM:SS"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="dashboard-snapshot-name-input"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={snapshotDescription}
                onChange={(e) => setSnapshotDescription(e.target.value)}
                placeholder={`Scanned ${selectedRepos.size} repositories from ${scanPath}`}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="dashboard-snapshot-description-input"
              />
            </div>

            {/* Environment Variables Import */}
            {(() => {
              const envFileCount = repos.filter(r => selectedRepos.has(r.path) && r.hasEnvFile).length
              if (envFileCount > 0) {
                return (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importEnvFiles}
                        onChange={(e) => setImportEnvFiles(e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        data-testid="dashboard-import-env-checkbox"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          Import .env files to environment profiles
                        </span>
                        <p className="text-xs text-gray-600 mt-1">
                          {envFileCount} .env file{envFileCount > 1 ? 's' : ''} detected • Will create {envFileCount} profile{envFileCount > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Profile format: "{snapshotName || 'Scan - ...'} - {'{RepoName}'}"
                        </p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Env vars will be encrypted and stored securely
                        </p>
                      </div>
                    </label>
                  </div>
                )
              }
              return null
            })()}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                data-testid="dashboard-modal-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToWorkspace}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                data-testid="dashboard-modal-save-button"
              >
                {saving ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uncommitted Changes Dialog */}
      <UncommittedChangesDialog
        isOpen={uncommittedChangesDialog.isOpen}
        changes={uncommittedChangesDialog.changes}
        onStash={handleStashAndRestore}
        onCommit={handleCommitAndRestore}
        onCancel={() =>
          setUncommittedChangesDialog({
            isOpen: false,
            snapshotId: null,
            changes: [],
            loading: false,
          })
        }
        loading={uncommittedChangesDialog.loading}
      />
    </div>
  )
}
