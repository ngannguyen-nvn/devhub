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
    autoImportEnv: false,
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

  // Quick snapshot dialog state
  const [quickSnapshotDialog, setQuickSnapshotDialog] = useState({
    isOpen: false,
    autoImportEnv: false,
  })

  // Restore options state
  const [restoreOptions, setRestoreOptions] = useState({
    applyEnvToFiles: false,
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
      // Also refresh global workspace context to update header
      refreshGlobalWorkspaces()
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
      // Also refresh global workspace context to update header
      refreshGlobalWorkspaces()
      toast.success(`Workspace "${confirmDialog.name}" deleted`)
    } catch (error: any) {
      toast.error(`Failed to delete workspace: ${error.response?.data?.error || error.message}`)
    }
  }

  // Quick snapshot (creates in active workspace)
  const handleQuickSnapshot = () => {
    // Show confirmation dialog
    setQuickSnapshotDialog({ isOpen: true, autoImportEnv: false })
  }

  const confirmQuickSnapshot = async () => {
    try {
      await axios.post('/api/workspaces/snapshots/quick', {
        autoImportEnv: quickSnapshotDialog.autoImportEnv,
      })
      if (selectedWorkspaceId) {
        fetchSnapshots(selectedWorkspaceId)
      }
      toast.success('Quick snapshot created!')
      setQuickSnapshotDialog({ isOpen: false, autoImportEnv: false })
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
        autoImportEnv: createSnapshotForm.autoImportEnv,
      })

      setShowCreateSnapshotForm(false)
      setCreateSnapshotForm({ name: '', description: '', repoPaths: '', tags: '', autoImportEnv: false })
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
      const response = await axios.post(`/api/workspaces/snapshots/${snapshotId}/restore`, {
        applyEnvToFiles: restoreOptions.applyEnvToFiles,
      })

      if (response.data.success) {
        const parts = [
          `Started ${response.data.servicesStarted} service(s)`,
          `switched ${response.data.branchesSwitched} branch(es)`,
        ]
        if (response.data.envFilesWritten > 0) {
          parts.push(`wrote ${response.data.envFilesWritten} .env file(s)`)
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
        if (response.data.envFilesWritten > 0) {
          parts.push(`wrote ${response.data.envFilesWritten} .env file(s)`)
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
      // Reset restore options after restore completes
      setRestoreOptions({ applyEnvToFiles: false })
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

      // Auto-create services for all scanned repositories (optimized batch processing)
      let servicesCreated = 0
      if (repositories.length > 0) {
        try {
          // 1. Fetch existing services ONCE (not per repo)
          const servicesResponse = await axios.get('/api/services', {
            params: { workspace_id: snapshot.workspaceId }
          })
          const existingServices = servicesResponse.data.services || []

          // 2. Filter repos that don't have services yet
          const reposToCreate = repositories.filter((repo: any) =>
            !existingServices.find((s: any) => s.repoPath === repo.path)
          )

          if (reposToCreate.length > 0) {
            // 3. Batch analyze all repos in a single API call
            const analyzeBatchResponse = await axios.post('/api/repos/analyze-batch', {
              repoPaths: reposToCreate.map((repo: any) => repo.path)
            })

            // 4. Prepare services data from successful analyses
            const successfulAnalyses = analyzeBatchResponse.data.results.filter((r: any) => r.success)
            const servicesToCreate = successfulAnalyses.map((result: any) => ({
              name: result.analysis.name,
              repoPath: result.repoPath,
              command: result.analysis.command || 'npm start',
              port: result.analysis.port || undefined,
            }))

            // 5. Batch create all services in a single API call
            if (servicesToCreate.length > 0) {
              const batchCreateResponse = await axios.post('/api/services/batch', {
                services: servicesToCreate,
                workspace_id: snapshot.workspaceId,
              })

              servicesCreated = batchCreateResponse.data.summary.created
            }
          }
        } catch (error) {
          console.error('Failed to auto-create services:', error)
          // Don't fail the scan if service creation fails
        }
      }

      // Import .env files if checkbox is enabled
      if (scanForm.importEnvFiles && repositories.length > 0) {
        await importEnvFilesToWorkspace(snapshot.workspaceId, repositories, scanForm.name)
      }

      setShowScanForm(false)
      setScanForm({ path: '', name: '', description: '', depth: '3', tags: '', importEnvFiles: false })

      // Refresh workspaces to show the new/updated workspace
      fetchWorkspaces()
      // Also refresh global workspace context to update header
      refreshGlobalWorkspaces()

      const messages = [`Snapshot "${scanForm.name}" created! Found ${response.data.scanResult?.count || 0} repositories.`]
      if (servicesCreated > 0) {
        messages.push(`Auto-created ${servicesCreated} service${servicesCreated > 1 ? 's' : ''}.`)
      }
      toast.success(messages.join(' '), { duration: 5000 })
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
    <div className="flex items-center gap-2 text-sm mb-4" data-testid="workspace-breadcrumb">
      <button
        onClick={handleBackToWorkspaces}
        className="flex items-center gap-1 text-[hsl(var(--primary))] hover:opacity-80"
        data-testid="workspace-breadcrumb-home-button"
      >
        <Home className="w-4 h-4" />
        Workspaces
      </button>
      {selectedWorkspace && (
        <>
          <ChevronRight className="w-4 h-4 text-[hsl(var(--foreground-muted))]" />
          {viewLevel === 'workspace-detail' ? (
            <span className="text-[hsl(var(--foreground))]">{selectedWorkspace.name}</span>
          ) : (
            <button
              onClick={handleBackToSnapshots}
              className="text-[hsl(var(--primary))] hover:opacity-80"
              data-testid="workspace-breadcrumb-workspace-button"
            >
              {selectedWorkspace.name}
            </button>
          )}
        </>
      )}
      {selectedSnapshot && viewLevel === 'snapshot-detail' && (
        <>
          <ChevronRight className="w-4 h-4 text-[hsl(var(--foreground-muted))]" />
          <span className="text-[hsl(var(--foreground))]">{selectedSnapshot.name}</span>
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
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Workspaces</h1>
            <div className="flex gap-2">
              <button
                onClick={fetchWorkspaces}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80"
                data-testid="workspace-refresh-button"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowScanForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--info))] text-[hsl(var(--background))] rounded-xl hover:opacity-90"
                data-testid="workspace-scan-folder-button"
              >
                <Folder className="w-4 h-4" />
                Scan Folder
              </button>
              <button
                onClick={() => setShowCreateWorkspaceForm(true)}
                className="flex items-center gap-2 px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
                data-testid="workspace-create-button"
              >
                <Plus className="w-4 h-4" />
                New Workspace
              </button>
            </div>
          </div>

          {/* Create Workspace Form */}
          {showCreateWorkspaceForm && (
            <div className="mb-6 p-4 glass-card rounded-xl border border-[hsl(var(--border))]" data-testid="workspace-create-form">
              <h3 className="font-semibold mb-3 text-[hsl(var(--foreground))]">Create New Workspace</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={createWorkspaceForm.name}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, name: e.target.value })}
                  placeholder="Workspace name *"
                  className="input-field w-full"
                  data-testid="workspace-name-input"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.description}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="input-field w-full"
                  data-testid="workspace-description-input"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.folderPath}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, folderPath: e.target.value })}
                  placeholder="Folder path (optional)"
                  className="input-field w-full"
                  data-testid="workspace-folderpath-input"
                />
                <input
                  type="text"
                  value={createWorkspaceForm.tags}
                  onChange={(e) => setCreateWorkspaceForm({ ...createWorkspaceForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="input-field w-full"
                  data-testid="workspace-tags-input"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreateWorkspace}
                  className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
                  data-testid="workspace-create-submit-button"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateWorkspaceForm(false)}
                  className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80"
                  data-testid="workspace-create-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="workspace-list">
            {loading && workspaces.length === 0 ? (
              <SkeletonLoader count={3} />
            ) : workspaces.length === 0 ? (
              <div className="col-span-full text-center py-16 text-[hsl(var(--foreground-muted))]">
                <Layers className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No workspaces yet</p>
                <p className="text-sm mt-2">Create your first workspace to get started</p>
              </div>
            ) : (
              workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="glass-card card-hover rounded-xl border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] p-4 cursor-pointer transition-colors"
                  onClick={() => handleWorkspaceClick(workspace.id)}
                  data-testid={`workspace-item-${workspace.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">{workspace.name}</h3>
                    {workspace.active && (
                      <span className="px-2 py-0.5 bg-[hsla(var(--success),0.1)] text-[hsl(var(--success))] text-xs rounded-xl">Active</span>
                    )}
                  </div>
                  {workspace.description && (
                    <p className="text-sm text-[hsl(var(--foreground-muted))] mb-3">{workspace.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-[hsl(var(--foreground-muted))] mb-3">
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
                        <span key={i} className="px-2 py-0.5 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] text-xs rounded-xl">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleActivateWorkspace(workspace.id)
                      }}
                      className="flex-1 px-3 py-1 text-xs bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:opacity-90"
                      data-testid={`workspace-activate-button-${workspace.id}`}
                    >
                      Activate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWorkspace(workspace.id, workspace.name)
                      }}
                      className="px-3 py-1 text-xs text-[hsl(var(--danger))] hover:opacity-80"
                      data-testid={`workspace-delete-button-${workspace.id}`}
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
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">{selectedWorkspace.name}</h1>
              {selectedWorkspace.description && (
                <p className="text-[hsl(var(--foreground-muted))] mt-1">{selectedWorkspace.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchSnapshots(selectedWorkspaceId!)}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80"
                data-testid="snapshot-refresh-button"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleQuickSnapshot}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--warning))] text-[hsl(var(--background))] rounded-xl hover:opacity-90"
                data-testid="snapshot-quick-button"
              >
                <Zap className="w-4 h-4" />
                Quick Snapshot
              </button>
              <button
                onClick={() => setShowCreateSnapshotForm(true)}
                className="flex items-center gap-2 px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
                data-testid="snapshot-create-button"
              >
                <Plus className="w-4 h-4" />
                New Snapshot
              </button>
            </div>
          </div>

          {/* Current Active Snapshot Info */}
          {selectedWorkspace.activeSnapshotId && (
            <div className="mb-6 p-4 bg-[hsla(var(--success),0.1)] border border-[hsl(var(--success))] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[hsl(var(--success))]" />
                <div>
                  <p className="font-semibold text-[hsl(var(--success))]">Active Snapshot</p>
                  <p className="text-sm text-[hsl(var(--foreground-muted))]">
                    {snapshots.find(s => s.id === selectedWorkspace.activeSnapshotId)?.name || 'Unknown'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearActiveSnapshot}
                className="px-3 py-1.5 text-sm bg-[hsl(var(--background-elevated))] border border-[hsl(var(--success))] text-[hsl(var(--success))] rounded-xl hover:opacity-80"
                data-testid="snapshot-clear-active-button"
              >
                Clear Active Snapshot
              </button>
            </div>
          )}

          {/* Create Snapshot Form */}
          {showCreateSnapshotForm && (
            <div className="mb-6 p-4 glass-card rounded-xl border border-[hsl(var(--border))]" data-testid="snapshot-create-form">
              <h3 className="font-semibold mb-3 text-[hsl(var(--foreground))]">Create Snapshot</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={createSnapshotForm.name}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, name: e.target.value })}
                  placeholder="Snapshot name *"
                  className="input-field w-full"
                  data-testid="snapshot-name-input"
                />
                <textarea
                  value={createSnapshotForm.description}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="input-field w-full"
                  rows={2}
                  data-testid="snapshot-description-input"
                />
                <textarea
                  value={createSnapshotForm.repoPaths}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, repoPaths: e.target.value })}
                  placeholder="Repository paths (comma-separated) *"
                  className="input-field w-full terminal-text text-sm"
                  rows={3}
                  data-testid="snapshot-repopaths-input"
                />
                <input
                  type="text"
                  value={createSnapshotForm.tags}
                  onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="input-field w-full"
                  data-testid="snapshot-tags-input"
                />
                <label className="flex items-start gap-3 cursor-pointer p-3 bg-[hsla(var(--success),0.1)] border border-[hsl(var(--success))] rounded-xl">
                  <input
                    type="checkbox"
                    checked={createSnapshotForm.autoImportEnv}
                    onChange={(e) => setCreateSnapshotForm({ ...createSnapshotForm, autoImportEnv: e.target.checked })}
                    className="mt-1 w-4 h-4 accent-[hsl(var(--primary))]"
                    data-testid="snapshot-auto-import-env-checkbox"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Auto-import .env files before snapshot
                    </span>
                    <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                      Scan and import all .env files from repositories before capturing workspace state
                    </p>
                  </div>
                </label>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreateSnapshot}
                  className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
                  data-testid="snapshot-create-submit-button"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateSnapshotForm(false)}
                  className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80"
                  data-testid="snapshot-create-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Bulk Action Bar */}
          {snapshots.length > 0 && (
            <div className="mb-4 p-4 bg-[hsla(var(--primary),0.08)] border border-[hsl(var(--border))] rounded-xl" data-testid="snapshot-bulk-action-bar">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleAllSnapshots}
                    className="flex items-center gap-2 text-[hsl(var(--primary))] hover:opacity-80 font-medium"
                    data-testid="snapshot-toggle-all-button"
                  >
                    {selectedSnapshots.size === snapshots.length ? (
                      <CheckSquare size={20} />
                    ) : (
                      <Square size={20} />
                    )}
                    {selectedSnapshots.size === snapshots.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-[hsl(var(--primary))]">
                    {selectedSnapshots.size} of {snapshots.length} selected
                  </span>
                </div>
                {selectedSnapshots.size > 0 && (
                  <button
                    onClick={handleDeleteSelectedSnapshots}
                    className="px-4 py-2 bg-[hsl(var(--danger))] text-white rounded-xl hover:opacity-90 flex items-center gap-2"
                    data-testid="snapshot-delete-selected-button"
                  >
                    <Trash2 size={18} />
                    Delete Selected ({selectedSnapshots.size})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Snapshots List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6" data-testid="snapshot-list">
            {loading && snapshots.length === 0 ? (
              <SkeletonLoader count={3} />
            ) : snapshots.length === 0 ? (
              <div className="col-span-full text-center py-16 text-[hsl(var(--foreground-muted))]">
                <Save className="w-16 h-16 mx-auto mb-4 opacity-30" />
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
                    className={`glass-card card-hover rounded-xl border-2 ${
                      isSelected
                        ? 'border-[hsl(var(--primary))] ring-2 ring-[hsla(var(--primary),0.2)]'
                        : isActive
                        ? 'border-[hsl(var(--success))]'
                        : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
                    } p-4 cursor-pointer transition-colors relative`}
                    onClick={() => handleSnapshotClick(snapshot.id)}
                    data-testid={`snapshot-item-${snapshot.id}`}
                  >
                    {/* Checkbox for multi-select */}
                    <div className="absolute top-4 left-4">
                      <button
                        onClick={(e) => !isActive && toggleSnapshotSelection(snapshot.id, e)}
                        disabled={isActive}
                        className={`p-1 rounded-xl ${isActive ? 'cursor-not-allowed opacity-50' : 'hover:bg-[hsl(var(--border))]'}`}
                        title={isActive ? 'Cannot select active snapshot for deletion' : ''}
                        data-testid={`snapshot-checkbox-${snapshot.id}`}
                      >
                        {isSelected ? (
                          <CheckSquare size={20} className="text-[hsl(var(--primary))]" />
                        ) : (
                          <Square size={20} className={isActive ? "opacity-30" : "text-[hsl(var(--foreground-muted))]"} />
                        )}
                      </button>
                    </div>

                    <div className="flex items-start justify-between mb-2 ml-8">
                      <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">{snapshot.name}</h3>
                      {isActive && (
                        <span className="px-2 py-1 bg-[hsla(var(--success),0.1)] text-[hsl(var(--success))] text-xs font-semibold rounded-xl flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                    {snapshot.description && (
                      <p className="text-sm text-[hsl(var(--foreground-muted))] mb-3">{snapshot.description}</p>
                    )}
                  <div className="flex gap-3 text-xs text-[hsl(var(--foreground-muted))] mb-2">
                    <span className="flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {snapshot.runningServices.length} services
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {snapshot.repositories.length} repos
                    </span>
                  </div>
                  {snapshot.tags && snapshot.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {snapshot.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[hsla(var(--primary),0.08)] text-[hsl(var(--primary))] text-xs rounded-xl">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-[hsl(var(--foreground-muted))] mt-2">
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
        <div className="glass-card rounded-xl p-6" data-testid="snapshot-detail-view">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{selectedSnapshot.name}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport(selectedSnapshot.id, selectedSnapshot.name)}
                className="p-2 text-[hsl(var(--primary))] hover:opacity-80"
                title="Export"
                data-testid="snapshot-export-button"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleRestore(selectedSnapshot.id, selectedSnapshot.name)}
                disabled={restoring}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 disabled:opacity-50"
                data-testid="snapshot-restore-button"
              >
                <RotateCcw className="w-4 h-4" />
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
              <button
                onClick={() => handleDeleteSnapshot(selectedSnapshot.id, selectedSnapshot.name)}
                className="p-2 text-[hsl(var(--danger))] hover:opacity-80"
                title="Delete"
                data-testid="snapshot-delete-button"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {selectedSnapshot.description && (
            <p className="text-[hsl(var(--foreground-muted))] mb-6">{selectedSnapshot.description}</p>
          )}

          {/* Running Services */}
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-[hsl(var(--foreground))]">
              <Server className="w-5 h-5" />
              Running Services ({selectedSnapshot.runningServices.length})
            </h3>
            {selectedSnapshot.runningServices.length === 0 ? (
              <p className="text-sm text-[hsl(var(--foreground-muted))] ml-7">No services were running</p>
            ) : (
              <div className="space-y-2 ml-7">
                {selectedSnapshot.runningServices.map((service, i) => (
                  <div key={i} className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                    <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />
                    <span>{service.serviceName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repository Branches */}
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-[hsl(var(--foreground))]">
              <GitBranch className="w-5 h-5" />
              Repository Branches ({selectedSnapshot.repositories.length})
            </h3>
            {selectedSnapshot.repositories.length === 0 ? (
              <p className="text-sm text-[hsl(var(--foreground-muted))] ml-7">No repositories tracked</p>
            ) : (
              <div className="space-y-3 ml-7">
                {selectedSnapshot.repositories.map((repo, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <span className="terminal-text text-sm text-[hsl(var(--primary))]">{repo.branch}</span>
                      {repo.hasChanges && (
                        <span title="Had uncommitted changes">
                          <AlertCircle className="w-4 h-4 text-[hsl(var(--warning))]" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[hsl(var(--foreground-muted))] terminal-text">{repo.path}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environment Variables - Commented out until envVariables is added to snapshot interface */}

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground-muted))]">
            <div>Created: {formatDate(selectedSnapshot.createdAt)}</div>
            <div>Updated: {formatDate(selectedSnapshot.updatedAt)}</div>
          </div>
        </div>
      )}

      {/* Scan Folder Form (shown at workspace list level) */}
      {showScanForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" data-testid="workspace-scan-modal">
          <div className="glass-card rounded-xl max-w-xl w-full mx-4 p-6" data-testid="workspace-scan-form">
            <h3 className="text-xl font-bold mb-4 text-[hsl(var(--foreground))]">Scan Folder & Create Snapshot</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={scanForm.path}
                onChange={(e) => setScanForm({ ...scanForm, path: e.target.value })}
                placeholder="Folder path to scan *"
                className="input-field w-full"
                data-testid="workspace-scan-path-input"
              />
              <input
                type="text"
                value={scanForm.name}
                onChange={(e) => setScanForm({ ...scanForm, name: e.target.value })}
                placeholder="Snapshot name *"
                className="input-field w-full"
                data-testid="workspace-scan-name-input"
              />
              <textarea
                value={scanForm.description}
                onChange={(e) => setScanForm({ ...scanForm, description: e.target.value })}
                placeholder="Description (optional)"
                className="input-field w-full"
                rows={2}
                data-testid="workspace-scan-description-input"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={scanForm.depth}
                  onChange={(e) => setScanForm({ ...scanForm, depth: e.target.value })}
                  placeholder="Scan depth"
                  min="0"
                  max="5"
                  className="input-field w-24"
                  data-testid="workspace-scan-depth-input"
                />
                <input
                  type="text"
                  value={scanForm.tags}
                  onChange={(e) => setScanForm({ ...scanForm, tags: e.target.value })}
                  placeholder="Tags (comma-separated, optional)"
                  className="input-field flex-1"
                  data-testid="workspace-scan-tags-input"
                />
              </div>

              {/* Environment Variables Import Checkbox */}
              <div className="p-4 bg-[hsla(var(--success),0.1)] border border-[hsl(var(--success))] rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scanForm.importEnvFiles}
                    onChange={(e) => setScanForm({ ...scanForm, importEnvFiles: e.target.checked })}
                    className="mt-1 w-4 h-4 accent-[hsl(var(--primary))]"
                    data-testid="workspace-scan-import-env-checkbox"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Import .env files to environment profiles
                    </span>
                    <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                      Will automatically import .env files from scanned repositories
                    </p>
                    <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                      Profile format: "{scanForm.name || 'Snapshot'} - {'{RepoName}'}"
                    </p>
                    <p className="text-xs text-[hsl(var(--foreground-muted))] mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Env vars will be encrypted and stored securely
                    </p>
                  </div>
                </label>
              </div>

              <p className="text-xs text-[hsl(var(--foreground-muted))]">
                This will scan the folder for git repositories and create a workspace + snapshot.
              </p>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowScanForm(false)}
                disabled={loading}
                className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="workspace-scan-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleScanFolder}
                disabled={loading}
                className="px-4 py-2 bg-[hsl(var(--info))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                data-testid="workspace-scan-submit-button"
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

      {/* Quick Snapshot Dialog */}
      {quickSnapshotDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--foreground))]">Create Quick Snapshot</h3>
            <p className="text-sm text-[hsl(var(--foreground-muted))] mb-4">
              This will create a snapshot of the current workspace state with an auto-generated name.
            </p>

            <label className="flex items-start gap-3 cursor-pointer p-3 bg-[hsla(var(--success),0.1)] border border-[hsl(var(--success))] rounded-xl mb-4">
              <input
                type="checkbox"
                checked={quickSnapshotDialog.autoImportEnv}
                onChange={(e) => setQuickSnapshotDialog({ ...quickSnapshotDialog, autoImportEnv: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[hsl(var(--primary))]"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Auto-import .env files before snapshot
                </span>
                <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                  Scan and import all .env files from repositories before capturing workspace state
                </p>
              </div>
            </label>

            <div className="flex gap-2">
              <button
                onClick={confirmQuickSnapshot}
                className="flex-1 px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
              >
                Create Snapshot
              </button>
              <button
                onClick={() => setQuickSnapshotDialog({ isOpen: false, autoImportEnv: false })}
                className="flex-1 px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
      >
        {/* Show checkbox for restore type */}
        {confirmDialog.type === 'restore' && (
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-[hsla(var(--success),0.1)] border border-[hsl(var(--success))] rounded-xl">
            <input
              type="checkbox"
              checked={restoreOptions.applyEnvToFiles}
              onChange={(e) => setRestoreOptions({ ...restoreOptions, applyEnvToFiles: e.target.checked })}
              className="mt-1 w-4 h-4 accent-[hsl(var(--primary))]"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                Apply environment variables to .env files
              </span>
              <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                Export snapshot env variables back to .env files in repositories
              </p>
            </div>
          </label>
        )}
      </ConfirmDialog>
    </div>
  )
}
