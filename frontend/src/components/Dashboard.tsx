import { useEffect, useState, useRef } from 'react'
import { GitBranch, RefreshCw, Folder, AlertCircle, Save, CheckSquare, Square } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { SkeletonLoader } from './Loading'
import { useWorkspace } from '../contexts/WorkspaceContext'

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
}

export default function Dashboard() {
  const { allWorkspaces, createWorkspace, refreshWorkspaces } = useWorkspace()
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanPath, setScanPath] = useState(() => {
    // Load last scanned path from sessionStorage, default to /home/user
    return sessionStorage.getItem('lastScanPath') || '/home/user'
  })
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const scanPathInputRef = useRef<HTMLInputElement>(null)

  // Save to workspace modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useState<'new' | 'existing'>('new')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDescription, setSnapshotDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const scanRepositories = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/repos/scan?path=${encodeURIComponent(scanPath)}`)
      const repositories = response.data.repositories
      setRepos(repositories)

      // Select all repos by default
      const allPaths = new Set(repositories.map((repo: Repository) => repo.path))
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
        toast.success(`Created workspace: ${newWorkspaceName}`)
      }

      // Create snapshot with selected repos
      const repoPaths = Array.from(selectedRepos)
      const response = await axios.post(`/api/workspaces/${workspaceId}/snapshots`, {
        name: snapshotName || `Scan - ${new Date().toLocaleString()}`,
        description: snapshotDescription || `Scanned ${selectedRepos.size} repositories from ${scanPath}`,
        repoPaths,
        scannedPath: scanPath,
      })

      if (response.data.success) {
        toast.success(`Saved ${selectedRepos.size} repositories to workspace`)
        setShowSaveModal(false)
        // Reset form
        setNewWorkspaceName('')
        setSnapshotName('')
        setSnapshotDescription('')
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
    scanRepositories()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Repository Dashboard</h1>
        <p className="text-gray-600">Manage all your git repositories in one place</p>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          ref={scanPathInputRef}
          type="text"
          value={scanPath}
          onChange={(e) => setScanPath(e.target.value)}
          placeholder="Path to scan (e.g., /home/user)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={scanRepositories}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleAllRepos}
                className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium"
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
            >
              <Save size={18} />
              Save to Workspace
            </button>
          </div>
        </div>
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

      <div className="grid gap-4">
        {repos.map((repo) => {
          const isSelected = selectedRepos.has(repo.path)
          return (
            <div
              key={repo.path}
              className={`bg-white border rounded-lg p-6 hover:shadow-md transition-all cursor-pointer ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              onClick={() => toggleRepo(repo.path)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRepo(repo.path)
                    }}
                    className="mt-1"
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
                />
              ) : (
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                placeholder={`Scan - ${new Date().toLocaleString()}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToWorkspace}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
    </div>
  )
}
