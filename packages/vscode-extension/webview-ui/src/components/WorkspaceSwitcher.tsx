/**
 * Workspace Switcher Component
 *
 * Displays active workspace in header with dropdown to switch workspaces
 */

import { useEffect, useState } from 'react'
import { workspaceApi } from '../messaging/vscodeApi'
import '../styles/WorkspaceSwitcher.css'

interface Workspace {
  id: string
  name: string
  description?: string
  folderPath?: string
  active: number // 0 or 1 (stored as INTEGER in database)
}

export default function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchWorkspaces()

    // Listen for workspace changes from other components (like Workspaces tab)
    // Note: Don't refetch here when we initiated the change, only when external changes occur
    const handleWorkspaceChanged = (event: Event) => {
      // Check if we initiated this change
      const customEvent = event as CustomEvent
      if (customEvent.detail?.source === 'WorkspaceSwitcher') {
        console.log('[WorkspaceSwitcher] Ignoring our own workspace-changed event')
        return
      }
      console.log('[WorkspaceSwitcher] External workspace changed, refreshing...')
      fetchWorkspaces()
    }

    window.addEventListener('workspace-changed', handleWorkspaceChanged)
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChanged)
  }, [])

  const fetchWorkspaces = async () => {
    try {
      const result = await workspaceApi.getAll()
      // Backend returns array directly, not { workspaces: [] }
      const workspaceList = Array.isArray(result) ? result : []
      setWorkspaces(workspaceList)

      const active = workspaceList.find((w: Workspace) => w.active === 1)
      setActiveWorkspace(active || null)
    } catch (err) {
      console.error('Failed to fetch workspaces:', err)
    }
  }

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (loading) return

    setLoading(true)
    try {
      console.log('[WorkspaceSwitcher] Switching to workspace:', workspaceId)
      await workspaceApi.setActive(workspaceId)
      console.log('[WorkspaceSwitcher] Successfully activated workspace:', workspaceId)

      // Fetch workspaces to update our local state
      await fetchWorkspaces()
      setIsOpen(false)

      // Trigger refresh event for other components with the new workspace ID
      // This prevents race conditions where components fetch at different times
      console.log('[WorkspaceSwitcher] Dispatching workspace-changed event with workspaceId:', workspaceId)
      window.dispatchEvent(new CustomEvent('workspace-changed', {
        detail: {
          source: 'WorkspaceSwitcher',
          workspaceId: workspaceId
        }
      }))
    } catch (err) {
      console.error('Failed to switch workspace:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="workspace-switcher">
      <button
        className="workspace-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <span className="workspace-icon">📁</span>
        <span className="workspace-name">
          {activeWorkspace ? activeWorkspace.name : 'No Workspace'}
        </span>
        <span className="dropdown-icon">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="workspace-dropdown">
            {workspaces.length === 0 ? (
              <div className="dropdown-empty">
                <p>No workspaces available</p>
                <small>Create a workspace in the Workspaces tab</small>
              </div>
            ) : (
              <div className="workspace-list">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    className={`workspace-item ${workspace.active === 1 ? 'active' : ''}`}
                    onClick={() => handleSwitchWorkspace(workspace.id)}
                    disabled={workspace.active === 1 || loading}
                  >
                    <div className="workspace-item-content">
                      <span className="workspace-item-name">{workspace.name}</span>
                      {workspace.description && (
                        <span className="workspace-item-description">
                          {workspace.description}
                        </span>
                      )}
                      {workspace.folderPath && (
                        <span className="workspace-item-path">
                          {workspace.folderPath}
                        </span>
                      )}
                    </div>
                    {workspace.active === 1 && (
                      <span className="active-indicator">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
