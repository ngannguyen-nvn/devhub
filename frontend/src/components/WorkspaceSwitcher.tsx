import { useState } from 'react'
import { ChevronDown, Folder, Plus, Loader2, AlertCircle } from 'lucide-react'
import { useWorkspace } from '../contexts/WorkspaceContext'
import toast from 'react-hot-toast'

export default function WorkspaceSwitcher() {
  const { activeWorkspace, allWorkspaces, isLoading, error, switchWorkspace, createWorkspace } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [isSwitching, setIsSwitching] = useState(false)

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) {
      setIsOpen(false)
      return
    }

    try {
      setIsSwitching(true)
      await switchWorkspace(workspaceId)
      setIsOpen(false)
      toast.success('Workspace switched successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to switch workspace')
    } finally {
      setIsSwitching(false)
    }
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newWorkspaceName.trim()) {
      toast.error('Workspace name is required')
      return
    }

    try {
      setIsSwitching(true)
      const newWorkspace = await createWorkspace(newWorkspaceName.trim())
      setNewWorkspaceName('')
      setIsCreating(false)
      setIsOpen(false)
      toast.success(`Workspace "${newWorkspace.name}" created`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workspace')
    } finally {
      setIsSwitching(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading workspaces...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    )
  }

  if (!activeWorkspace) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-600">No active workspace</span>
          <button
            onClick={() => {
              setIsCreating(true)
              setIsOpen(true)
            }}
            className="ml-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Workspace
          </button>
        </div>

        {/* Dropdown Menu for Create Form */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => {
              setIsOpen(false)
              setIsCreating(false)
              setNewWorkspaceName('')
            }} />

            {/* Menu */}
            <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <div className="p-2">
                {/* Create New Workspace Form */}
                {isCreating && (
                  <form onSubmit={handleCreateWorkspace} className="px-3 py-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Create Your First Workspace
                    </label>
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={e => setNewWorkspaceName(e.target.value)}
                      placeholder="Workspace name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      disabled={isSwitching}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        type="submit"
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={isSwitching}
                      >
                        {isSwitching ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreating(false)
                          setIsOpen(false)
                          setNewWorkspaceName('')
                        }}
                        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        disabled={isSwitching}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Current Workspace Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        disabled={isSwitching}
      >
        <Folder className="h-4 w-4 text-blue-600" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500">Current Workspace</span>
          <span className="text-sm font-medium text-gray-900">{activeWorkspace.name}</span>
        </div>
        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-2" />
        ) : (
          <ChevronDown className={`h-4 w-4 text-gray-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Workspaces ({allWorkspaces.length})
              </div>

              {/* Workspace List */}
              <div className="max-h-64 overflow-y-auto">
                {allWorkspaces.map(workspace => (
                  <button
                    key={workspace.id}
                    onClick={() => handleSwitchWorkspace(workspace.id)}
                    className={`w-full flex items-start gap-3 px-3 py-2 rounded hover:bg-gray-100 transition-colors ${
                      workspace.id === activeWorkspace.id ? 'bg-blue-50' : ''
                    }`}
                    disabled={isSwitching}
                  >
                    <Folder
                      className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        workspace.id === activeWorkspace.id ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            workspace.id === activeWorkspace.id ? 'text-blue-600' : 'text-gray-900'
                          }`}
                        >
                          {workspace.name}
                        </span>
                        {workspace.id === activeWorkspace.id && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Active</span>
                        )}
                      </div>
                      {workspace.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{workspace.description}</p>
                      )}
                      {workspace.folderPath && (
                        <p className="text-xs text-gray-400 mt-0.5 font-mono line-clamp-1">{workspace.folderPath}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Create New Workspace */}
              <div className="border-t border-gray-200 mt-2 pt-2">
                {isCreating ? (
                  <form onSubmit={handleCreateWorkspace} className="px-3 py-2">
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={e => setNewWorkspaceName(e.target.value)}
                      placeholder="Workspace name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      disabled={isSwitching}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={isSwitching}
                      >
                        {isSwitching ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreating(false)
                          setNewWorkspaceName('')
                        }}
                        className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        disabled={isSwitching}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    disabled={isSwitching}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create New Workspace</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
