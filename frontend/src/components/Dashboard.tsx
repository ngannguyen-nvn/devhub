import { useEffect, useState, useRef } from 'react'
import { GitBranch, RefreshCw, Folder, AlertCircle, Save, CheckSquare, Square, Camera, Settings, FileText, Zap, Package, CheckCircle, Clock, Trash2 } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { SkeletonLoader } from './Loading'
import { useWorkspace } from '../contexts/WorkspaceContext'
import UncommittedChangesDialog from './UncommittedChangesDialog'
import { EmptyState } from './ui/EmptyState'

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
  const { createWorkspace, refreshWorkspaces, activeWorkspace } = useWorkspace()

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

  // Save to workspace state
  const [saving, setSaving] = useState(false)
  const [importEnvFiles, setImportEnvFiles] = useState(true)
  const [createWorkspaceOnScan, setCreateWorkspaceOnScan] = useState(true)

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

      // Create one profile per repository + auto-create services (batch optimized)
      let successCount = 0
      let failCount = 0
      let servicesCreated = 0

      // 1. Fetch existing services ONCE upfront
      const servicesResponse = await axios.get('/api/services', {
        params: { workspace_id: workspaceId }
      })
      const existingServices = servicesResponse.data.services || []

      // 2. Batch create services for all repos that don't have services yet
      const reposNeedingServices = reposWithEnv.filter(repo =>
        !existingServices.find((s: any) => s.repoPath === repo.path)
      )

      if (reposNeedingServices.length > 0) {
        try {
          // Batch analyze all repos
          const analyzeBatchResponse = await axios.post('/api/repos/analyze-batch', {
            repoPaths: reposNeedingServices.map(repo => repo.path)
          })

          // Prepare services from successful analyses
          const successfulAnalyses = analyzeBatchResponse.data.results.filter((r: any) => r.success)
          const servicesToCreate = successfulAnalyses.map((result: any) => ({
            name: result.analysis.name,
            repoPath: result.repoPath,
            command: result.analysis.command || 'npm start',
            port: result.analysis.port || undefined,
          }))

          // Batch create services
          if (servicesToCreate.length > 0) {
            const batchCreateResponse = await axios.post('/api/services/batch', {
              services: servicesToCreate,
              workspace_id: workspaceId,
            })
            servicesCreated = batchCreateResponse.data.summary.created
          }
        } catch (serviceError) {
          console.error('Failed to batch create services:', serviceError)
          // Don't fail the whole import if service creation fails
        }
      }

      // 3. Create env profiles and import .env files (must be sequential due to dependencies)
      for (const repo of reposWithEnv) {
        try {
          // Use repo name as profile name (e.g., "admin-api")
          const profileName = repo.name

          // Create environment profile with source metadata
          const createProfileResponse = await axios.post('/api/env/profiles', {
            name: profileName,
            description: `Auto-imported from ${repo.path} (${snapshotName})`,
            workspace_id: workspaceId,
            sourceType: 'auto-import',
            sourceId: workspaceId, // Use workspace ID as source identifier
            sourceName: snapshotName, // e.g., "Scan - 29/10/2025, 20:07:50"
          })

          const profileId = createProfileResponse.data.profile.id

          // Import .env file to this profile
          const envFilePath = `${repo.path}/.env`
          await axios.post(`/api/env/profiles/${profileId}/import`, {
            filePath: envFilePath,
            serviceId: null, // Not tied to a specific service
            workspace_id: workspaceId, // Override active workspace check
          })

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

  const handleImportServices = async () => {
    if (selectedRepos.size === 0) {
      toast.error('Please select at least one repository')
      return
    }

    setSaving(true)
    try {
      let workspaceId = activeWorkspace?.id

      // Create new workspace if checkbox is checked
      if (createWorkspaceOnScan) {
        // Extract folder name from scan path for workspace name
        const folderName = scanPath.split('/').filter(Boolean).pop() || 'New Workspace'
        const workspaceName = `${folderName} - ${new Date().toLocaleDateString()}`

        const workspace = await createWorkspace(
          workspaceName,
          `Auto-created from scan with ${selectedRepos.size} repositories`,
          scanPath
        )
        workspaceId = workspace.id

        // Activate the newly created workspace
        await axios.post(`/api/workspaces/${workspaceId}/activate`)
        await refreshWorkspaces()

        toast.success(`Created and activated workspace: ${workspaceName}`)
      }

      if (!workspaceId) {
        toast.error('No active workspace. Please create or activate a workspace first.')
        setSaving(false)
        return
      }

      const repoPaths = Array.from(selectedRepos)
      const snapshotName = `Scan - ${new Date().toLocaleString()}`

      // Batch analyze repos and create services
      const analyzeBatchResponse = await axios.post('/api/repos/analyze-batch', {
        repoPaths
      })

      const successfulAnalyses = analyzeBatchResponse.data.results.filter((r: any) => r.success)
      const servicesToCreate = successfulAnalyses.map((result: any) => ({
        name: result.analysis.name,
        repoPath: result.repoPath,
        command: result.analysis.command || 'npm start',
        port: result.analysis.port || undefined,
      }))

      if (servicesToCreate.length > 0) {
        const batchCreateResponse = await axios.post('/api/services/batch', {
          services: servicesToCreate,
          workspace_id: workspaceId,
        })
        toast.success(`Created ${batchCreateResponse.data.summary.created} service(s)`)
      }

      // Import .env files if checkbox is enabled
      if (importEnvFiles) {
        await importEnvFilesToWorkspace(workspaceId, repoPaths, snapshotName)
      }

      // Clear repos after import
      setRepos([])
      setSelectedRepos(new Set())
      await refreshWorkspaces()
      fetchDashboardData()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to import services'
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

  useEffect(() => {
    fetchDashboardData()
  }, [activeWorkspace])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Dashboard</h1>
        <p className="text-[hsl(var(--foreground-muted))]">Overview of your workspace and services</p>
      </div>

      {/* Active Workspace Section */}
      {activeWorkspace ? (
        <>
          {/* Workspace Overview */}
          <div className="mb-6 glass-card rounded-xl p-6 border-glow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Package size={28} className="text-[hsl(var(--primary))]" />
                  <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{activeWorkspace.name}</h2>
                </div>
                {activeWorkspace.description && (
                  <p className="text-[hsl(var(--foreground-muted))] mb-3">{activeWorkspace.description}</p>
                )}
                {activeWorkspace.folderPath && (
                  <p className="text-sm text-[hsl(var(--foreground-muted))] font-mono terminal-text">{activeWorkspace.folderPath}</p>
                )}
                {activeWorkspace.activeSnapshotId && (
                  <div className="mt-3 flex items-center gap-2 text-sm bg-[hsla(var(--success),0.15)] border border-[hsla(var(--success),0.3)] px-3 py-1.5 rounded-lg w-fit">
                    <CheckCircle size={16} className="text-[hsl(var(--success))]" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-[hsl(var(--success))]">Active Snapshot</span>
                      <span className="text-xs text-[hsl(var(--foreground-muted))]">
                        {recentSnapshots.find(s => s.id === activeWorkspace.activeSnapshotId)?.name || 'Loading...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => onViewChange('workspaces')}
                className="btn-glow px-4 py-2 text-[hsl(var(--background))] rounded-xl font-medium"
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
                <div className="metric-card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Services</h3>
                    <Settings className="text-[hsl(var(--foreground-muted))]" size={24} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[hsl(var(--foreground-muted))]">Total</span>
                      <span className="metric-value">{serviceStats.totalServices}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[hsl(var(--success))] rounded-full"></div>
                        <span className="text-sm text-[hsl(var(--foreground-muted))]">Running</span>
                      </div>
                      <span className="text-lg font-semibold text-[hsl(var(--success))]">{serviceStats.runningServices}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[hsl(var(--foreground-muted))] rounded-full"></div>
                        <span className="text-sm text-[hsl(var(--foreground-muted))]">Stopped</span>
                      </div>
                      <span className="text-lg font-semibold text-[hsl(var(--foreground-muted))]">{serviceStats.stoppedServices}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewChange('services')}
                    className="mt-4 w-full btn-glow px-4 py-2 text-[hsl(var(--background))] rounded-xl font-medium"
                    data-testid="dashboard-manage-services-button"
                  >
                    Manage Services
                  </button>
                </div>

                {/* Snapshots Card */}
                <div className="metric-card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Snapshots</h3>
                    <Camera className="text-[hsl(var(--foreground-muted))]" size={24} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[hsl(var(--foreground-muted))]">Total</span>
                      <span className="metric-value">{recentSnapshots.length}</span>
                    </div>
                    {recentSnapshots.length > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="text-[hsl(var(--foreground-muted))]" size={16} />
                          <span className="text-sm text-[hsl(var(--foreground-muted))]">Latest</span>
                        </div>
                        <span className="text-xs text-[hsl(var(--foreground-muted))]">
                          {new Date(recentSnapshots[0].createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {recentSnapshots.length === 0 ? (
                    <button
                      onClick={handleQuickSnapshot}
                      className="mt-4 w-full px-4 py-2.5 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl font-medium hover:shadow-[0_0_20px_-5px_hsla(145,80%,45%,0.5)] transition-all flex items-center justify-center gap-2"
                      data-testid="dashboard-quick-snapshot-button"
                    >
                      <Camera size={18} />
                      Quick Snapshot
                    </button>
                  ) : (
                    <button
                      onClick={() => onViewChange('workspaces')}
                      className="mt-4 w-full btn-glow px-4 py-2 text-[hsl(var(--background))] rounded-xl font-medium"
                      data-testid="dashboard-manage-snapshots-button"
                    >
                      Manage Snapshots
                    </button>
                  )}
                </div>

                {/* Quick Actions Card */}
                <div className="metric-card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Quick Actions</h3>
                    <Zap className="text-[hsl(var(--warning))]" size={24} />
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => onViewChange('env')}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsla(var(--primary),0.1)] hover:text-[hsl(var(--primary))] transition-colors text-left flex items-center gap-2"
                      data-testid="dashboard-environment-profiles-button"
                    >
                      <FileText size={18} />
                      Environment Profiles
                    </button>
                    <button
                      onClick={() => onViewChange('wiki')}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:bg-[hsla(var(--primary),0.1)] hover:text-[hsl(var(--primary))] transition-colors text-left flex items-center gap-2"
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
                <div className="mb-6 glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Recent Snapshots</h3>
                    <button
                      onClick={() => onViewChange('workspaces')}
                      className="text-sm text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-glow))] font-medium transition-colors"
                      data-testid="dashboard-view-all-snapshots-button"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3" data-testid="dashboard-snapshots-list">
                    {recentSnapshots.map((snapshot, index) => (
                      <div
                        key={snapshot.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          activeWorkspace.activeSnapshotId === snapshot.id
                            ? 'border-[hsla(var(--success),0.3)] bg-[hsla(var(--success),0.08)]'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--background-elevated))] hover:border-[hsla(var(--primary),0.3)]'
                        }`}
                        data-testid={`dashboard-snapshot-item-${index}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[hsl(var(--foreground))]">{snapshot.name}</h4>
                            {activeWorkspace.activeSnapshotId === snapshot.id && (
                              <span className="px-2 py-1 bg-[hsla(var(--success),0.15)] text-[hsl(var(--success))] text-xs font-semibold rounded-lg flex items-center gap-1 border border-[hsla(var(--success),0.3)]">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </div>
                          {snapshot.description && (
                            <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">{snapshot.description}</p>
                          )}
                          <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1 terminal-text">
                            {new Date(snapshot.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {activeWorkspace.activeSnapshotId !== snapshot.id && (
                          <div className="ml-4 flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreSnapshot(snapshot.id)}
                              className="btn-glow px-4 py-2 text-[hsl(var(--background))] rounded-xl font-medium flex items-center gap-2"
                              data-testid={`dashboard-restore-snapshot-button-${index}`}
                            >
                              <RefreshCw size={16} />
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteSnapshot(snapshot.id, snapshot.name)}
                              className="p-2 text-[hsl(var(--danger))] hover:bg-[hsla(var(--danger),0.1)] rounded-xl transition-colors"
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
        <EmptyState
          icon={<AlertCircle size={48} className="text-amber-500" />}
          title="No Active Workspace"
          description="Create or activate a workspace to get started with DevHub."
          action={{
            label: 'Go to Workspaces',
            onClick: () => onViewChange('workspaces'),
          }}
          className="mb-6"
        />
      )}

      {/* Repository Scanner Section - Always Visible */}
      <div className="mb-6 glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[hsl(var(--border))]">
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Repository Scanner</h3>
          <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">Scan for git repositories and save to workspace</p>
        </div>
        <div className="px-6 py-6">
          <div className="mb-6 flex gap-4">
            <input
              ref={scanPathInputRef}
              type="text"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              placeholder="Path to scan (e.g., /home/user)"
              className="input-field flex-1 terminal-text"
              data-testid="dashboard-scan-path-input"
            />
            <button
              onClick={scanRepositories}
              disabled={loading}
              className="btn-glow px-6 py-2 text-[hsl(var(--background))] rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="dashboard-scan-button"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[hsla(var(--danger),0.1)] border border-[hsla(var(--danger),0.3)] rounded-xl flex items-center gap-3 text-[hsl(var(--danger))]">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {repos.length > 0 && (
            <>
              <div className="mb-6 p-4 bg-[hsla(var(--primary),0.08)] border border-[hsla(var(--primary),0.2)] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleAllRepos}
                      className="flex items-center gap-2 text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-glow))] font-medium transition-colors"
                      data-testid="dashboard-toggle-all-repos-button"
                    >
                      {selectedRepos.size === repos.length ? (
                        <CheckSquare size={20} />
                      ) : (
                        <Square size={20} />
                      )}
                      {selectedRepos.size === repos.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-[hsl(var(--primary))]">
                      {selectedRepos.size} of {repos.length} selected
                    </span>
                  </div>
                  <button
                    onClick={handleImportServices}
                    disabled={selectedRepos.size === 0 || saving}
                    className="btn-glow px-4 py-2 text-[hsl(var(--background))] rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    data-testid="dashboard-import-services-button"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Import Selected
                      </>
                    )}
                  </button>
                </div>

                {/* Scanner Options */}
                <div className="flex flex-wrap gap-6 pt-2 border-t border-[hsla(var(--primary),0.2)]">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors">
                    <input
                      type="checkbox"
                      checked={createWorkspaceOnScan}
                      onChange={(e) => setCreateWorkspaceOnScan(e.target.checked)}
                      className="w-4 h-4 rounded border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] focus:ring-offset-0"
                      data-testid="dashboard-create-workspace-checkbox"
                    />
                    <span>Automatically create new workspace for this scan</span>
                  </label>

                  {(() => {
                    const envFileCount = repos.filter(r => selectedRepos.has(r.path) && r.hasEnvFile).length
                    if (envFileCount > 0) {
                      return (
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors">
                          <input
                            type="checkbox"
                            checked={importEnvFiles}
                            onChange={(e) => setImportEnvFiles(e.target.checked)}
                            className="w-4 h-4 rounded border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] focus:ring-offset-0"
                            data-testid="dashboard-import-env-checkbox"
                          />
                          <span>Import .env files ({envFileCount} detected)</span>
                        </label>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>

              <div className="grid gap-4" data-testid="dashboard-repo-list">
                {repos.map((repo, index) => {
                  const isSelected = selectedRepos.has(repo.path)
                  return (
                    <div
                      key={repo.path}
                      className={`bg-[hsl(var(--background-elevated))] border rounded-xl p-6 card-hover cursor-pointer transition-all ${
                        isSelected ? 'border-[hsl(var(--primary))] shadow-[0_0_0_2px_hsla(175,85%,50%,0.2)]' : 'border-[hsl(var(--border))]'
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
                              <CheckSquare size={20} className="text-[hsl(var(--primary))]" />
                            ) : (
                              <Square size={20} className="text-[hsl(var(--foreground-muted))]" />
                            )}
                          </button>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-1">{repo.name}</h3>
                            <p className="text-sm text-[hsl(var(--foreground-muted))] font-mono terminal-text">{repo.path}</p>
                          </div>
                        </div>
                        {repo.hasDockerfile && (
                          <span className="px-3 py-1 bg-[hsla(var(--info),0.15)] text-[hsl(var(--info))] text-xs rounded-full font-medium border border-[hsla(var(--info),0.3)]">
                            Docker
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <GitBranch size={16} className="text-[hsl(var(--foreground-muted))]" />
                          <span className="font-medium text-[hsl(var(--foreground))]">{repo.branch}</span>
                        </div>

                        {repo.hasChanges && (
                          <span className="px-2 py-1 bg-[hsla(var(--warning),0.15)] text-[hsl(var(--warning))] text-xs rounded-lg font-medium border border-[hsla(var(--warning),0.3)]">
                            Uncommitted changes
                          </span>
                        )}
                      </div>

                      {repo.lastCommit && (
                        <div className="mt-4 pt-4 border-t border-[hsl(var(--border-subtle))]">
                          <p className="text-sm text-[hsl(var(--foreground))] mb-1">{repo.lastCommit.message}</p>
                          <p className="text-xs text-[hsl(var(--foreground-muted))] terminal-text">
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
            <EmptyState
              icon={<Folder size={48} className="text-[hsl(var(--foreground-muted))]" />}
              title="No repositories found"
              description="Try scanning a different path."
            />
          )}
        </div>
      </div>

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
