import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import { Workspace } from '@devhub/shared'

interface WorkspaceContextType {
  activeWorkspace: Workspace | null
  allWorkspaces: Workspace[]
  isLoading: boolean
  error: string | null
  switchWorkspace: (workspaceId: string) => Promise<void>
  refreshWorkspaces: () => Promise<void>
  createWorkspace: (name: string, description?: string, folderPath?: string) => Promise<Workspace>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch all workspaces and identify the active one
   */
  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await axios.get('/api/workspaces')

      if (response.data.success) {
        const workspaces: Workspace[] = response.data.workspaces
        setAllWorkspaces(workspaces)

        // Find active workspace
        const active = workspaces.find(w => w.active)
        setActiveWorkspace(active || null)

        if (!active && workspaces.length > 0) {
          console.warn('No active workspace found. Consider activating one.')
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load workspaces'
      setError(errorMessage)
      console.error('Error fetching workspaces:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Switch to a different workspace
   */
  const switchWorkspace = async (workspaceId: string) => {
    try {
      setError(null)

      const response = await axios.post(`/api/workspaces/${workspaceId}/activate`)

      if (response.data.success) {
        // Refresh to get updated active status
        await fetchWorkspaces()
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to switch workspace'
      setError(errorMessage)
      console.error('Error switching workspace:', err)
      throw new Error(errorMessage)
    }
  }

  /**
   * Create a new workspace
   */
  const createWorkspace = async (
    name: string,
    description?: string,
    folderPath?: string
  ): Promise<Workspace> => {
    try {
      setError(null)

      const response = await axios.post('/api/workspaces', {
        name,
        description,
        folderPath,
      })

      if (response.data.success) {
        const newWorkspace: Workspace = response.data.workspace

        // Refresh workspaces list
        await fetchWorkspaces()

        return newWorkspace
      } else {
        throw new Error(response.data.error || 'Failed to create workspace')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create workspace'
      setError(errorMessage)
      console.error('Error creating workspace:', err)
      throw new Error(errorMessage)
    }
  }

  /**
   * Refresh workspaces list
   */
  const refreshWorkspaces = async () => {
    await fetchWorkspaces()
  }

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const value: WorkspaceContextType = {
    activeWorkspace,
    allWorkspaces,
    isLoading,
    error,
    switchWorkspace,
    refreshWorkspaces,
    createWorkspace,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

/**
 * Hook to use workspace context
 */
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
