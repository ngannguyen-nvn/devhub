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

/**
 * Get all workspace snapshots
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const snapshots = workspaceManager.getAllSnapshots()
    res.json({ success: true, snapshots })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a specific snapshot
 */
router.get('/:snapshotId', (req: Request, res: Response) => {
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
 * Create a new workspace snapshot
 */
router.post('/', async (req: Request, res: Response) => {
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
 * Quick snapshot (capture current state)
 */
router.post('/quick', async (req: Request, res: Response) => {
  try {
    const snapshot = await workspaceManager.quickSnapshot()
    res.json({ success: true, snapshot })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a workspace snapshot
 */
router.put('/:snapshotId', (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const { name, description, tags, autoRestore } = req.body

    const updated = workspaceManager.updateSnapshot(snapshotId, {
      name,
      description,
      tags,
      autoRestore,
    })

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a workspace snapshot
 */
router.delete('/:snapshotId', (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const deleted = workspaceManager.deleteSnapshot(snapshotId)

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Restore a workspace snapshot
 */
router.post('/:snapshotId/restore', async (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const result = await workspaceManager.restoreSnapshot(snapshotId)

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Restore a workspace snapshot selectively
 * POST /api/workspaces/:snapshotId/restore-selective
 */
router.post('/:snapshotId/restore-selective', async (req: Request, res: Response) => {
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
 * Export workspace snapshot as JSON
 */
router.get('/:snapshotId/export', (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.params
    const json = workspaceManager.exportSnapshot(snapshotId)

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="workspace-${snapshotId}.json"`)
    res.send(json)
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Import workspace snapshot from JSON
 */
router.post('/import', (req: Request, res: Response) => {
  try {
    const { jsonData, name } = req.body

    if (!jsonData) {
      return res.status(400).json({ success: false, error: 'jsonData is required' })
    }

    const snapshot = workspaceManager.importSnapshot(jsonData, name)
    res.json({ success: true, snapshot })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Scan folder and create workspace
 * POST /api/workspaces/scan
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { path, name, description, depth = 3, activeEnvProfile, tags } = req.body

    if (!path) {
      return res.status(400).json({ success: false, error: 'path is required' })
    }

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' })
    }

    const maxDepth = parseInt(depth as string, 10)
    if (isNaN(maxDepth) || maxDepth < 0 || maxDepth > 5) {
      return res.status(400).json({ success: false, error: 'depth must be a number between 0 and 5' })
    }

    console.log(`Scanning ${path} for repositories (max depth: ${maxDepth})...`)

    // Scan for repositories
    const repositories = await repoScanner.scanDirectory(path, maxDepth)
    const repoPaths = repositories.map(r => r.path)

    if (repoPaths.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No git repositories found in the specified path',
      })
    }

    // Create snapshot with discovered repositories
    const snapshot = await workspaceManager.createSnapshot(
      name,
      description,
      repoPaths,
      activeEnvProfile,
      tags,
      path
    )

    res.json({
      success: true,
      snapshot,
      repositoriesFound: repositories.length,
      repositories,
    })
  } catch (error: any) {
    console.error('Error scanning folder:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Diff two snapshots
 */
router.post('/diff', (req: Request, res: Response) => {
  try {
    const { snapshot1Id, snapshot2Id } = req.body

    if (!snapshot1Id || !snapshot2Id) {
      return res.status(400).json({
        success: false,
        error: 'snapshot1Id and snapshot2Id are required',
      })
    }

    const diff = workspaceManager.diffSnapshots(snapshot1Id, snapshot2Id)
    res.json({ success: true, diff })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
