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
import { repoApi, serviceApi, workspaceApi, vscode } from '../messaging/vscodeApi'
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
  envFiles?: string[] // List of .env files found (.env, .env.development, etc.)
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
  // Map of repo path -> Set of selected env files
  const [selectedEnvFiles, setSelectedEnvFiles] = useState<Map<string, Set<string>>>(new Map())

  const scanPathInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Listen for messages from extension (e.g., snapshot deleted from tree view)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'snapshotDeleted') {
        console.log('[Dashboard] Snapshot deleted, refreshing data')
        fetchDashboardData()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch active workspace
      const workspace = await workspaceApi.getActive()
      setActiveWorkspace(workspace)

      if (!workspace) {
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
      const response = await repoApi.scan()

      // Handle response format - could be array or object with repositories property
      const repositories = Array.isArray(response) ? response : (response?.repositories || [])

      if (repositories.length === 0) {
        setError('No repositories found. Make sure you have git repositories in your workspace folder.')
      }

      setRepos(repositories)

      // Select all repos by default
      setSelectedRepos(new Set(repositories.map((r: Repository) => r.path)))

      // Initialize selected env files (select all env files by default)
      const envFilesMap = new Map<string, Set<string>>()
      repositories.forEach((r: Repository) => {
        if (r.envFiles && r.envFiles.length > 0) {
          envFilesMap.set(r.path, new Set(r.envFiles))
        }
      })
      setSelectedEnvFiles(envFilesMap)
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

  const toggleEnvFile = (repoPath: string, envFile: string) => {
    const newSelectedEnvFiles = new Map(selectedEnvFiles)
    const repoEnvFiles = newSelectedEnvFiles.get(repoPath) || new Set()

    if (repoEnvFiles.has(envFile)) {
      repoEnvFiles.delete(envFile)
    } else {
      repoEnvFiles.add(envFile)
    }

    if (repoEnvFiles.size > 0) {
      newSelectedEnvFiles.set(repoPath, repoEnvFiles)
    } else {
      newSelectedEnvFiles.delete(repoPath)
    }

    setSelectedEnvFiles(newSelectedEnvFiles)
  }

  const toggleAllEnvFilesForRepo = (repoPath: string, envFiles: string[]) => {
    const newSelectedEnvFiles = new Map(selectedEnvFiles)
    const repoEnvFiles = newSelectedEnvFiles.get(repoPath) || new Set()

    if (repoEnvFiles.size === envFiles.length) {
      // Deselect all
      newSelectedEnvFiles.delete(repoPath)
    } else {
      // Select all
      newSelectedEnvFiles.set(repoPath, new Set(envFiles))
    }

    setSelectedEnvFiles(newSelectedEnvFiles)
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

      // Create services from successful analyses
      const successfulAnalyses = analyses.filter((a: any) => a.success)
      const servicesToCreate = successfulAnalyses.map((result: any) => ({
        name: result.analysis.name,
        repoPath: result.repoPath,
        command: result.analysis.command || 'npm start',
        port: result.analysis.port || undefined,
      }))

      if (servicesToCreate.length > 0) {
        await serviceApi.batchCreate(servicesToCreate)
      }

      // Import selected .env files if enabled
      if (importEnvFiles) {
        for (const repo of selectedRepoObjects) {
          const repoEnvFiles = selectedEnvFiles.get(repo.path)
          if (repoEnvFiles && repoEnvFiles.size > 0) {
            for (const envFile of repoEnvFiles) {
              try {
                // Create env profile for each env file
                const profileName = envFile === '.env' ? repo.name : `${repo.name} (${envFile})`
                const profile = await serviceApi.createEnvProfile({
                  name: profileName,
                  description: `Auto-imported from ${repo.path}/${envFile}`
                })

                // Import env file
                await serviceApi.importEnvFile(profile.id, `${repo.path}/${envFile}`)
              } catch (err) {
                console.error(`[Dashboard] Failed to import ${envFile} from ${repo.path}:`, err)
              }
            }
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
    setLoading(true)
    try {
      console.log('[Dashboard] Creating quick snapshot...')
      await workspaceApi.createQuickSnapshot()
      console.log('[Dashboard] Quick snapshot created, fetching dashboard data...')
      await fetchDashboardData()
      console.log('[Dashboard] Refreshing workspaces tree view...')

      // Refresh workspaces tree view
      vscode.postMessage({ type: 'refreshWorkspacesTree' })
      console.log('[Dashboard] Tree view refresh message sent')
    } catch (err) {
      console.error('[Dashboard] Quick snapshot error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create snapshot')
    } finally {
      setLoading(false)
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
          <button
            className="btn-secondary"
            onClick={handleQuickSnapshot}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Quick Snapshot'}
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
          <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
            {repos.length > 0 ? `${repos.length} repositories found` : 'No repositories scanned yet'}
          </span>
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
              <label style={{ marginBottom: '16px' }}>
                <input
                  type="checkbox"
                  checked={importEnvFiles}
                  onChange={(e) => setImportEnvFiles(e.target.checked)}
                />
                <span>Import .env files to environment profiles</span>
              </label>

              {importEnvFiles && (
                <div className="env-files-section" style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--vscode-descriptionForeground)' }}>
                    Select .env files to import:
                  </p>
                  {repos.filter(r => selectedRepos.has(r.path) && r.envFiles && r.envFiles.length > 0).map(repo => {
                    const repoEnvFiles = repo.envFiles || []
                    const selectedRepoEnvFiles = selectedEnvFiles.get(repo.path) || new Set()

                    return (
                      <div key={repo.path} style={{
                        marginBottom: '12px',
                        padding: '12px',
                        background: 'var(--vscode-editor-background)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <strong style={{ fontSize: '13px' }}>{repo.name}</strong>
                          <button
                            className="btn-secondary btn-small"
                            onClick={() => toggleAllEnvFilesForRepo(repo.path, repoEnvFiles)}
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            {selectedRepoEnvFiles.size === repoEnvFiles.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        {repoEnvFiles.map(envFile => (
                          <label
                            key={envFile}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '4px 0'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRepoEnvFiles.has(envFile)}
                              onChange={() => toggleEnvFile(repo.path, envFile)}
                              style={{ margin: 0 }}
                            />
                            <span style={{
                              fontFamily: 'var(--vscode-editor-font-family)',
                              color: 'var(--vscode-foreground)'
                            }}>
                              {envFile}
                            </span>
                          </label>
                        ))}
                      </div>
                    )
                  })}
                  {repos.filter(r => selectedRepos.has(r.path) && r.envFiles && r.envFiles.length > 0).length === 0 && (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--vscode-descriptionForeground)',
                      fontStyle: 'italic'
                    }}>
                      No .env files detected in selected repositories
                    </p>
                  )}
                </div>
              )}
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
