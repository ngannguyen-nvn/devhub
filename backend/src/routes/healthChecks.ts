import express, { Request, Response } from 'express'
import { healthCheckManager } from '@devhub/core'

const router = express.Router()

/**
 * GET /api/health-checks/:serviceId
 * Get health checks for a service
 */
router.get('/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const healthChecks = healthCheckManager.getHealthChecks(serviceId)
    res.json({ success: true, healthChecks })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/health-checks
 * Create a health check
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { serviceId, type, endpoint, expectedStatus, expectedBody, port, command, interval, timeout, retries, enabled } = req.body

    if (!serviceId || !type) {
      return res.status(400).json({ success: false, error: 'serviceId and type are required' })
    }

    const healthCheck = healthCheckManager.createHealthCheck(serviceId, {
      type,
      endpoint,
      expectedStatus: expectedStatus || 200,
      expectedBody,
      port,
      command,
      interval: interval || 30,
      timeout: timeout || 5000,
      retries: retries || 3,
      enabled: enabled !== undefined ? enabled : true,
    })

    res.json({ success: true, healthCheck })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/health-checks/:id
 * Update a health check
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    const success = healthCheckManager.updateHealthCheck(id, updates)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Health check not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/health-checks/:id
 * Delete a health check
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const success = healthCheckManager.deleteHealthCheck(id)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Health check not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/health-checks/:id/execute
 * Execute a health check immediately
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const healthCheck = healthCheckManager.getHealthCheck(id)

    if (!healthCheck) {
      return res.status(404).json({ success: false, error: 'Health check not found' })
    }

    const result = await healthCheckManager.executeHealthCheck(healthCheck)
    res.json({ success: true, result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
