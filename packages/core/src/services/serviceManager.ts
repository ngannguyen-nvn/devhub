import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import db from '../db'
import { Service as SharedService } from '@devhub/shared'
import { logManager } from './logManager'
import { healthCheckManager } from './healthCheckManager'
import kill from 'tree-kill'

// Internal service interface (extends shared with runtime data)
export interface Service extends Omit<SharedService, 'status' | 'pid'> {
  envVars?: Record<string, string>
}

export interface RunningService extends Service {
  pid?: number
  status: 'running' | 'stopped' | 'error'
  startedAt: Date
  stoppedAt?: Date
  exitCode?: number
  logs: string[]
  logSessionId?: string // Track current log session
}

/**
 * ServiceManager - Manages service lifecycle, process spawning, and log capture
 *
 * Handles:
 * - Service CRUD operations in database
 * - Process spawning and monitoring with child_process
 * - Real-time log capture (in-memory) and persistence (database)
 * - Health check integration
 * - Event emission for service lifecycle events
 */
export class ServiceManager extends EventEmitter {
  private runningServices: Map<string, RunningService> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  private maxLogLines = 500 // Limit in-memory logs to prevent memory leaks

  constructor() {
    super()
    this.loadServices()
  }

  /**
   * Strip ANSI color codes from log strings
   */
  private stripAnsiCodes(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
  }

  /**
   * Load services from database
   */
  private loadServices() {
    const stmt = db.prepare('SELECT * FROM services')
    const services = stmt.all() as any[]
    // Services loaded from database
  }

