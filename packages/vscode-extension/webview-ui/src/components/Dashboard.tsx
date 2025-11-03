/**
 * Dashboard Component
 *
 * Features:
 * - Repository scanner with auto-service creation
 * - Workspace overview and statistics
 * - Recent snapshots display
 * - Quick snapshot creation
 */

import { useState, useEffect, useRef } from 'react'
import { repoApi, serviceApi, workspaceApi } from '../messaging/vscodeApi'
import '../styles/Dashboard.css'

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

interface Workspace {
  id: string
  name: string
  description: string
  folderPath: string
  active: number
  createdAt: string
}

interface Snapshot {
  id: string
  name: string
  description: string
  workspaceId: string
  createdAt: string
}

export default function Dashboard() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())

  // Workspace state
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [recentSnapshots, setRecentSnapshots] = useState<Snapshot[]>([])
  const [serviceCount, setServiceCount] = useState({ total: 0, running: 0, stopped: 0 })

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importEnvFiles, setImportEnvFiles] = useState(true)

  const scanPathInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch active workspace
      const workspace = await workspaceApi.getActive()
      setActiveWorkspace(workspace)

      if (!workspace) {
        console.log('[Dashboard] No active workspace')
        return
      }

      // Fetch service stats
      const [allServices, runningServices] = await Promise.all([
        serviceApi.getAll(),
        serviceApi.getRunning()
      ])

      const allServicesArray = Array.isArray(allServices) ? allServices : []
      const runningServicesArray = Array.isArray(runningServices) ? runningServices : []

      setServiceCount({
        total: allServicesArray.length,
        running: runningServicesArray.length,
        stopped: allServicesArray.length - runningServicesArray.length
      })

      // Fetch recent snapshots
      const snapshotsResponse = await workspaceApi.getSnapshots(workspace.id)
      const snapshotsArray = Array.isArray(snapshotsResponse) ? snapshotsResponse : []
      setRecentSnapshots(snapshotsArray.slice(0, 5))
    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err)
    }
  }

  const handleScan = async () => {
    setScanning(true)
    setError(null)
    try {
      console.log('[Dashboard] Starting repo scan...')
      const response = await repoApi.scan()
      console.log('[Dashboard] Scan response:', response)

      // Handle response format - could be array or object with repositories property
      const repositories = Array.isArray(response) ? response : (response?.repositories || [])
      console.log('[Dashboard] Found', repositories.length, 'repositories')
      setRepos(repositories)

      // Select all by default
      setSelectedRepos(new Set(repositories.map((r: Repository) => r.path)))
    } catch (err) {
      console.error('[Dashboard] Scan error:', err)
      setError(err instanceof Error ? err.message : 'Failed to scan repositories')
    } finally {
      setScanning(false)
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
      setSelectedRepos(new Set())
    } else {
      setSelectedRepos(new Set(repos.map(r => r.path)))
    }
  }

  const handleImportServices = async () => {
    if (selectedRepos.size === 0) {
      setError('Please select at least one repository')
      return
    }

    setImporting(true)
    try {
      const selectedRepoPaths = Array.from(selectedRepos)
      const selectedRepoObjects = repos.filter(r => selectedRepoPaths.includes(r.path))

      // Batch analyze repos
      const analyses = await repoApi.analyzeBatch(selectedRepoPaths)
      console.log('[Dashboard] Analyzed', analyses.length, 'repos')

      // Create services from successful analyses
      const successfulAnalyses = analyses.filter((a: any) => a.success)
      const servicesToCreate = successfulAnalyses.map((result: any) => ({
        name: result.analysis.name,
        repoPath: result.repoPath,
        command: result.analysis.command || 'npm start',
        port: result.analysis.port || undefined,
      }))

      if (servicesToCreate.length > 0) {
        const createdServices = await serviceApi.batchCreate(servicesToCreate)
        console.log('[Dashboard] Created', createdServices?.length || servicesToCreate.length, 'services')
      }

      // Import .env files if enabled
      if (importEnvFiles) {
        const reposWithEnv = selectedRepoObjects.filter(r => r.hasEnvFile)
        for (const repo of reposWithEnv) {
          try {
            // Create env profile for this repo
            const profile = await serviceApi.createEnvProfile({
              name: repo.name,
              description: `Auto-imported from ${repo.path}`
            })

            // Import .env file
            await serviceApi.importEnvFile(profile.id, `${repo.path}/.env`)
          } catch (err) {
            console.error(`[Dashboard] Failed to import .env from ${repo.path}:`, err)
          }
        }
      }

      setShowImportModal(false)
      setRepos([])
      setSelectedRepos(new Set())
      await fetchDashboardData()
    } catch (err) {
      console.error('[Dashboard] Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import services')
    } finally {
      setImporting(false)
    }
  }

  const handleQuickSnapshot = async () => {
    try {
      await workspaceApi.createQuickSnapshot()
      await fetchDashboardData()
    } catch (err) {
      console.error('[Dashboard] Quick snapshot error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create snapshot')
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p>Overview of your workspace and services</p>
      </div>

      {/* Workspace Overview */}
      {activeWorkspace && (
        <div className="workspace-card">
          <h3>{activeWorkspace.name}</h3>
          {activeWorkspace.description && <p>{activeWorkspace.description}</p>}
          {activeWorkspace.folderPath && <div className="folder-path">{activeWorkspace.folderPath}</div>}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Services</h4>
          <div className="stat-number">{serviceCount.total}</div>
          <div className="stat-details">
            <span className="stat-running">● {serviceCount.running} running</span>
            <span className="stat-stopped">● {serviceCount.stopped} stopped</span>
          </div>
        </div>

        <div className="stat-card">
          <h4>Snapshots</h4>
          <div className="stat-number">{recentSnapshots.length}</div>
          {recentSnapshots.length > 0 && (
            <div className="stat-details">
              <span>Latest: {new Date(recentSnapshots[0].createdAt).toLocaleDateString()}</span>
            </div>
          )}
          <button className="btn-secondary" onClick={handleQuickSnapshot}>
            Quick Snapshot
          </button>
        </div>
      </div>

      {/* Recent Snapshots */}
      {recentSnapshots.length > 0 && (
        <div className="snapshots-section">
          <h3>Recent Snapshots</h3>
          <div className="snapshots-list">
            {recentSnapshots.map(snapshot => (
              <div key={snapshot.id} className="snapshot-item">
                <div className="snapshot-name">{snapshot.name}</div>
                <div className="snapshot-date">
                  {new Date(snapshot.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repository Scanner */}
      <div className="scanner-section">
        <h3>Repository Scanner</h3>
        <p>Scan for git repositories and automatically create services</p>

        <div className="scanner-controls">
          <button
            className="btn-primary"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : 'Scan Workspace'}
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {repos.length > 0 && (
          <>
            <div className="repo-actions">
              <button
                className="btn-secondary"
                onClick={toggleAllRepos}
              >
                {selectedRepos.size === repos.length ? 'Deselect All' : 'Select All'}
              </button>
              <span>{selectedRepos.size} of {repos.length} selected</span>
              <button
                className="btn-primary"
                onClick={() => setShowImportModal(true)}
                disabled={selectedRepos.size === 0}
              >
                Import Selected
              </button>
            </div>

            <div className="repo-list">
              {repos.map(repo => {
                const isSelected = selectedRepos.has(repo.path)
                return (
                  <div
                    key={repo.path}
                    className={`repo-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleRepo(repo.path)}
                  >
                    <div className="repo-header">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRepo(repo.path)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <h4>{repo.name}</h4>
                      {repo.hasDockerfile && <span className="badge">Docker</span>}
                      {repo.hasEnvFile && <span className="badge badge-env">.env</span>}
                    </div>
                    <div className="repo-path">{repo.path}</div>
                    <div className="repo-info">
                      <span className="branch">Branch: {repo.branch}</span>
                      {repo.hasChanges && <span className="changes">● Uncommitted changes</span>}
                    </div>
                    {repo.lastCommit && (
                      <div className="repo-commit">
                        <div className="commit-message">{repo.lastCommit.message}</div>
                        <div className="commit-meta">
                          {repo.lastCommit.author} • {new Date(repo.lastCommit.date).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import Services</h3>
            <p>
              Import {selectedRepos.size} selected {selectedRepos.size === 1 ? 'repository' : 'repositories'} as services
            </p>

            <div className="import-options">
              <label>
                <input
                  type="checkbox"
                  checked={importEnvFiles}
                  onChange={(e) => setImportEnvFiles(e.target.checked)}
                />
                <span>Import .env files to environment profiles</span>
              </label>
              <p className="import-note">
                {repos.filter(r => selectedRepos.has(r.path) && r.hasEnvFile).length} .env files detected
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowImportModal(false)}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleImportServices}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
