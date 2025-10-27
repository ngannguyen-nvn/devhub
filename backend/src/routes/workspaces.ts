import { Router, Request, Response } from 'express'
import { WorkspaceManager } from '../services/workspaceManager'
import { DockerManager } from '../services/dockerManager'
import { EnvManager } from '../services/envManager'
import { NotesManager } from '../services/notesManager'
import { RepoScanner } from '../services/repoScanner'
import { serviceManager } from './services'

const router = Router()

// Initialize all managers
const dockerManager = new DockerManager()
const envManager = new EnvManager()
const notesManager = new NotesManager()
const repoScanner = new RepoScanner()

const workspaceManager = new WorkspaceManager(
  serviceManager,
  dockerManager,
  envManager,
  notesManager
)

// ==================== WORKSPACE ROUTES ====================

/**
 * GET /api/workspaces
 * List all workspaces
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const workspaces = workspaceManager.getAllWorkspaces()
    res.json({ success: true, workspaces })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/workspaces/active
 * Get currently active workspace
 */
router.get('/active', (req: Request, res: Response) => {
  try {
    const workspace = workspaceManager.getActiveWorkspace()
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'No active workspace found' })
    }
    res.json({ success: true, workspace })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== SNAPSHOT ROUTES ====================
// These routes MUST come before /:workspaceId routes to avoid routing conflicts
// (otherwise "snapshots" gets interpreted as a workspaceId)

/**
 * GET /api/workspaces/snapshots
 * List all snapshots across all workspaces
 */
