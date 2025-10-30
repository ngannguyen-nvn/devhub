import { Router, Request, Response } from 'express'
import { serviceManager } from '../services/serviceManager'

const router = Router()

/**
 * Middleware to get active workspace ID
 * Can be overridden by workspace_id query param
 */
async function getWorkspaceId(req: Request): Promise<string> {
  // Allow explicit workspace_id in query or body
  const explicitWorkspaceId = req.query.workspace_id || req.body?.workspace_id

  if (explicitWorkspaceId && typeof explicitWorkspaceId === 'string') {
    return explicitWorkspaceId
  }

  // Otherwise, use active workspace
  const db = require('../db').default
  const stmt = db.prepare('SELECT id FROM workspaces WHERE active = 1 LIMIT 1')
  const row = stmt.get() as { id: string } | undefined

  if (!row) {
    throw new Error('No active workspace found. Please activate a workspace first.')
  }

  return row.id
}

/**
 * GET /api/services
 * Get all services for active workspace (or specified workspace_id)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const running = serviceManager.getRunningServices()

    // Merge service definitions with running status
    const servicesWithStatus = services.map(service => ({
      ...service,
      status: running.find(r => r.id === service.id)?.status || 'stopped',
      pid: running.find(r => r.id === service.id)?.pid,
    }))

    res.json({ success: true, services: servicesWithStatus, workspaceId })
  } catch (error) {
    console.error('Error getting services:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/services/:id
 * Get a specific service
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    const running = serviceManager.getServiceStatus(req.params.id)

    res.json({
      success: true,
      service: {
        ...service,
        status: running?.status || 'stopped',
        pid: running?.pid,
      },
    })
  } catch (error) {
    console.error('Error getting service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services
 * Create a new service in active workspace (or specified workspace_id)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, repoPath, command, port, envVars } = req.body

    if (!name || !repoPath || !command) {
      return res.status(400).json({
        success: false,
        error: 'Name, repoPath, and command are required',
      })
    }

    const workspaceId = await getWorkspaceId(req)

    const service = serviceManager.createService(workspaceId, {
      name,
      repoPath,
      command,
      port,
      envVars,
    })

    res.json({ success: true, service })
  } catch (error) {
    console.error('Error creating service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * PUT /api/services/:id
 * Update a service
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, repoPath, command, port, envVars } = req.body

    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    const updated = serviceManager.updateService(req.params.id, {
      name,
      repoPath,
      command,
      port,
      envVars,
    })

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * DELETE /api/services/:id
 * Delete a service
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    const deleted = serviceManager.deleteService(req.params.id)

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services/:id/start
 * Start a service
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    await serviceManager.startService(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error starting service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services/:id/stop
 * Stop a service
 */
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    serviceManager.stopService(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error stopping service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/services/:id/logs
 * Get service logs
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    const lines = req.query.lines ? parseInt(req.query.lines as string, 10) : 100
    const logs = serviceManager.getServiceLogs(req.params.id, lines)

    res.json({ success: true, logs })
  } catch (error) {
    console.error('Error getting logs:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services/batch
 * Create multiple services in a single request
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { services } = req.body

    if (!Array.isArray(services)) {
      return res.status(400).json({ error: 'services must be an array' })
    }

    if (services.length === 0) {
      return res.status(400).json({ error: 'services array cannot be empty' })
    }

    // Get workspace ID (can be overridden in body or uses active workspace)
    const workspaceId = await getWorkspaceId(req)

    // Get existing services to check for duplicates
    const existingServices = serviceManager.getAllServices(workspaceId)
    const existingRepoPaths = new Set(existingServices.map(s => s.repoPath))

    const results = {
      created: [] as any[],
      skipped: [] as any[],
      failed: [] as any[],
    }

    // Process all services
    for (const serviceData of services) {
      try {
        // Validate required fields
        if (!serviceData.name || !serviceData.repoPath || !serviceData.command) {
          results.failed.push({
            service: serviceData,
            error: 'Missing required fields (name, repoPath, command)',
          })
          continue
        }

        // Check for duplicate
        if (existingRepoPaths.has(serviceData.repoPath)) {
          results.skipped.push({
            repoPath: serviceData.repoPath,
            name: serviceData.name,
            reason: 'Service with this repoPath already exists',
          })
          continue
        }

        // Create service
        const service = serviceManager.createService(workspaceId, {
          name: serviceData.name,
          repoPath: serviceData.repoPath,
          command: serviceData.command,
          port: serviceData.port || undefined,
          envVars: serviceData.envVars || undefined,
        })

        results.created.push(service)
        // Add to existing paths to prevent duplicates within this batch
        existingRepoPaths.add(serviceData.repoPath)
      } catch (error) {
        results.failed.push({
          service: serviceData,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        total: services.length,
        created: results.created.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      },
    })
  } catch (error) {
    console.error('Error in batch service creation:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
export { serviceManager }
