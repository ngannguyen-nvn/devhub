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

    // Listen for workspace changes from other components
    const handleWorkspaceChanged = () => {
      console.log('[WorkspaceSwitcher] Workspace changed, refreshing...')
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
      await workspaceApi.setActive(workspaceId)
      await fetchWorkspaces()
      setIsOpen(false)

      // Trigger refresh event for other components
      window.dispatchEvent(new CustomEvent('workspace-changed'))
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
