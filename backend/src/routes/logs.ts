import express, { Request, Response } from 'express'
import { logManager } from '../services/logManager'

const router = express.Router()

/**
 * GET /api/logs/sessions/:serviceId
 * Get all log sessions for a service
 */
router.get('/sessions/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50

    const sessions = logManager.getSessions(serviceId, limit)
    res.json({ success: true, sessions })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/logs/sessions/:serviceId/active
 * Get active session for a service
 */
router.get('/sessions/:serviceId/active', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const session = logManager.getActiveSession(serviceId)

    if (!session) {
      return res.json({ success: true, session: null })
    }

    res.json({ success: true, session })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/logs/session/:sessionId
 * Get logs for a specific session
 * Query params: ?level=error&search=timeout&limit=100&offset=0
 */
router.get('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { level, search, limit, offset } = req.query

    const logs = logManager.getLogs(sessionId, {
      level: level as any,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    })

    res.json({ success: true, logs })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/logs/service/:serviceId
 * Get logs for a service (all sessions or specific session)
 * Query params: ?sessionId=xxx&level=error&search=timeout&limit=100&offset=0
 */
router.get('/service/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const { sessionId, level, search, limit, offset } = req.query

    const logs = logManager.getServiceLogs(serviceId, {
      sessionId: sessionId as string,
      level: level as any,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    })

    res.json({ success: true, logs })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/logs/stats/:serviceId
 * Get log statistics for a service
 */
router.get('/stats/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const stats = logManager.getLogStats(serviceId)
    res.json({ success: true, stats })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/logs/session/:sessionId
 * Delete a specific session and its logs
 */
router.delete('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const success = logManager.deleteSession(sessionId)
    res.json({ success })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/logs/service/:serviceId
 * Delete all logs for a service
 */
router.delete('/service/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const deletedCount = logManager.deleteServiceLogs(serviceId)
    res.json({ success: true, deletedCount })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/logs/cleanup
 * Delete old logs (default: 30 days)
 * Query params: ?days=30
 */
router.delete('/cleanup', (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30
    const deletedCount = logManager.deleteOldLogs(days)
    res.json({ success: true, deletedCount, days })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
