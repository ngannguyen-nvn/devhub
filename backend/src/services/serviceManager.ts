import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import db from '../db'
import { Service as SharedService } from '@devhub/shared'

// Internal service interface (extends shared with runtime data)
export interface Service extends Omit<SharedService, 'status' | 'pid'> {
  envVars?: Record<string, string>
}

export interface RunningService extends Service {
  pid: number
  status: 'running' | 'stopped' | 'error'
  startedAt: Date
  logs: string[]
}

export class ServiceManager extends EventEmitter {
  private runningServices: Map<string, RunningService> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  private maxLogLines = 500

  constructor() {
    super()
    this.loadServices()
  }

  /**
   * Load services from database
   */
  private loadServices() {
    const stmt = db.prepare('SELECT * FROM services')
    const services = stmt.all() as any[]
    console.log(`Loaded ${services.length} services from database`)
  }

  /**
   * Get all defined services for a workspace
   */
  getAllServices(workspaceId: string): Service[] {
    const stmt = db.prepare('SELECT * FROM services WHERE workspace_id = ?')
    const rows = stmt.all(workspaceId) as any[]

    return rows.map(row => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      repoPath: row.repo_path,
      command: row.command,
      port: row.port,
      envVars: row.env_vars ? JSON.parse(row.env_vars) : undefined,
    }))
  }

  /**
   * Get running services status
   */
  getRunningServices(): RunningService[] {
    return Array.from(this.runningServices.values())
  }

  /**
   * Get running services for a specific workspace
   */
  getRunningServicesForWorkspace(workspaceId: string): RunningService[] {
    return Array.from(this.runningServices.values())
      .filter(service => service.workspaceId === workspaceId)
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceId: string): RunningService | null {
    return this.runningServices.get(serviceId) || null
  }

  /**
   * Create a new service in a workspace
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
   * Update a service
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
  deleteService(id: string): boolean {
    // Stop service if running
    if (this.runningServices.has(id)) {
      this.stopService(id)
    }

    const stmt = db.prepare('DELETE FROM services WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Start a service
   */
  async startService(serviceId: string): Promise<void> {
    // Check if already running
    if (this.runningServices.has(serviceId)) {
      throw new Error('Service is already running')
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

    const runningService: RunningService = {
      ...service,
      pid: childProcess.pid!,
      status: 'running',
      startedAt: new Date(),
      logs: [],
    }

    // Capture stdout
    childProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim())
      runningService.logs.push(...lines)

      // Keep only last N lines
      if (runningService.logs.length > this.maxLogLines) {
        runningService.logs = runningService.logs.slice(-this.maxLogLines)
      }

      this.emit('log', { serviceId, type: 'stdout', data: lines })
    })

    // Capture stderr
    childProcess.stderr?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim())
      runningService.logs.push(...lines)

      if (runningService.logs.length > this.maxLogLines) {
        runningService.logs = runningService.logs.slice(-this.maxLogLines)
      }

      this.emit('log', { serviceId, type: 'stderr', data: lines })
    })

    // Handle process exit
    childProcess.on('exit', (code) => {
      console.log(`Service ${service.name} exited with code ${code}`)
      runningService.status = code === 0 ? 'stopped' : 'error'
      this.processes.delete(serviceId)
      this.runningServices.delete(serviceId)
      this.emit('exit', { serviceId, code })
    })

    childProcess.on('error', (error) => {
      console.error(`Service ${service.name} error:`, error)
      runningService.status = 'error'
      this.emit('error', { serviceId, error: error.message })
    })

    this.processes.set(serviceId, childProcess)
    this.runningServices.set(serviceId, runningService)

    console.log(`Started service ${service.name} (PID: ${childProcess.pid})`)
  }

  /**
   * Stop a service
   */
  stopService(serviceId: string): void {
    const process = this.processes.get(serviceId)

    if (!process) {
      throw new Error('Service is not running')
    }

    process.kill('SIGTERM')

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (this.processes.has(serviceId)) {
        process.kill('SIGKILL')
      }
    }, 5000)

    const runningService = this.runningServices.get(serviceId)
    if (runningService) {
      runningService.status = 'stopped'
    }
  }

  /**
   * Get service logs
   */
  getServiceLogs(serviceId: string, lines: number = 100): string[] {
    const service = this.runningServices.get(serviceId)
    if (!service) {
      return []
    }
    return service.logs.slice(-lines)
  }

  /**
   * Stop all services
   */
  stopAll(): void {
    for (const serviceId of this.processes.keys()) {
      try {
        this.stopService(serviceId)
      } catch (error) {
        console.error(`Error stopping service ${serviceId}:`, error)
      }
    }
  }
}
