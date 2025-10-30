import express, { Request, Response } from 'express'
import { autoRestartManager } from '../services/autoRestartManager'

const router = express.Router()

/**
 * GET /api/auto-restart/pending
 * Get all services with pending restarts
 * MUST come before /:serviceId to avoid route matching issues
 */
router.get('/pending', (req: Request, res: Response) => {
  try {
    const pending = autoRestartManager.getPendingRestarts()
    res.json({ success: true, serviceIds: pending })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/auto-restart/bulk
 * Get auto-restart configurations for multiple services
 * Query: ?serviceIds=id1,id2,id3
 */
router.get('/bulk', (req: Request, res: Response) => {
  try {
    const serviceIdsParam = req.query.serviceIds as string
    if (!serviceIdsParam) {
      return res.status(400).json({ success: false, error: 'serviceIds query parameter required' })
    }

    const serviceIds = serviceIdsParam.split(',').filter(id => id.trim())
    const configs: Record<string, any> = {}

    for (const serviceId of serviceIds) {
      const config = autoRestartManager.getRestartConfig(serviceId)
      configs[serviceId] = config || {
        enabled: false,
        maxRestarts: 3,
        restartCount: 0,
        backoffStrategy: 'exponential',
      }
    }

    res.json({ success: true, configs })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/auto-restart/:serviceId
 * Get auto-restart configuration for a service
 */
router.get('/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const config = autoRestartManager.getRestartConfig(serviceId)

    if (!config) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    res.json({ success: true, config })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/auto-restart/:serviceId
 * Update auto-restart configuration
 * Body: { autoRestart?, maxRestarts?, backoffStrategy? }
 */
router.put('/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const { autoRestart, maxRestarts, backoffStrategy } = req.body

    const success = autoRestartManager.updateRestartConfig(serviceId, {
      autoRestart,
      maxRestarts,
      backoffStrategy,
    })

    if (!success) {
      return res.status(404).json({ success: false, error: 'Service not found or no changes made' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/auto-restart/:serviceId/reset
 * Reset restart count for a service
 */
router.post('/:serviceId/reset', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    autoRestartManager.resetRestartCount(serviceId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/auto-restart/:serviceId/cancel
 * Cancel pending restart for a service
 */
router.post('/:serviceId/cancel', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    autoRestartManager.cancelRestart(serviceId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
