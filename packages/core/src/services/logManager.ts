import { DatabaseInstance } from '../db'
import type { ServiceLogSession, ServiceLog } from '@devhub/shared'

const db = DatabaseInstance.getInstance()

/**
 * LogManager - Manages service log persistence and retrieval
 */
export class LogManager {
  private readonly MAX_LOG_LENGTH = 10000 // Max characters per log message

  /**
   * Create a new log session when service starts
   */
  createSession(serviceId: string): ServiceLogSession {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO service_log_sessions (id, service_id, started_at, logs_count)
      VALUES (?, ?, ?, 0)
    `)

    stmt.run(id, serviceId, now)

    return {
      id,
      serviceId,
      startedAt: now,
      logsCount: 0,
      createdAt: now,
    }
  }

  /**
   * End a log session when service stops
   */
  endSession(sessionId: string, exitCode?: number, exitReason?: string): boolean {
    const stmt = db.prepare(`
      UPDATE service_log_sessions
      SET stopped_at = CURRENT_TIMESTAMP,
          exit_code = ?,
          exit_reason = ?
      WHERE id = ?
    `)

    const result = stmt.run(exitCode ?? null, exitReason ?? null, sessionId)
    return result.changes > 0
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ServiceLogSession | null {
    const stmt = db.prepare(`
      SELECT
        id,
        service_id as serviceId,
        started_at as startedAt,
        stopped_at as stoppedAt,
        exit_code as exitCode,
        exit_reason as exitReason,
        logs_count as logsCount,
        created_at as createdAt
      FROM service_log_sessions
      WHERE id = ?
    `)

    const row = stmt.get(sessionId) as any
    return row || null
  }

  /**
   * Get all sessions for a service
   */
  getSessions(serviceId: string, limit: number = 50): ServiceLogSession[] {
    const stmt = db.prepare(`
      SELECT
        id,
        service_id as serviceId,
        started_at as startedAt,
        stopped_at as stoppedAt,
        exit_code as exitCode,
        exit_reason as exitReason,
        logs_count as logsCount,
        created_at as createdAt
      FROM service_log_sessions
      WHERE service_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `)

    return stmt.all(serviceId, limit) as ServiceLogSession[]
  }

  /**
   * Get active (running) session for a service
   */
  getActiveSession(serviceId: string): ServiceLogSession | null {
    const stmt = db.prepare(`
      SELECT
        id,
        service_id as serviceId,
        started_at as startedAt,
        stopped_at as stoppedAt,
        exit_code as exitCode,
        exit_reason as exitReason,
        logs_count as logsCount,
        created_at as createdAt
      FROM service_log_sessions
      WHERE service_id = ? AND stopped_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `)

    const row = stmt.get(serviceId) as any
    return row || null
  }

  /**
   * Write a log entry to database
   */
  writeLog(
    sessionId: string,
    serviceId: string,
    message: string,
    level: 'info' | 'warn' | 'error' | 'debug' = 'info'
  ): void {
    // Truncate very long log messages
    const truncatedMessage = message.length > this.MAX_LOG_LENGTH
      ? message.substring(0, this.MAX_LOG_LENGTH) + '... [truncated]'
      : message

    const stmt = db.prepare(`
      INSERT INTO service_logs (session_id, service_id, level, message)
      VALUES (?, ?, ?, ?)
    `)

    stmt.run(sessionId, serviceId, level, truncatedMessage)

    // Increment logs count in session
    const updateStmt = db.prepare(`
      UPDATE service_log_sessions
      SET logs_count = logs_count + 1
      WHERE id = ?
    `)

    updateStmt.run(sessionId)
  }

  /**
   * Write multiple log entries at once (batch insert)
   */
  writeLogs(
    sessionId: string,
    serviceId: string,
    messages: Array<{ message: string, level?: 'info' | 'warn' | 'error' | 'debug' }>
  ): void {
    if (messages.length === 0) return

    const insertStmt = db.prepare(`
      INSERT INTO service_logs (session_id, service_id, level, message)
      VALUES (?, ?, ?, ?)
    `)

    const updateStmt = db.prepare(`
      UPDATE service_log_sessions
      SET logs_count = logs_count + ?
      WHERE id = ?
    `)

    // Use transaction for batch insert
    db.transaction(() => {
      for (const { message, level = 'info' } of messages) {
        const truncatedMessage = message.length > this.MAX_LOG_LENGTH
          ? message.substring(0, this.MAX_LOG_LENGTH) + '... [truncated]'
          : message

        // Let database use DEFAULT CURRENT_TIMESTAMP for timestamp
        insertStmt.run(sessionId, serviceId, level, truncatedMessage)
      }

      updateStmt.run(messages.length, sessionId)
    })()
  }

  /**
   * Get logs for a session with filtering and pagination
   */
  getLogs(
    sessionId: string,
    options: {
      level?: 'info' | 'warn' | 'error' | 'debug'
      search?: string
      limit?: number
      offset?: number
    } = {}
  ): ServiceLog[] {
    const { level, search, limit = 500, offset = 0 } = options

    let query = `
      SELECT
        id,
        session_id as sessionId,
        service_id as serviceId,
        timestamp,
        level,
        message
      FROM service_logs
      WHERE session_id = ?
    `

    const params: any[] = [sessionId]

    if (level) {
      query += ' AND level = ?'
      params.push(level)
    }

    if (search) {
      query += ' AND message LIKE ?'
      params.push(`%${search}%`)
    }

    query += ' ORDER BY timestamp ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const stmt = db.prepare(query)
    return stmt.all(...params) as ServiceLog[]
  }

  /**
   * Get logs for a service (all sessions or latest session)
   */
  getServiceLogs(
    serviceId: string,
    options: {
      sessionId?: string
      level?: 'info' | 'warn' | 'error' | 'debug'
      search?: string
      limit?: number
      offset?: number
    } = {}
  ): ServiceLog[] {
    const { sessionId, level, search, limit = 500, offset = 0 } = options

    let query = `
      SELECT
        id,
        session_id as sessionId,
        service_id as serviceId,
        timestamp,
        level,
        message
      FROM service_logs
      WHERE service_id = ?
    `

    const params: any[] = [serviceId]

    if (sessionId) {
      query += ' AND session_id = ?'
      params.push(sessionId)
    }

    if (level) {
      query += ' AND level = ?'
      params.push(level)
    }

    if (search) {
      query += ' AND message LIKE ?'
      params.push(`%${search}%`)
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const stmt = db.prepare(query)
    return stmt.all(...params) as ServiceLog[]
  }

  /**
   * Get log count for a session
   */
  getLogCount(sessionId: string): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM service_logs WHERE session_id = ?')
    const row = stmt.get(sessionId) as { count: number }
    return row.count
  }

  /**
   * Delete old logs (cleanup)
   */
  deleteOldLogs(daysOld: number = 30): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    // First, delete logs
    const deleteLogsStmt = db.prepare(`
      DELETE FROM service_logs
      WHERE session_id IN (
        SELECT id FROM service_log_sessions
        WHERE started_at < ?
      )
    `)

    const logsResult = deleteLogsStmt.run(cutoffDate.toISOString())

    // Then delete sessions
    const deleteSessionsStmt = db.prepare('DELETE FROM service_log_sessions WHERE started_at < ?')
    const sessionsResult = deleteSessionsStmt.run(cutoffDate.toISOString())

    return logsResult.changes + sessionsResult.changes
  }

  /**
   * Delete logs for a specific service
   */
  deleteServiceLogs(serviceId: string): number {
    // First, delete logs
    const deleteLogsStmt = db.prepare('DELETE FROM service_logs WHERE service_id = ?')
    const logsResult = deleteLogsStmt.run(serviceId)

    // Then delete sessions
    const deleteSessionsStmt = db.prepare('DELETE FROM service_log_sessions WHERE service_id = ?')
    const sessionsResult = deleteSessionsStmt.run(serviceId)

    return logsResult.changes + sessionsResult.changes
  }

  /**
   * Delete a specific session and its logs
   */
  deleteSession(sessionId: string): boolean {
    db.transaction(() => {
      // Delete logs first
      const deleteLogsStmt = db.prepare('DELETE FROM service_logs WHERE session_id = ?')
      deleteLogsStmt.run(sessionId)

      // Delete session
      const deleteSessionStmt = db.prepare('DELETE FROM service_log_sessions WHERE id = ?')
      deleteSessionStmt.run(sessionId)
    })()

    return true
  }

  /**
   * Get log statistics for a service
   */
  getLogStats(serviceId: string): {
    totalSessions: number
    totalLogs: number
    activeSessions: number
    logsByLevel: { level: string, count: number }[]
  } {
    // Total sessions
    const sessionsStmt = db.prepare('SELECT COUNT(*) as count FROM service_log_sessions WHERE service_id = ?')
    const sessionsRow = sessionsStmt.get(serviceId) as { count: number }

    // Active sessions
    const activeStmt = db.prepare('SELECT COUNT(*) as count FROM service_log_sessions WHERE service_id = ? AND stopped_at IS NULL')
    const activeRow = activeStmt.get(serviceId) as { count: number }

    // Total logs
    const logsStmt = db.prepare('SELECT COUNT(*) as count FROM service_logs WHERE service_id = ?')
    const logsRow = logsStmt.get(serviceId) as { count: number }

    // Logs by level
    const levelStmt = db.prepare(`
      SELECT level, COUNT(*) as count
      FROM service_logs
      WHERE service_id = ?
      GROUP BY level
    `)
    const levelRows = levelStmt.all(serviceId) as Array<{ level: string, count: number }>

    return {
      totalSessions: sessionsRow.count,
      totalLogs: logsRow.count,
      activeSessions: activeRow.count,
      logsByLevel: levelRows,
    }
  }

  /**
   * Parse log level from message content
   */
  parseLogLevel(message: string): 'info' | 'warn' | 'error' | 'debug' {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('error') || lowerMessage.includes('fail') || lowerMessage.includes('exception')) {
      return 'error'
    }

    if (lowerMessage.includes('warn') || lowerMessage.includes('warning')) {
      return 'warn'
    }

    if (lowerMessage.includes('debug') || lowerMessage.includes('trace')) {
      return 'debug'
    }

    return 'info'
  }
}

export const logManager = new LogManager()
