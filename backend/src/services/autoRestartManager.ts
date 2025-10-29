import { DatabaseInstance } from '../db'
import { EventEmitter } from 'events'

const db = DatabaseInstance.getInstance()

/**
 * AutoRestartManager - Manages automatic service restart with backoff strategies
 */
export class AutoRestartManager extends EventEmitter {
  private restartTimers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Get auto-restart configuration for a service
   */
  getRestartConfig(serviceId: string): {
    enabled: boolean
    maxRestarts: number
    restartCount: number
    backoffStrategy: 'immediate' | 'exponential' | 'fixed'
  } | null {
    const stmt = db.prepare(`
      SELECT
        auto_restart as autoRestart,
        max_restarts as maxRestarts,
        restart_count as restartCount,
        backoff_strategy as backoffStrategy
      FROM services
      WHERE id = ?
    `)

    const row = stmt.get(serviceId) as any

    if (!row) return null

    return {
      enabled: Boolean(row.autoRestart),
      maxRestarts: row.maxRestarts || 3,
      restartCount: row.restartCount || 0,
      backoffStrategy: row.backoffStrategy || 'exponential',
    }
  }

  /**
   * Update restart configuration
   */
  updateRestartConfig(
    serviceId: string,
    config: {
      autoRestart?: boolean
      maxRestarts?: number
      backoffStrategy?: 'immediate' | 'exponential' | 'fixed'
    }
  ): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (config.autoRestart !== undefined) {
      fields.push('auto_restart = ?')
      values.push(config.autoRestart ? 1 : 0)
    }

    if (config.maxRestarts !== undefined) {
      fields.push('max_restarts = ?')
      values.push(config.maxRestarts)
    }

    if (config.backoffStrategy !== undefined) {
      fields.push('backoff_strategy = ?')
      values.push(config.backoffStrategy)
    }

    if (fields.length === 0) return false

    values.push(serviceId)

    const stmt = db.prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)

    return result.changes > 0
  }

  /**
   * Increment restart count
   */
  incrementRestartCount(serviceId: string): number {
    const stmt = db.prepare('UPDATE services SET restart_count = restart_count + 1 WHERE id = ?')
    stmt.run(serviceId)

    const getStmt = db.prepare('SELECT restart_count as restartCount FROM services WHERE id = ?')
    const row = getStmt.get(serviceId) as { restartCount: number }

    return row.restartCount
  }

  /**
   * Reset restart count
   */
  resetRestartCount(serviceId: string): void {
    db.prepare('UPDATE services SET restart_count = 0 WHERE id = ?').run(serviceId)
  }

  /**
   * Calculate backoff delay in milliseconds
   */
  calculateBackoffDelay(
    strategy: 'immediate' | 'exponential' | 'fixed',
    restartCount: number
  ): number {
    switch (strategy) {
      case 'immediate':
        return 0 // Restart immediately

      case 'exponential':
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 60s
        const delay = Math.min(1000 * Math.pow(2, restartCount), 60000)
        return delay

      case 'fixed':
        // Fixed delay: always 5 seconds
        return 5000

      default:
        return 5000
    }
  }

  /**
   * Schedule a service restart after backoff delay
   */
  scheduleRestart(
    serviceId: string,
    serviceName: string,
    restartCallback: (serviceId: string) => Promise<void>
  ): void {
    const config = this.getRestartConfig(serviceId)

    if (!config || !config.enabled) {
      return // Auto-restart not enabled
    }

    // Check if exceeded max restarts
    if (config.restartCount >= config.maxRestarts) {
      console.log(`Service ${serviceName} exceeded max restarts (${config.maxRestarts})`)
      this.emit('max-restarts-exceeded', { serviceId, serviceName, count: config.restartCount })
      return
    }

    // Calculate backoff delay
    const delay = this.calculateBackoffDelay(config.backoffStrategy, config.restartCount)

    console.log(
      `Scheduling restart for ${serviceName} in ${delay}ms (attempt ${config.restartCount + 1}/${config.maxRestarts})`
    )

    // Cancel existing timer if any
    this.cancelRestart(serviceId)

    // Schedule restart
    const timer = setTimeout(async () => {
      try {
        console.log(`Auto-restarting service ${serviceName}...`)

        // Increment restart count
        const newCount = this.incrementRestartCount(serviceId)

        // Execute restart callback
        await restartCallback(serviceId)

        this.emit('restart', { serviceId, serviceName, attempt: newCount })

        // Clear timer
        this.restartTimers.delete(serviceId)
      } catch (error: any) {
        console.error(`Failed to auto-restart service ${serviceName}:`, error.message)
        this.emit('restart-failed', { serviceId, serviceName, error: error.message })

        // Try again if not at max
        const currentConfig = this.getRestartConfig(serviceId)
        if (currentConfig && currentConfig.restartCount < currentConfig.maxRestarts) {
          this.scheduleRestart(serviceId, serviceName, restartCallback)
        }
      }
    }, delay)

    this.restartTimers.set(serviceId, timer)
  }

  /**
   * Cancel scheduled restart
   */
  cancelRestart(serviceId: string): void {
    const timer = this.restartTimers.get(serviceId)
    if (timer) {
      clearTimeout(timer)
      this.restartTimers.delete(serviceId)
    }
  }

  /**
   * Cancel all scheduled restarts
   */
  cancelAllRestarts(): void {
    for (const [serviceId, timer] of this.restartTimers.entries()) {
      clearTimeout(timer)
    }
    this.restartTimers.clear()
  }

  /**
   * Check if restart is scheduled
   */
  isRestartScheduled(serviceId: string): boolean {
    return this.restartTimers.has(serviceId)
  }

  /**
   * Get all services with pending restarts
   */
  getPendingRestarts(): string[] {
    return Array.from(this.restartTimers.keys())
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    this.cancelAllRestarts()
  }
}

export const autoRestartManager = new AutoRestartManager()
