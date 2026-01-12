import { useState } from 'react'
import { ChevronDown, Folder, Plus, Loader2, AlertCircle, Check, Sparkles } from 'lucide-react'
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
      <div className="flex items-center gap-3 text-sm text-[hsl(var(--foreground-muted))]">
        <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))]" />
        <span className="font-mono text-xs">Loading workspaces...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--danger))]">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    )
  }

  if (!activeWorkspace) {
    return (
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 glass-card rounded-lg">
            <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />
            <span className="text-sm text-[hsl(var(--warning))]">No active workspace</span>
          </div>
          <button
            onClick={() => {
              setIsCreating(true)
              setIsOpen(true)
            }}
            className="btn-glow px-4 py-2 text-sm font-medium text-[hsl(var(--background))] rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
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
            <div className="absolute top-full left-0 mt-2 w-80 glass-card rounded-xl z-20 animate-slide-down overflow-hidden">
              <div className="p-4">
                {/* Create New Workspace Form */}
                {isCreating && (
                  <form onSubmit={handleCreateWorkspace}>
                    <label className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))] mb-3">
                      <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
                      Create Your First Workspace
                    </label>
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={e => setNewWorkspaceName(e.target.value)}
                      placeholder="Workspace name..."
                      className="input-field text-sm mb-3"
                      autoFocus
                      disabled={isSwitching}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 btn-glow px-4 py-2 text-sm font-medium text-[hsl(var(--background))] rounded-lg disabled:opacity-50"
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
                        className="px-4 py-2 text-sm text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
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
    <div className="relative flex items-center gap-4">
      {/* Current Workspace Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 glass-card rounded-xl hover:border-[hsla(175,85%,50%,0.3)] transition-all duration-200 group"
        disabled={isSwitching}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(175,85%,50%)] to-[hsl(195,90%,45%)] flex items-center justify-center shadow-lg shadow-[hsla(175,85%,50%,0.2)]">
          <Folder className="h-4 w-4 text-[hsl(var(--background))]" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs text-[hsl(var(--foreground-muted))] uppercase tracking-wider">Workspace</span>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{activeWorkspace.name}</span>
        </div>
        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))] ml-2" />
        ) : (
          <ChevronDown className={`h-4 w-4 text-[hsl(var(--foreground-muted))] ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} group-hover:text-[hsl(var(--primary))]`} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-80 glass-card rounded-xl z-20 animate-slide-down overflow-hidden">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-wider flex items-center justify-between">
                <span>Workspaces</span>
                <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--border))] text-[hsl(var(--foreground-muted))] font-mono">
                  {allWorkspaces.length}
                </span>
              </div>

              {/* Workspace List */}
              <div className="max-h-64 overflow-y-auto">
                {allWorkspaces.map((workspace, index) => {
                  const isActive = workspace.id === activeWorkspace.id
                  return (
                    <button
                      key={workspace.id}
                      onClick={() => handleSwitchWorkspace(workspace.id)}
                      className={`
                        w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 animate-fade-in
                        ${isActive
                          ? 'bg-[hsla(175,85%,50%,0.1)] border border-[hsla(175,85%,50%,0.2)]'
                          : 'hover:bg-[hsl(var(--border))]'
                        }
                      `}
                      style={{ animationDelay: `${index * 0.03}s` }}
                      disabled={isSwitching}
                    >
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                        ${isActive
                          ? 'bg-gradient-to-br from-[hsl(175,85%,50%)] to-[hsl(195,90%,45%)]'
                          : 'bg-[hsl(var(--border))]'
                        }
                      `}>
                        {isActive ? (
                          <Check className="h-4 w-4 text-[hsl(var(--background))]" />
                        ) : (
                          <Folder className="h-4 w-4 text-[hsl(var(--foreground-muted))]" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${isActive ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>
                            {workspace.name}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-[hsla(175,85%,50%,0.2)] text-[hsl(var(--primary))] rounded">
                              Active
                            </span>
                          )}
                        </div>
                        {workspace.description && (
                          <p className="text-xs text-[hsl(var(--foreground-muted))] mt-0.5 truncate">{workspace.description}</p>
                        )}
                        {workspace.folderPath && (
                          <p className="text-xs text-[hsl(var(--foreground-muted))] opacity-60 mt-0.5 font-mono truncate">{workspace.folderPath}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Create New Workspace */}
              <div className="border-t border-[hsl(var(--border))] mt-2 pt-2">
                {isCreating ? (
                  <form onSubmit={handleCreateWorkspace} className="p-3">
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={e => setNewWorkspaceName(e.target.value)}
                      placeholder="Workspace name..."
                      className="input-field text-sm mb-3"
                      autoFocus
                      disabled={isSwitching}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 btn-glow px-3 py-2 text-sm font-medium text-[hsl(var(--background))] rounded-lg disabled:opacity-50"
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
                        className="px-3 py-2 text-sm text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
                        disabled={isSwitching}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--primary))] hover:bg-[hsla(175,85%,50%,0.1)] rounded-lg transition-colors"
                    disabled={isSwitching}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Create New Workspace</span>
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
