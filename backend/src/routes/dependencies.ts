import express, { Request, Response } from 'express'
import { dependencyManager } from '../services/dependencyManager'

const router = express.Router()

/**
 * GET /api/dependencies/:serviceId
 * Get dependencies for a service
 */
router.get('/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const dependencies = dependencyManager.getDependencies(serviceId)
    res.json({ success: true, dependencies })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/dependencies
 * Add a dependency
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { serviceId, dependsOnServiceId, waitForHealth = true, startupDelay = 0 } = req.body

    if (!serviceId || !dependsOnServiceId) {
      return res.status(400).json({ success: false, error: 'serviceId and dependsOnServiceId are required' })
    }

    // Check for circular dependency
    if (dependencyManager.hasCircularDependency(serviceId)) {
      return res.status(400).json({ success: false, error: 'Circular dependency detected' })
    }

    const dependency = dependencyManager.addDependency(serviceId, dependsOnServiceId, waitForHealth, startupDelay)
    res.json({ success: true, dependency })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/dependencies/:id
 * Remove a dependency
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const success = dependencyManager.removeDependency(id)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Dependency not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/dependencies/workspace/:workspaceId/all
 * Get all dependencies in workspace
 */
router.get('/workspace/:workspaceId/all', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const dependencies = dependencyManager.getAllDependencies(workspaceId)
    res.json({ success: true, dependencies })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/dependencies/workspace/:workspaceId/graph
 * Get dependency graph for visualization
 */
router.get('/workspace/:workspaceId/graph', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const graph = dependencyManager.getDependencyGraph(workspaceId)
    res.json({ success: true, graph })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/dependencies/workspace/:workspaceId/startup-order
 * Get startup order for services
 */
router.post('/workspace/:workspaceId/startup-order', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const { serviceIds } = req.body

    if (!Array.isArray(serviceIds)) {
      return res.status(400).json({ success: false, error: 'serviceIds must be an array' })
    }

    const { order, cycles } = dependencyManager.getStartupOrder(serviceIds)

    if (cycles.length > 0) {
      return res.json({ success: true, order, cycles, hasCycles: true })
    }

    res.json({ success: true, order, cycles: [], hasCycles: false })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
