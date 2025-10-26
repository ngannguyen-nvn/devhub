import { Router, Request, Response } from 'express'
import { WorkspaceManager } from '../services/workspaceManager'
import { serviceManager } from './services'

const router = Router()
const workspaceManager = new WorkspaceManager(serviceManager)

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
    const { name, description, repoPaths, activeEnvProfile, tags } = req.body

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
      tags
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

    res.json({ success: true, ...result })
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
