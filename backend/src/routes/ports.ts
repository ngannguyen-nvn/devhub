import express, { Request, Response } from 'express'
import { portManager } from '../services/portManager'

const router = express.Router()

/**
 * GET /api/ports/used
 * Get all ports currently in use on the system
 */
router.get('/used', async (req: Request, res: Response) => {
  try {
    const ports = await portManager.getUsedPorts()
    res.json({ success: true, ports })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/ports/available
 * Find next available port
 * Query params: ?start=3000 (optional starting port)
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const start = req.query.start ? parseInt(req.query.start as string, 10) : undefined
    const port = await portManager.findAvailablePort(start)
    res.json({ success: true, port })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/ports/available/multiple
 * Find multiple available ports
 * Query params: ?count=5&start=3000
 */
router.get('/available/multiple', async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string, 10) || 1
    const start = req.query.start ? parseInt(req.query.start as string, 10) : undefined

    if (count < 1 || count > 100) {
      return res.status(400).json({ success: false, error: 'Count must be between 1 and 100' })
    }

    const ports = await portManager.findAvailablePorts(count, start)
    res.json({ success: true, ports })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/ports/check/:port
 * Check if a specific port is available
 */
router.get('/check/:port', async (req: Request, res: Response) => {
  try {
    const port = parseInt(req.params.port, 10)

    if (isNaN(port) || port < 1 || port > 65535) {
      return res.status(400).json({ success: false, error: 'Invalid port number' })
    }

    const available = await portManager.isPortAvailable(port)
    res.json({ success: true, port, available })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/ports/conflicts
 * Detect port conflicts for all services
 */
router.get('/conflicts', async (req: Request, res: Response) => {
  try {
    const conflicts = await portManager.detectConflicts()
    res.json({ success: true, conflicts })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/ports/auto-assign
 * Auto-assign ports to services with conflicts
 * Body: { serviceIds?: string[] } (optional - assign to specific services)
 */
router.post('/auto-assign', async (req: Request, res: Response) => {
  try {
    const { serviceIds } = req.body
    const assignments = await portManager.autoAssignPorts(serviceIds)
    res.json({ success: true, assignments })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/ports/stats
 * Get port usage statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await portManager.getPortStats()
    res.json({ success: true, stats })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
