import { useEffect, useState } from 'react'
import {
  Save,
  RotateCcw,
  Trash2,
  Plus,
  Download,
  Zap,
  GitBranch,
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Folder,
  ChevronRight,
  Home,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ConfirmDialog from './ConfirmDialog'
import UncommittedChangesDialog from './UncommittedChangesDialog'
import StashManager from './StashManager'
import { SkeletonLoader } from './Loading'
import { useWorkspace } from '../contexts/WorkspaceContext'
import type { Workspace, WorkspaceSnapshot } from '@devhub/shared'

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

type ViewLevel = 'workspace-list' | 'workspace-detail' | 'snapshot-detail'

export default function Workspaces() {
  // Workspace context
  const { refreshWorkspaces: refreshGlobalWorkspaces } = useWorkspace()

  // Navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>('workspace-list')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)

  // Data state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<WorkspaceSnapshot | null>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [showCreateWorkspaceForm, setShowCreateWorkspaceForm] = useState(false)
  const [showCreateSnapshotForm, setShowCreateSnapshotForm] = useState(false)
  const [showScanForm, setShowScanForm] = useState(false)
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<string>>(new Set())

  // Forms
  const [createWorkspaceForm, setCreateWorkspaceForm] = useState({
    name: '',
    description: '',
    folderPath: '',
    tags: '',
  })
  const [createSnapshotForm, setCreateSnapshotForm] = useState({
    name: '',
    description: '',
    repoPaths: '',
    tags: '',
  })
  const [scanForm, setScanForm] = useState({
    path: '',
    name: '',
    description: '',
    depth: '3',
    tags: '',
    importEnvFiles: false,
  })

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'restore' | 'delete-workspace' | 'delete-snapshot' | 'delete-multiple-snapshots'
    id: string | null
    name: string
  }>({
    isOpen: false,
    type: 'restore',
    id: null,
    name: '',
  })

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

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/workspaces')
      setWorkspaces(response.data.workspaces || [])
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      toast.error('Failed to fetch workspaces')
    } finally {
      setLoading(false)
    }
  }

  // Fetch snapshots for a specific workspace
  const fetchSnapshots = async (workspaceId: string) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/workspaces/${workspaceId}/snapshots`)
      setSnapshots(response.data.snapshots || [])
    } catch (error) {
      console.error('Error fetching snapshots:', error)
      toast.error('Failed to fetch snapshots')
    } finally {
      setLoading(false)
    }
  }

  // Fetch snapshot details
  const fetchSnapshotDetails = async (snapshotId: string) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/workspaces/snapshots/${snapshotId}`)
      setSelectedSnapshot(response.data.snapshot)
    } catch (error) {
      console.error('Error fetching snapshot details:', error)
      toast.error('Failed to fetch snapshot details')
    } finally {
      setLoading(false)
    }
  }

  // Initial load - fetch workspaces
  useEffect(() => {
    if (viewLevel === 'workspace-list') {
      fetchWorkspaces()
    } else if (viewLevel === 'workspace-detail' && selectedWorkspaceId) {
      fetchSnapshots(selectedWorkspaceId)
    } else if (viewLevel === 'snapshot-detail' && selectedSnapshotId) {
      fetchSnapshotDetails(selectedSnapshotId)
    }
  }, [viewLevel, selectedWorkspaceId, selectedSnapshotId])

  // Clear selection when navigating away from workspace-detail
  useEffect(() => {
    if (viewLevel !== 'workspace-detail') {
      setSelectedSnapshots(new Set())
    }
  }, [viewLevel])

  // Navigation handlers
  const handleWorkspaceClick = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId)
    setViewLevel('workspace-detail')
  }

  const handleSnapshotClick = (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId)
    setViewLevel('snapshot-detail')
  }

  const handleBackToWorkspaces = () => {
    setSelectedWorkspaceId(null)
    setSnapshots([])
    setViewLevel('workspace-list')
  }

  const handleBackToSnapshots = () => {
    setSelectedSnapshotId(null)
    setSelectedSnapshot(null)
    setViewLevel('workspace-detail')
  }

  // Create workspace
  const handleCreateWorkspace = async () => {
    if (!createWorkspaceForm.name.trim()) {
      toast.error('Workspace name is required')
      return
    }

    try {
      const tags = createWorkspaceForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await axios.post('/api/workspaces', {
        name: createWorkspaceForm.name,
        description: createWorkspaceForm.description || undefined,
        folderPath: createWorkspaceForm.folderPath || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      setShowCreateWorkspaceForm(false)
      setCreateWorkspaceForm({ name: '', description: '', folderPath: '', tags: '' })
      fetchWorkspaces()
      toast.success(`Workspace "${createWorkspaceForm.name}" created successfully!`)
    } catch (error: any) {
      toast.error(`Failed to create workspace: ${error.response?.data?.error || error.message}`)
    }
  }

  // Activate workspace
  const handleActivateWorkspace = async (workspaceId: string) => {
    try {
      await axios.post(`/api/workspaces/${workspaceId}/activate`)
      fetchWorkspaces()
      // Also refresh global context so header updates
      await refreshGlobalWorkspaces()
      toast.success('Workspace activated!')
    } catch (error: any) {
      toast.error(`Failed to activate workspace: ${error.response?.data?.error || error.message}`)
    }
  }

  // Delete workspace
  const handleDeleteWorkspace = (workspaceId: string, workspaceName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete-workspace',
      id: workspaceId,
      name: workspaceName,
    })
  }

  const confirmDeleteWorkspace = async () => {
    if (!confirmDialog.id) return

    try {
      await axios.delete(`/api/workspaces/${confirmDialog.id}`)
      if (selectedWorkspaceId === confirmDialog.id) {
        handleBackToWorkspaces()
      }
      fetchWorkspaces()
      toast.success(`Workspace "${confirmDialog.name}" deleted`)
    } catch (error: any) {
      toast.error(`Failed to delete workspace: ${error.response?.data?.error || error.message}`)
    }
  }

  // Quick snapshot (creates in active workspace)
  const handleQuickSnapshot = async () => {
    try {
      await axios.post('/api/workspaces/snapshots/quick')
      if (selectedWorkspaceId) {
        fetchSnapshots(selectedWorkspaceId)
      }
      toast.success('Quick snapshot created!')
    } catch (error: any) {
      toast.error(`Failed to create snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  // Create snapshot
  const handleCreateSnapshot = async () => {
    if (!selectedWorkspaceId) {
      toast.error('No workspace selected')
      return
    }

    if (!createSnapshotForm.name.trim()) {
      toast.error('Snapshot name is required')
      return
    }

    if (!createSnapshotForm.repoPaths.trim()) {
      toast.error('At least one repository path is required')
      return
    }

    try {
      const repoPaths = createSnapshotForm.repoPaths
        .split(',')
        .map(p => p.trim())
        .filter(p => p)

      const tags = createSnapshotForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      await axios.post(`/api/workspaces/${selectedWorkspaceId}/snapshots`, {
        name: createSnapshotForm.name,
        description: createSnapshotForm.description || undefined,
        repoPaths,
        tags: tags.length > 0 ? tags : undefined,
      })

      setShowCreateSnapshotForm(false)
      setCreateSnapshotForm({ name: '', description: '', repoPaths: '', tags: '' })
      fetchSnapshots(selectedWorkspaceId)
      toast.success(`Snapshot "${createSnapshotForm.name}" created successfully!`)
    } catch (error: any) {
      toast.error(`Failed to create snapshot: ${error.response?.data?.error || error.message}`)
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

  // Restore snapshot - first check for uncommitted changes
  const handleRestore = async (snapshotId: string, snapshotName: string) => {
    // Check for uncommitted changes first
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
      // No uncommitted changes, show regular confirm dialog
      setConfirmDialog({
        isOpen: true,
        type: 'restore',
        id: snapshotId,
        name: snapshotName,
      })
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
    setRestoring(true)
    try {
      const response = await axios.post(`/api/workspaces/snapshots/${snapshotId}/restore`)

      if (response.data.success) {
        const parts = [
          `Started ${response.data.servicesStarted} service(s)`,
          `switched ${response.data.branchesSwitched} branch(es)`,
        ]
        if (response.data.envVarsRestored > 0) {
          parts.push(`restored ${response.data.envVarsRestored} env variable(s)`)
        }
        toast.success(
          `Workspace restored! ${parts.join(', ')}`,
          { duration: 5000 }
        )

        // Refresh workspace data to show active snapshot indicator
        if (selectedWorkspaceId) {
          const workspaceResponse = await axios.get(`/api/workspaces/${selectedWorkspaceId}`)
          const updatedWorkspace = workspaceResponse.data.workspace

          // Update the workspace in the workspaces array
          setWorkspaces(prev =>
            prev.map(w => w.id === selectedWorkspaceId ? updatedWorkspace : w)
          )
        }
      } else if (response.data.errors && response.data.errors.length > 0) {
        const parts = [`Started ${response.data.servicesStarted} service(s)`]
        if (response.data.envVarsRestored > 0) {
          parts.push(`restored ${response.data.envVarsRestored} env variable(s)`)
        }
        toast.error(
          `Workspace partially restored. ${parts.join(', ')}, but ${response.data.errors.length} error(s) occurred`,
          { duration: 5000 }
        )

        // Still refresh workspace to update active snapshot even if partial restore
        if (selectedWorkspaceId) {
          const workspaceResponse = await axios.get(`/api/workspaces/${selectedWorkspaceId}`)
          const updatedWorkspace = workspaceResponse.data.workspace

          // Update the workspace in the workspaces array
          setWorkspaces(prev =>
            prev.map(w => w.id === selectedWorkspaceId ? updatedWorkspace : w)
          )
        }
      }
    } catch (error: any) {
      toast.error(`Failed to restore workspace: ${error.response?.data?.error || error.message}`)
    } finally {
      setRestoring(false)
    }
  }

  // Confirm restore (when no uncommitted changes)
  const confirmRestore = async () => {
    if (!confirmDialog.id) return
    await performRestore(confirmDialog.id)
  }

  // Delete snapshot
  const handleDeleteSnapshot = (snapshotId: string, snapshotName: string) => {
    // Check if this is the active snapshot
    if (selectedWorkspace?.activeSnapshotId === snapshotId) {
      toast.error('Cannot delete the active snapshot. Please clear or restore a different snapshot first.')
      return
    }

    setConfirmDialog({
      isOpen: true,
      type: 'delete-snapshot',
      id: snapshotId,
      name: snapshotName,
    })
  }

  const confirmDeleteSnapshot = async () => {
    if (!confirmDialog.id || !selectedWorkspaceId) return

    try {
      await axios.delete(`/api/workspaces/snapshots/${confirmDialog.id}`)
      if (selectedSnapshotId === confirmDialog.id) {
        handleBackToSnapshots()
      }
      fetchSnapshots(selectedWorkspaceId)
      toast.success(`Snapshot "${confirmDialog.name}" deleted`)
    } catch (error: any) {
      toast.error(`Failed to delete snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  // Multi-select handlers
  const toggleSnapshotSelection = (snapshotId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    const newSelected = new Set(selectedSnapshots)
    if (newSelected.has(snapshotId)) {
      newSelected.delete(snapshotId)
    } else {
      newSelected.add(snapshotId)
    }
    setSelectedSnapshots(newSelected)
  }

  const toggleAllSnapshots = () => {
    if (selectedSnapshots.size === snapshots.length) {
      setSelectedSnapshots(new Set())
    } else {
      setSelectedSnapshots(new Set(snapshots.map(s => s.id)))
    }
  }

  const handleDeleteSelectedSnapshots = () => {
    // Check if active snapshot is in selection
    if (selectedWorkspace?.activeSnapshotId && selectedSnapshots.has(selectedWorkspace.activeSnapshotId)) {
      toast.error('Cannot delete the active snapshot. Please deselect it or clear the active snapshot first.')
      return
    }

    setConfirmDialog({
      isOpen: true,
      type: 'delete-multiple-snapshots',
      id: null,
      name: `${selectedSnapshots.size} snapshots`,
    })
  }

  const confirmDeleteMultipleSnapshots = async () => {
    if (!selectedWorkspaceId || selectedSnapshots.size === 0) return
    try {
      const deletePromises = Array.from(selectedSnapshots).map(snapshotId =>
        axios.delete(`/api/workspaces/snapshots/${snapshotId}`)
      )
      await Promise.all(deletePromises)

      // Clear selection and fetch updated list
      setSelectedSnapshots(new Set())
      fetchSnapshots(selectedWorkspaceId)
      toast.success(`${selectedSnapshots.size} snapshots deleted successfully`)
    } catch (error: any) {
      toast.error(`Failed to delete snapshots: ${error.response?.data?.error || error.message}`)
    }
  }

  // Clear active snapshot
  const handleClearActiveSnapshot = async () => {
    if (!selectedWorkspaceId) return

    try {
      await axios.post(`/api/workspaces/${selectedWorkspaceId}/clear-snapshot`)
      toast.success('Active snapshot cleared')

      // Refresh workspace to update activeSnapshotId
      const workspaceResponse = await axios.get(`/api/workspaces/${selectedWorkspaceId}`)
      const updatedWorkspace = workspaceResponse.data.workspace

      // Update the workspace in the workspaces array
      setWorkspaces(prev =>
        prev.map(w => w.id === selectedWorkspaceId ? updatedWorkspace : w)
      )
    } catch (error: any) {
      toast.error(`Failed to clear active snapshot: ${error.response?.data?.error || error.message}`)
    }
  }

  // Export snapshot
  const handleExport = async (snapshotId: string, snapshotName: string) => {
    try {
      const response = await axios.get(`/api/workspaces/snapshots/${snapshotId}/export`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `snapshot-${snapshotName}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success(`Snapshot "${snapshotName}" exported`)
    } catch (error: any) {
      toast.error(`Failed to export snapshot: ${error.message}`)
    }
  }

  // Import .env files to workspace
  const importEnvFilesToWorkspace = async (
    workspaceId: string,
    repositories: any[],
    snapshotName: string
  ) => {
    try {
      // Filter repos that have .env files
      const reposWithEnv = repositories.filter(r => r.hasEnvFile)

      if (reposWithEnv.length === 0) {
        return
      }

      // Create one profile per repository
      let successCount = 0
      let failCount = 0

      for (const repo of reposWithEnv) {
        try {
          // Create profile with format: "{SnapshotName} - {RepoName}"
          const profileName = `${snapshotName} - ${repo.name}`

          const createProfileResponse = await axios.post('/api/env/profiles', {
            name: profileName,
            description: `Auto-imported from ${repo.path}`,
            workspace_id: workspaceId,
          })

          const profileId = createProfileResponse.data.profile.id

          // Import .env file to this profile
          const envFilePath = `${repo.path}/.env`
          await axios.post(`/api/env/profiles/${profileId}/import`, {
            filePath: envFilePath,
            serviceId: null, // Not tied to a specific service
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
      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} .env file${failCount > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error('Error importing env files:', error)
      toast.error('Failed to import environment files')
    }
  }

  // Scan folder and create snapshot in workspace
  const handleScanFolder = async () => {
    if (!scanForm.path.trim()) {
      toast.error('Folder path is required')
      return
    }

    if (!scanForm.name.trim()) {
      toast.error('Snapshot name is required')
      return
    }

    setLoading(true)
    try {
      const tags = scanForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      const response = await axios.post('/api/workspaces/snapshots/scan', {
        path: scanForm.path,
        name: scanForm.name,
        description: scanForm.description || undefined,
        depth: parseInt(scanForm.depth, 10),
        tags: tags.length > 0 ? tags : undefined,
      })

      const snapshot = response.data.snapshot
      const repositories = response.data.scanResult?.repositories || []

      // Import .env files if checkbox is enabled
      if (scanForm.importEnvFiles && repositories.length > 0) {
        await importEnvFilesToWorkspace(snapshot.workspaceId, repositories, scanForm.name)
      }

      setShowScanForm(false)
      setScanForm({ path: '', name: '', description: '', depth: '3', tags: '', importEnvFiles: false })

      // Refresh workspaces to show the new/updated workspace
      fetchWorkspaces()

      toast.success(
        `Snapshot "${scanForm.name}" created! Found ${response.data.scanResult?.count || 0} repositories.`,
        { duration: 5000 }
      )
    } catch (error: any) {
      toast.error(`Failed to scan folder: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Get data for current view
  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Breadcrumb navigation
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={handleBackToWorkspaces}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
      >
        <Home className="w-4 h-4" />
        Workspaces
      </button>
      {selectedWorkspace && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {viewLevel === 'workspace-detail' ? (
            <span className="text-gray-900">{selectedWorkspace.name}</span>
          ) : (
            <button
              onClick={handleBackToSnapshots}
              className="text-blue-600 hover:text-blue-800"
            >
              {selectedWorkspace.name}
            </button>
          )}
        </>
      )}
      {selectedSnapshot && viewLevel === 'snapshot-detail' && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{selectedSnapshot.name}</span>
        </>
      )}
    </div>
  )

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      {viewLevel !== 'workspace-list' && renderBreadcrumb()}

      {/* View Level 1: Workspace List */}
      {viewLevel === 'workspace-list' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Workspaces</h1>
            <div className="flex gap-2">
              <button
                onClick={fetchWorkspaces}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowScanForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <Folder className="w-4 h-4" />
                Scan Folder
              </button>
              <button
                onClick={() => setShowCreateWorkspaceForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                New Workspace
              </button>
            </div>
          </div>

          {/* Create Workspace Form */}
          {showCreateWorkspaceForm && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold mb-3">Create New Workspace</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={createWorkspaceForm.name}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, name: e.target.value })}
                  placeholder="Workspace name *"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.description}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.folderPath}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, folderPath: e.target.value })}
                  placeholder="Folder path (optional)"
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.tags}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreateWorkspace}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateWorkspaceForm(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && workspaces.length === 0 ? (
              <SkeletonLoader count={3} />
            ) : workspaces.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500">
                <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No workspaces yet</p>
                <p className="text-sm mt-2">Create your first workspace to get started</p>
              </div>
            ) : (
              workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 p-4 cursor-pointer transition-colors"
                  onClick={() => handleWorkspaceClick(workspace.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{workspace.name}</h3>
                    {workspace.active && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Active</span>
                    )}
                  </div>
                  {workspace.description && (
                    <p className="text-sm text-gray-600 mb-3">{workspace.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      {workspace.snapshotCount || 0} snapshots
                    </span>
                    {workspace.folderPath && (
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        {workspace.folderPath.split('/').pop()}
                      </span>
                    )}
                  </div>
                  {workspace.tags && workspace.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {workspace.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleActivateWorkspace(workspace.id)
                      }}
                      className="flex-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Activate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWorkspace(workspace.id, workspace.name)
                      }}
                      className="px-3 py-1 text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* View Level 2: Workspace Detail (Snapshots List) */}
      {viewLevel === 'workspace-detail' && selectedWorkspace && (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{selectedWorkspace.name}</h1>
              {selectedWorkspace.description && (
                <p className="text-gray-600 mt-1">{selectedWorkspace.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchSnapshots(selectedWorkspaceId!)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleQuickSnapshot}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                <Zap className="w-4 h-4" />
                Quick Snapshot
              </button>
              <button
                onClick={() => setShowCreateSnapshotForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                New Snapshot
              </button>
            </div>
          </div>

          {/* Current Active Snapshot Info */}
          {selectedWorkspace.activeSnapshotId && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Active Snapshot</p>
                  <p className="text-sm text-green-700">
                    {snapshots.find(s => s.id === selectedWorkspace.activeSnapshotId)?.name || 'Unknown'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearActiveSnapshot}
                className="px-3 py-1.5 text-sm bg-white border border-green-300 text-green-700 rounded hover:bg-green-100"
              >
                Clear Active Snapshot
              </button>
            </div>
          )}

          {/* Create Snapshot Form */}
          {showCreateSnapshotForm && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold mb-3">Create Snapshot</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={createSnapshotForm.name}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, name: e.target.value })}
                  placeholder="Snapshot name *"
                  className="w-full px-3 py-2 border rounded"
                />
                <textarea
                  value={createSnapshotForm.description}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
                <textarea
                  value={createSnapshotForm.repoPaths}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, repoPaths: e.target.value })}
                  placeholder="Repository paths (comma-separated) *"
                  className="w-full px-3 py-2 border rounded font-mono text-sm"
                  rows={3}
                />
                <input
                  type="text"
                  value={createSnapshotForm.tags}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreateSnapshot}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateSnapshotForm(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Bulk Action Bar */}
          {snapshots.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleAllSnapshots}
                    className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium"
                  >
                    {selectedSnapshots.size === snapshots.length ? (
                      <CheckSquare size={20} />
                    ) : (
                      <Square size={20} />
                    )}
                    {selectedSnapshots.size === snapshots.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-blue-700">
                    {selectedSnapshots.size} of {snapshots.length} selected
                  </span>
                </div>
                {selectedSnapshots.size > 0 && (
                  <button
                    onClick={handleDeleteSelectedSnapshots}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete Selected ({selectedSnapshots.size})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Snapshots List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {loading && snapshots.length === 0 ? (
              <SkeletonLoader count={3} />
            ) : snapshots.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500">
                <Save className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No snapshots yet</p>
                <p className="text-sm mt-2">Create your first snapshot to save your workspace state</p>
              </div>
            ) : (
              snapshots.map((snapshot) => {
                const isActive = selectedWorkspace?.activeSnapshotId === snapshot.id
                const isSelected = selectedSnapshots.has(snapshot.id)

                return (
                  <div
                    key={snapshot.id}
                    className={`bg-white rounded-lg border-2 ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : isActive
                        ? 'border-green-500'
                        : 'border-gray-200 hover:border-blue-400'
                    } p-4 cursor-pointer transition-colors relative`}
                    onClick={() => handleSnapshotClick(snapshot.id)}
                  >
                    {/* Checkbox for multi-select */}
                    <div className="absolute top-4 left-4">
                      <button
                        onClick={(e) => !isActive && toggleSnapshotSelection(snapshot.id, e)}
                        disabled={isActive}
                        className={`p-1 rounded ${isActive ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}`}
                        title={isActive ? 'Cannot select active snapshot for deletion' : ''}
                      >
                        {isSelected ? (
                          <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                          <Square size={20} className={isActive ? "text-gray-300" : "text-gray-400"} />
                        )}
                      </button>
                    </div>

                    <div className="flex items-start justify-between mb-2 ml-8">
                      <h3 className="font-bold text-lg">{snapshot.name}</h3>
                      {isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                    {snapshot.description && (
                      <p className="text-sm text-gray-600 mb-3">{snapshot.description}</p>
                    )}
                  <div className="flex gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {snapshot.runningServices.length} services
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {snapshot.repositories.length} repos
                    </span>
                    {snapshot.envVariables && Object.keys(snapshot.envVariables).length > 0 && (
                      <span className="flex items-center gap-1" title="Environment variables">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        {Object.values(snapshot.envVariables).reduce((sum, vars) => sum + Object.keys(vars).length, 0)} env vars
                      </span>
                    )}
                  </div>
                  {snapshot.tags && snapshot.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {snapshot.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {formatDate(snapshot.createdAt)}
                  </div>
                </div>
                )
              })
            )}
          </div>

          {/* Stash Manager */}
          {snapshots.length > 0 && (
            <StashManager
              repoPaths={[...new Set(snapshots.flatMap(s => s.repositories.map(r => r.path)))]}
              onStashApplied={() => {
                // Optionally refresh snapshots or show a notification
                toast.success('Stash applied successfully!')
              }}
            />
          )}
        </>
      )}

      {/* View Level 3: Snapshot Detail */}
      {viewLevel === 'snapshot-detail' && selectedSnapshot && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{selectedSnapshot.name}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport(selectedSnapshot.id, selectedSnapshot.name)}
                className="p-2 text-blue-600 hover:text-blue-800"
                title="Export"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleRestore(selectedSnapshot.id, selectedSnapshot.name)}
                disabled={restoring}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
              <button
                onClick={() => handleDeleteSnapshot(selectedSnapshot.id, selectedSnapshot.name)}
                className="p-2 text-red-600 hover:text-red-800"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {selectedSnapshot.description && (
            <p className="text-gray-600 mb-6">{selectedSnapshot.description}</p>
          )}

          {/* Running Services */}
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Server className="w-5 h-5" />
              Running Services ({selectedSnapshot.runningServices.length})
            </h3>
            {selectedSnapshot.runningServices.length === 0 ? (
              <p className="text-sm text-gray-500 ml-7">No services were running</p>
            ) : (
              <div className="space-y-2 ml-7">
                {selectedSnapshot.runningServices.map((service, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{service.serviceName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repository Branches */}
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <GitBranch className="w-5 h-5" />
              Repository Branches ({selectedSnapshot.repositories.length})
            </h3>
            {selectedSnapshot.repositories.length === 0 ? (
              <p className="text-sm text-gray-500 ml-7">No repositories tracked</p>
            ) : (
              <div className="space-y-3 ml-7">
                {selectedSnapshot.repositories.map((repo, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-blue-600">{repo.branch}</span>
                      {repo.hasChanges && (
                        <span title="Had uncommitted changes">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{repo.path}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environment Variables */}
          {selectedSnapshot.envVariables && Object.keys(selectedSnapshot.envVariables).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Environment Variables ({Object.values(selectedSnapshot.envVariables).reduce((sum, vars) => sum + Object.keys(vars).length, 0)} total)
              </h3>
              <div className="space-y-3 ml-7">
                {Object.entries(selectedSnapshot.envVariables).map(([serviceId, vars]) => {
                  const service = selectedSnapshot.runningServices.find(s => s.serviceId === serviceId)
                  const serviceName = service?.serviceName || serviceId
                  return (
                    <div key={serviceId} className="border-l-2 border-blue-300 pl-3">
                      <div className="font-medium text-sm mb-1">{serviceName}</div>
                      <div className="text-xs text-gray-600">
                        {Object.keys(vars).length} variable{Object.keys(vars).length !== 1 ? 's' : ''}: {Object.keys(vars).join(', ')}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="ml-7 mt-2 text-xs text-blue-600">
                💡 These variables will be restored to a profile named "Snapshot: {selectedSnapshot.name}"
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t text-sm text-gray-500">
            <div>Created: {formatDate(selectedSnapshot.createdAt)}</div>
            <div>Updated: {formatDate(selectedSnapshot.updatedAt)}</div>
          </div>
        </div>
      )}

      {/* Scan Folder Form (shown at workspace list level) */}
      {showScanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Scan Folder & Create Snapshot</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={scanForm.path}
                onChange={(e) => setScanForm({ ...scanForm, path: e.target.value })}
                placeholder="Folder path to scan *"
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                value={scanForm.name}
                onChange={(e) => setScanForm({ ...scanForm, name: e.target.value })}
                placeholder="Snapshot name *"
                className="w-full px-3 py-2 border rounded"
              />
              <textarea
                value={scanForm.description}
                onChange={(e) => setScanForm({ ...scanForm, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={scanForm.depth}
                  onChange={(e) => setScanForm({ ...scanForm, depth: e.target.value })}
                  placeholder="Scan depth"
                  min="0"
                  max="5"
                  className="w-24 px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  value={scanForm.tags}
                  onChange={(e) => setScanForm({ ...scanForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="flex-1 px-3 py-2 border rounded"
                />
              </div>

              {/* Environment Variables Import Checkbox */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scanForm.importEnvFiles}
                    onChange={(e) => setScanForm({ ...scanForm, importEnvFiles: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      Import .env files to environment profiles
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      Will automatically import .env files from scanned repositories
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Profile format: "{scanForm.name || 'Snapshot'} - {'{RepoName}'}"
                    </p>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Env vars will be encrypted and stored securely
                    </p>
                  </div>
                </label>
              </div>

              <p className="text-xs text-gray-600">
                This will scan the folder for git repositories and create a workspace + snapshot.
              </p>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowScanForm(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleScanFolder}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  'Scan & Create'
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'restore', id: null, name: '' })}
        onConfirm={
          confirmDialog.type === 'restore'
            ? confirmRestore
            : confirmDialog.type === 'delete-workspace'
            ? confirmDeleteWorkspace
            : confirmDialog.type === 'delete-multiple-snapshots'
            ? confirmDeleteMultipleSnapshots
            : confirmDeleteSnapshot
        }
        title={
          confirmDialog.type === 'restore'
            ? 'Restore Snapshot'
            : confirmDialog.type === 'delete-workspace'
            ? 'Delete Workspace'
            : confirmDialog.type === 'delete-multiple-snapshots'
            ? 'Delete Multiple Snapshots'
            : 'Delete Snapshot'
        }
        message={
          confirmDialog.type === 'restore'
            ? `Are you sure you want to restore snapshot "${confirmDialog.name}"? This will stop all running services and switch git branches.`
            : confirmDialog.type === 'delete-workspace'
            ? `Are you sure you want to delete workspace "${confirmDialog.name}"? This will also delete all its snapshots. This action cannot be undone.`
            : confirmDialog.type === 'delete-multiple-snapshots'
            ? `Are you sure you want to delete ${confirmDialog.name}? This action cannot be undone.`
            : `Are you sure you want to delete snapshot "${confirmDialog.name}"? This action cannot be undone.`
        }
        confirmText={
          confirmDialog.type === 'restore' ? 'Restore' : 'Delete'
        }
        variant={confirmDialog.type === 'restore' ? 'warning' : 'danger'}
      />
    </div>
  )
}