router.get('/snapshots', (req: Request, res: Response) => {
  try {
    const snapshots = workspaceManager.getAllSnapshots()
    res.json({ success: true, snapshots })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/snapshots
 * Create a snapshot (auto-creates/finds workspace based on scannedPath)
 */
router.post('/snapshots', async (req: Request, res: Response) => {
  try {
    const { name, description, repoPaths, activeEnvProfile, tags, scannedPath } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }

    if (!repoPaths || !Array.isArray(repoPaths)) {
      return res.status(400).json({ success: false, error: 'repoPaths array is required' })
    }

    const snapshot = await workspaceManager.createSnapshot(
      name,
      description,
      repoPaths,
      activeEnvProfile,
      tags,
      scannedPath
    )

    res.json({ success: true, snapshot })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/snapshots/quick
 * Quick snapshot (capture current state in active workspace)
 */
router.post('/snapshots/quick', async (req: Request, res: Response) => {
  try {
    const snapshot = await workspaceManager.quickSnapshot()
    res.json({ success: true, snapshot })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/snapshots/scan
 * Scan folder and create snapshot (auto-creates/finds workspace)
 */
router.post('/snapshots/scan', async (req: Request, res: Response) => {
  try {
    const { path, name, description, depth = 3, tags } = req.body

    if (!path) {
      return res.status(400).json({ success: false, error: 'Path is required' })
    }

    // Scan folder
    const scanResult = await repoScanner.scanDirectory(path, parseInt(depth as string))

    if (scanResult.repositories.length === 0) {
      return res.status(400).json({ success: false, error: 'No git repositories found in path' })
    }

    // Create snapshot with scanned repositories (workspace auto-created/found)
    const repoPaths = scanResult.repositories.map(r => r.path)
    const snapshot = await workspaceManager.createSnapshot(
      name || `Snapshot - ${new Date().toLocaleString()}`,
      description || `Scanned from ${path}`,
      repoPaths,
      undefined,
      tags ? tags.split(',').map((t: string) => t.trim()) : undefined,
      path
    )

    res.json({ success: true, snapshot, scanResult })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/workspaces/snapshots/:snapshotId
 * Get specific snapshot
 */
router.get('/snapshots/:snapshotId', (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const snapshot = workspaceManager.getSnapshot(snapshotId)

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }

    res.json({ success: true, snapshot })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/workspaces/snapshots/:snapshotId
 * Update snapshot
 */
router.put('/snapshots/:snapshotId', (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const { name, description, tags, autoRestore } = req.body

    const success = workspaceManager.updateSnapshot(snapshotId, {
      name,
      description,
      tags,
      autoRestore,
    })

    if (!success) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/workspaces/snapshots/:snapshotId
 * Delete snapshot
 */
router.delete('/snapshots/:snapshotId', (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const success = workspaceManager.deleteSnapshot(snapshotId)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/snapshots/:snapshotId/restore
 * Restore snapshot
 */
router.post('/snapshots/:snapshotId/restore', async (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const result = await workspaceManager.restoreSnapshot(snapshotId)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/snapshots/:snapshotId/restore-selective
 * Restore snapshot selectively
 */
router.post('/snapshots/:snapshotId/restore-selective', async (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const {
      restoreBranches = false,
      restoreServices = false,
      restoreDocker = false,
      restoreEnvVars = false,
    } = req.body

    const result = await workspaceManager.restoreSnapshotSelective(snapshotId, {
      restoreBranches,
      restoreServices,
      restoreDocker,
      restoreEnvVars,
    })

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/workspaces/snapshots/:snapshotId/export
 * Export snapshot as JSON
 */
router.get('/snapshots/:snapshotId/export', (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const snapshot = workspaceManager.getSnapshot(snapshotId)

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }

    res.setHeader('Content-Disposition', `attachment; filename="snapshot-${snapshotId}.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(snapshot, null, 2))
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/snapshots/import
 * Import snapshot from JSON
 */
router.post('/snapshots/import', (req: Request, res: Response) => {
  try {
    const { jsonData } = req.body

    if (!jsonData) {
      return res.status(400).json({ success: false, error: 'jsonData is required' })
    }

    // TODO: Implement import logic
    res.status(501).json({ success: false, error: 'Import not yet implemented' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== WORKSPACE-SPECIFIC ROUTES ====================

/**
 * POST /api/workspaces
 * Create a new workspace
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, folderPath, tags, setAsActive } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }

    const workspace = workspaceManager.createWorkspace({
      name,
      description,
      folderPath,
      tags,
      setAsActive,
    })

    res.json({ success: true, workspace })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/workspaces/:workspaceId
 * Get specific workspace details
 */
router.get('/:workspaceId', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const workspace = workspaceManager.getWorkspace(workspaceId)

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' })
    }

    res.json({ success: true, workspace })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/workspaces/:workspaceId
 * Update workspace
 */
router.put('/:workspaceId', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const { name, description, folderPath, tags } = req.body

    const workspace = workspaceManager.updateWorkspace(workspaceId, {
      name,
      description,
      folderPath,
      tags,
    })

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' })
    }

    res.json({ success: true, workspace })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/workspaces/:workspaceId
 * Delete workspace (cascade deletes all snapshots)
 */
router.delete('/:workspaceId', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const success = workspaceManager.deleteWorkspace(workspaceId)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Workspace not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/:workspaceId/activate
 * Set workspace as active
 */
router.post('/:workspaceId/activate', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const workspace = workspaceManager.setActiveWorkspace(workspaceId)

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' })
    }

    res.json({ success: true, workspace })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/workspaces/:workspaceId/snapshots
 * Get all snapshots for a workspace
 */
router.get('/:workspaceId/snapshots', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const snapshots = workspaceManager.getWorkspaceSnapshots(workspaceId)
    res.json({ success: true, snapshots })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/:workspaceId/snapshots
 * Create a snapshot in a workspace
 */
router.post('/:workspaceId/snapshots', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const { name, description, repoPaths, activeEnvProfile, tags, scannedPath } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }

    if (!repoPaths || !Array.isArray(repoPaths)) {
      return res.status(400).json({ success: false, error: 'repoPaths array is required' })
    }

    const snapshot = await workspaceManager.createSnapshot(
      name,
      description,
      repoPaths,
      activeEnvProfile,
      tags,
      scannedPath,
      workspaceId
    )

    res.json({ success: true, snapshot })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/workspaces/:workspaceId/scan
 * Scan folder and create snapshot in workspace
 */
router.post('/:workspaceId/scan', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const { path, name, description, depth = 3, tags } = req.body

    if (!path) {
      return res.status(400).json({ success: false, error: 'Path is required' })
    }

    // Scan folder
    const scanResult = await repoScanner.scanDirectory(path, parseInt(depth as string))

    if (scanResult.repositories.length === 0) {
      return res.status(400).json({ success: false, error: 'No git repositories found in path' })
    }

    // Create snapshot with scanned repositories
    const repoPaths = scanResult.repositories.map(r => r.path)
    const snapshot = await workspaceManager.createSnapshot(
      name || `Snapshot - ${new Date().toLocaleString()}`,
      description || `Scanned from ${path}`,
      repoPaths,
      undefined,
      tags ? tags.split(',').map((t: string) => t.trim()) : undefined,
      path,
      workspaceId
    )

    res.json({ success: true, snapshot, scanResult })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export { workspaceManager }
export default router
