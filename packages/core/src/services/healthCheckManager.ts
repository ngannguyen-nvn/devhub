import { DatabaseInstance } from '../db'
import type { HealthCheck } from '@devhub/shared'
import axios from 'axios'
import * as net from 'net'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const db = DatabaseInstance.getInstance()

/**
 * HealthCheckManager - Manages and executes service health checks
 */
export class HealthCheckManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Create health check configuration
   */
  createHealthCheck(serviceId: string, config: Omit<HealthCheck, 'id' | 'serviceId' | 'createdAt' | 'updatedAt'>): HealthCheck {
    const id = `hc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO service_health_checks (
        id, service_id, type, endpoint, expected_status, expected_body,
        port, command, interval, timeout, retries, enabled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      serviceId,
      config.type,
      config.endpoint || null,
      config.expectedStatus || 200,
      config.expectedBody || null,
      config.port || null,
      config.command || null,
      config.interval,
      config.timeout,
      config.retries,
      config.enabled ? 1 : 0
    )

    const healthCheck: HealthCheck = {
      id,
      serviceId,
      ...config,
      createdAt: now,
      updatedAt: now,
    }

    // Start health check if enabled
    if (config.enabled) {
      this.startHealthCheck(healthCheck)
    }

    return healthCheck
  }

  /**
   * Update health check configuration
   */
  updateHealthCheck(id: string, updates: Partial<HealthCheck>): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (updates.type !== undefined) {
      fields.push('type = ?')
      values.push(updates.type)
    }
    if (updates.endpoint !== undefined) {
      fields.push('endpoint = ?')
      values.push(updates.endpoint)
    }
    if (updates.expectedStatus !== undefined) {
      fields.push('expected_status = ?')
      values.push(updates.expectedStatus)
    }
    if (updates.expectedBody !== undefined) {
      fields.push('expected_body = ?')
      values.push(updates.expectedBody)
    }
    if (updates.port !== undefined) {
      fields.push('port = ?')
      values.push(updates.port)
    }
    if (updates.command !== undefined) {
      fields.push('command = ?')
      values.push(updates.command)
    }
    if (updates.interval !== undefined) {
      fields.push('interval = ?')
      values.push(updates.interval)
    }
    if (updates.timeout !== undefined) {
      fields.push('timeout = ?')
      values.push(updates.timeout)
    }
    if (updates.retries !== undefined) {
      fields.push('retries = ?')
      values.push(updates.retries)
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?')
      values.push(updates.enabled ? 1 : 0)

      // Stop/start health check based on enabled status
      if (updates.enabled) {
        const healthCheck = this.getHealthCheck(id)
        if (healthCheck) {
          this.startHealthCheck(healthCheck)
        }
      } else {
        this.stopHealthCheck(id)
      }
    }

    if (fields.length === 0) {
      return false
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE service_health_checks SET ${fields.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)

    return result.changes > 0
  }

  /**
   * Delete health check
   */
  deleteHealthCheck(id: string): boolean {
    this.stopHealthCheck(id)
    const stmt = db.prepare('DELETE FROM service_health_checks WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Get health check by ID
   */
  getHealthCheck(id: string): HealthCheck | null {
    const stmt = db.prepare(`
      SELECT
        id,
        service_id as serviceId,
        type,
        endpoint,
        expected_status as expectedStatus,
        expected_body as expectedBody,
        port,
        command,
        interval,
        timeout,
        retries,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
      FROM service_health_checks
      WHERE id = ?
    `)

    const row = stmt.get(id) as any
    if (!row) return null

    return {
      ...row,
      enabled: Boolean(row.enabled),
    }
  }

  /**
   * Get health checks for a service
   */
  getHealthChecks(serviceId: string): HealthCheck[] {
    const stmt = db.prepare(`
      SELECT
        id,
        service_id as serviceId,
        type,
        endpoint,
        expected_status as expectedStatus,
        expected_body as expectedBody,
        port,
        command,
        interval,
        timeout,
        retries,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
      FROM service_health_checks
      WHERE service_id = ?
    `)

    const rows = stmt.all(serviceId) as any[]
    return rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled),
    }))
  }

  /**
   * Execute HTTP health check
   */
  private async executeHttpCheck(check: HealthCheck): Promise<{ healthy: boolean, error?: string }> {
    try {
      const url = check.endpoint || 'http://localhost'
      const response = await axios.get(url, { timeout: check.timeout })

      // Check status code
      if (check.expectedStatus && response.status !== check.expectedStatus) {
        return {
          healthy: false,
          error: `Expected status ${check.expectedStatus}, got ${response.status}`,
        }
      }

      // Check body if specified
      if (check.expectedBody) {
        const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
        if (!body.includes(check.expectedBody)) {
          return {
            healthy: false,
            error: `Expected body to contain "${check.expectedBody}"`,
          }
        }
      }

      return { healthy: true }
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
      }
    }
  }

  /**
   * Execute TCP health check
   */
  private async executeTcpCheck(check: HealthCheck): Promise<{ healthy: boolean, error?: string }> {
    return new Promise((resolve) => {
      if (!check.port) {
        resolve({ healthy: false, error: 'Port not specified' })
        return
      }

      const socket = new net.Socket()
      let resolved = false

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          socket.destroy()
          resolve({ healthy: false, error: 'Connection timeout' })
        }
      }, check.timeout)

      socket.connect(check.port, 'localhost', () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)
          socket.destroy()
          resolve({ healthy: true })
        }
      })

      socket.on('error', (error) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)
          socket.destroy()
          resolve({ healthy: false, error: error.message })
        }
      })
    })
  }

  /**
   * Execute command health check
   */
  private async executeCommandCheck(check: HealthCheck): Promise<{ healthy: boolean, error?: string }> {
    if (!check.command) {
      return { healthy: false, error: 'Command not specified' }
    }

    try {
      const { stdout, stderr } = await execAsync(check.command, { timeout: check.timeout })
      return { healthy: true }
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
      }
    }
  }

  /**
   * Execute a single health check
   */
  async executeHealthCheck(check: HealthCheck): Promise<{ healthy: boolean, error?: string }> {
    switch (check.type) {
      case 'http':
        return this.executeHttpCheck(check)
      case 'tcp':
        return this.executeTcpCheck(check)
      case 'command':
        return this.executeCommandCheck(check)
      default:
        return { healthy: false, error: `Unknown health check type: ${check.type}` }
    }
  }

  /**
   * Update service health status
   */
  private updateServiceHealth(serviceId: string, healthy: boolean): void {
    const healthStatus = healthy ? 'healthy' : 'unhealthy'
    const stmt = db.prepare(`
      UPDATE services
      SET health_status = ?,
          last_health_check = CURRENT_TIMESTAMP,
          health_check_failures = CASE WHEN ? THEN 0 ELSE health_check_failures + 1 END
      WHERE id = ?
    `)
    stmt.run(healthStatus, healthy ? 1 : 0, serviceId)
  }

  /**
   * Start health check interval
   */
  startHealthCheck(check: HealthCheck): void {
    if (this.intervals.has(check.id)) {
      return // Already running
    }

    const runCheck = async () => {
      const result = await this.executeHealthCheck(check)
      this.updateServiceHealth(check.serviceId, result.healthy)
    }

    // Run immediately
    runCheck()

    // Then run on interval
    const intervalId = setInterval(runCheck, check.interval * 1000)
    this.intervals.set(check.id, intervalId)
  }

  /**
   * Stop health check interval
   */
  stopHealthCheck(id: string): void {
    const intervalId = this.intervals.get(id)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(id)
    }
  }

  /**
   * Start all enabled health checks for a service
   */
  startAllHealthChecks(serviceId: string): void {
    const checks = this.getHealthChecks(serviceId)
    for (const check of checks) {
      if (check.enabled) {
        this.startHealthCheck(check)
      }
    }
  }

  /**
   * Stop all health checks for a service
   */
  stopAllHealthChecks(serviceId: string): void {
    const checks = this.getHealthChecks(serviceId)
    for (const check of checks) {
      this.stopHealthCheck(check.id)
    }
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    for (const [id, intervalId] of this.intervals.entries()) {
      clearInterval(intervalId)
    }
    this.intervals.clear()
  }
}

export const healthCheckManager = new HealthCheckManager()
