import { Router } from 'express'
import { ServiceManager } from '../services/serviceManager'

const router = Router()
const serviceManager = new ServiceManager()

/**
 * GET /api/services
 * Get all services
 */
router.get('/', (req, res) => {
  try {
    const services = serviceManager.getAllServices()
    const running = serviceManager.getRunningServices()

    // Merge service definitions with running status
    const servicesWithStatus = services.map(service => ({
      ...service,
      running: running.find(r => r.id === service.id) || null,
    }))

    res.json({ success: true, services: servicesWithStatus })
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
router.get('/:id', (req, res) => {
  try {
    const services = serviceManager.getAllServices()
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    const running = serviceManager.getServiceStatus(req.params.id)

    res.json({
      success: true,
      service: {
        ...service,
        running,
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
 * Create a new service
 */
router.post('/', (req, res) => {
  try {
    const { name, repoPath, command, port, envVars } = req.body

    if (!name || !repoPath || !command) {
      return res.status(400).json({
        success: false,
        error: 'Name, repoPath, and command are required',
      })
    }

    const service = serviceManager.createService({
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
router.put('/:id', (req, res) => {
  try {
    const { name, repoPath, command, port, envVars } = req.body

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
router.delete('/:id', (req, res) => {
  try {
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
router.post('/:id/start', async (req, res) => {
  try {
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
router.post('/:id/stop', (req, res) => {
  try {
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
router.get('/:id/logs', (req, res) => {
  try {
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

export default router
export { serviceManager }