  /**
   * Get all defined services for a workspace with health status and group info
   * @param workspaceId - Workspace ID to filter services
   * @returns Array of services with health status and tags from groups
   */
  getAllServices(workspaceId: string): Service[] {
    // Get services with health status
    const stmt = db.prepare(`
      SELECT
        s.*,
        GROUP_CONCAT(sg.name) as group_names
      FROM services s
      LEFT JOIN service_group_members sgm ON s.id = sgm.service_id
      LEFT JOIN service_groups sg ON sgm.group_id = sg.id
      WHERE s.workspace_id = ?
      GROUP BY s.id
    `)
    const rows = stmt.all(workspaceId) as any[]

    return rows.map(row => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      repoPath: row.repo_path,
      command: row.command,
      port: row.port,
      envVars: row.env_vars ? JSON.parse(row.env_vars) : undefined,
      healthStatus: row.health_status as 'healthy' | 'unhealthy' | 'degraded' | 'unknown' | undefined,
      lastHealthCheck: row.last_health_check,
      healthCheckFailures: row.health_check_failures,
      tags: row.group_names ? row.group_names.split(',').filter((t: string) => t) : [],
    }))
  }

  /**
   * Get all currently running services across all workspaces
   * @returns Array of running services with runtime information
   */
  getRunningServices(): RunningService[] {
    return Array.from(this.runningServices.values())
      .filter(service => service.status === 'running')
  }

  /**
   * Get running services for a specific workspace
   */
  getRunningServicesForWorkspace(workspaceId: string): RunningService[] {
    return Array.from(this.runningServices.values())
      .filter(service => service.workspaceId === workspaceId && service.status === 'running')
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceId: string): RunningService | null {
    return this.runningServices.get(serviceId) || null
  }

  /**
   * Create a new service in a workspace
   * @param workspaceId - Workspace ID to create service in
   * @param service - Service configuration (without id and workspaceId)
   * @returns Created service with generated ID
   * @throws Error if workspace not found
   */
  createService(workspaceId: string, service: Omit<Service, 'id' | 'workspaceId'>): Service {
    const id = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Verify workspace exists
    const workspaceCheck = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(workspaceId)
    if (!workspaceCheck) {
      throw new Error(`Workspace ${workspaceId} not found`)
    }

    const stmt = db.prepare(`
      INSERT INTO services (id, workspace_id, name, repo_path, command, port, env_vars)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      workspaceId,
      service.name,
      service.repoPath,
      service.command,
      service.port || null,
      service.envVars ? JSON.stringify(service.envVars) : null
    )

    return { id, workspaceId, ...service }
  }

  /**
   * Update service configuration in database
   * @param id - Service ID
   * @param updates - Partial service object with fields to update
   * @returns true if updated, false if not found
   */
  updateService(id: string, updates: Partial<Omit<Service, 'id'>>): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.repoPath !== undefined) {
      fields.push('repo_path = ?')
      values.push(updates.repoPath)
    }
    if (updates.command !== undefined) {
      fields.push('command = ?')
      values.push(updates.command)
    }
    if (updates.port !== undefined) {
      fields.push('port = ?')
      values.push(updates.port)
    }
    if (updates.envVars !== undefined) {
      fields.push('env_vars = ?')
      values.push(JSON.stringify(updates.envVars))
    }

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`
      UPDATE services SET ${fields.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0
  }

  /**
   * Delete a service
   */
  /**
   * Delete a service from database
   * Stops the service process if running before deletion
   * @param id - Service ID
   * @returns true if deleted, false if not found
   */
  deleteService(id: string): boolean {
    // Stop service if running (catch error if already stopped)
    if (this.runningServices.has(id)) {
      try {
        this.stopService(id)
      } catch (error) {
        // Service already stopped, ignore error
      }
    }

    const stmt = db.prepare('DELETE FROM services WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Start a service by spawning a child process
   *
   * Creates log session, starts health checks if configured,
   * captures stdout/stderr and persists to database
   *
   * @param serviceId - Service ID
   * @throws Error if service not found or already running
   */
  async startService(serviceId: string): Promise<void> {
    // Check if already running (check for active process, not just entry in map)
    const existingService = this.runningServices.get(serviceId)
    if (existingService && existingService.status === 'running' && existingService.pid) {
      throw new Error('Service is already running')
    }

    // If service was previously stopped, clear old logs and state
    if (existingService) {
      this.runningServices.delete(serviceId)
    }

    // Get service config
    const stmt = db.prepare('SELECT * FROM services WHERE id = ?')
    const row = stmt.get(serviceId) as any

    if (!row) {
      throw new Error('Service not found')
    }

    const service: Service = {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      repoPath: row.repo_path,
      command: row.command,
      port: row.port,
      envVars: row.env_vars ? JSON.parse(row.env_vars) : undefined,
    }

    // Parse command (handle npm run, yarn, etc.)
    const [cmd, ...args] = service.command.split(' ')

    // Spawn process
    const childProcess = spawn(cmd, args, {
      cwd: service.repoPath,
      env: { ...process.env, ...service.envVars },
      shell: true,
    })

    // Create log session for persistence
    const logSession = logManager.createSession(serviceId)

    const runningService: RunningService = {
      ...service,
      pid: childProcess.pid!,
      status: 'running',
      startedAt: new Date(),
      logs: [],
      logSessionId: logSession.id,
    }

    // Capture stdout
    childProcess.stdout?.on('data', (data) => {
      const rawLines = data.toString().split('\n').filter((line: string) => line.trim())
      // Strip ANSI color codes for clean display
      const lines = rawLines.map((line: string) => this.stripAnsiCodes(line))
      runningService.logs.push(...lines)

      // Keep only last N lines
      if (runningService.logs.length > this.maxLogLines) {
        runningService.logs = runningService.logs.slice(-this.maxLogLines)
      }

      // Persist logs to database
      if (runningService.logSessionId) {
        const logEntries = lines.map((line: string) => ({
          message: line,
          level: logManager.parseLogLevel(line) as 'info' | 'warn' | 'error' | 'debug',
        }))
        logManager.writeLogs(runningService.logSessionId, serviceId, logEntries)
      }

      this.emit('log', { serviceId, type: 'stdout', data: lines })
    })

    // Capture stderr
    childProcess.stderr?.on('data', (data) => {
      const rawLines = data.toString().split('\n').filter((line: string) => line.trim())
      // Strip ANSI color codes for clean display
      const lines = rawLines.map((line: string) => this.stripAnsiCodes(line))
      runningService.logs.push(...lines)

      if (runningService.logs.length > this.maxLogLines) {
        runningService.logs = runningService.logs.slice(-this.maxLogLines)
      }

      // Persist logs to database (stderr typically errors/warnings)
      if (runningService.logSessionId) {
        const logEntries = lines.map((line: string) => ({
          message: line,
          level: 'error' as const,
        }))
        logManager.writeLogs(runningService.logSessionId, serviceId, logEntries)
      }

      this.emit('log', { serviceId, type: 'stderr', data: lines })
    })

    // Handle process exit
    childProcess.on('exit', (code) => {
      runningService.status = code === 0 ? 'stopped' : 'error'
      runningService.stoppedAt = new Date()
      runningService.exitCode = code || undefined
      runningService.pid = undefined // Clear PID since process is gone

      // End log session
      if (runningService.logSessionId) {
        const exitReason = code === 0 ? 'stopped' : (code === null ? 'killed' : 'crashed')
        logManager.endSession(runningService.logSessionId, code || undefined, exitReason)
      }

      // Stop health checks for this service
      const healthChecks = healthCheckManager.getHealthChecks(serviceId)
      for (const check of healthChecks) {
        healthCheckManager.stopHealthCheck(check.id)
      }

      // Keep logs and service info, only remove from active processes
      this.processes.delete(serviceId)
      // DON'T delete from runningServices - keep logs visible

      this.emit('exit', { serviceId, code })
    })

    childProcess.on('error', (error) => {
      runningService.status = 'error'
      this.emit('error', { serviceId, error: error.message })
    })

    this.processes.set(serviceId, childProcess)
    this.runningServices.set(serviceId, runningService)

    // Start health checks for this service
    const healthChecks = healthCheckManager.getHealthChecks(serviceId)
    for (const check of healthChecks) {
      if (check.enabled) {
        healthCheckManager.startHealthCheck(check)
      }
    }
  }

  /**
   * Stop a running service
   *
   * Sends SIGTERM, then SIGKILL after 5 seconds if still running.
   * Stops health checks and marks service as stopped (log session ends on exit)
   *
   * @param serviceId - Service ID
   * @throws Error if service is not running
   */
  stopService(serviceId: string): void {
    const process = this.processes.get(serviceId)

    if (!process) {
      // Service already stopped - this is fine, just return
      return
    }

    // Stop health checks
    const healthChecks = healthCheckManager.getHealthChecks(serviceId)
    for (const check of healthChecks) {
      healthCheckManager.stopHealthCheck(check.id)
    }

    // Use tree-kill to kill entire process tree (handles shell wrappers properly)
    if (process.pid) {
      kill(process.pid, 'SIGTERM')

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.processes.has(serviceId) && process.pid) {
          kill(process.pid, 'SIGKILL')
        }
      }, 5000)
    }

    const runningService = this.runningServices.get(serviceId)
    if (runningService) {
      runningService.status = 'stopped'
      runningService.stoppedAt = new Date()
      // Exit handler will set exitCode and end log session when process actually exits
    }
  }

  /**
   * Get in-memory logs for a service (for real-time viewing)
   *
   * For historical logs across sessions, use logManager.getServiceLogs()
   *
   * @param serviceId - Service ID
   * @param lines - Number of recent log lines to return (default 100)
   * @returns Array of log lines (most recent last)
   */
  getServiceLogs(serviceId: string, lines: number = 100): string[] {
    const service = this.runningServices.get(serviceId)
    if (!service) {
      return []
    }
    return service.logs.slice(-lines)
  }

  /**
   * Stop all running services across all workspaces
   *
   * Used for graceful shutdown or cleanup
   */
  stopAll(): void {
    for (const serviceId of this.processes.keys()) {
      try {
        this.stopService(serviceId)
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
  }
}

export const serviceManager = new ServiceManager()
