import { exec } from 'child_process'
import { promisify } from 'util'
import { DatabaseInstance } from '../db'

const execAsync = promisify(exec)
const db = DatabaseInstance.getInstance()

/**
 * PortManager - Detects port conflicts and assigns available ports
 */
export class PortManager {
  private readonly DEFAULT_PORT_RANGE = { min: 3000, max: 9999 }
  private readonly RESERVED_PORTS = [5000, 3000] // DevHub backend and frontend

  /**
   * Get all ports currently in use on the system
   */
  async getUsedPorts(): Promise<number[]> {
    try {
      // Use netstat to get listening ports (works on Linux)
      const { stdout } = await execAsync('netstat -tuln | grep LISTEN || true')

      const ports: number[] = []
      const lines = stdout.split('\n')

      for (const line of lines) {
        // Parse netstat output: tcp 0 0 0.0.0.0:8080 0.0.0.0:* LISTEN
        const match = line.match(/:(\d+)\s/)
        if (match) {
          const port = parseInt(match[1], 10)
          if (port >= 1024) { // Skip system ports
            ports.push(port)
          }
        }
      }

      return [...new Set(ports)].sort((a, b) => a - b)
    } catch (error) {
      console.error('Error getting used ports:', error)
      return []
    }
  }

  /**
   * Get ports used by DevHub services
   */
  getServicePorts(): number[] {
    const stmt = db.prepare('SELECT port FROM services WHERE port IS NOT NULL')
    const rows = stmt.all() as Array<{ port: number }>
    return rows.map(row => row.port).filter(port => port > 0)
  }

  /**
   * Check if a specific port is available
   */
  async isPortAvailable(port: number): Promise<boolean> {
    const usedPorts = await this.getUsedPorts()
    return !usedPorts.includes(port)
  }

  /**
   * Find next available port starting from a given port
   */
  async findAvailablePort(startPort?: number): Promise<number> {
    const usedPorts = await this.getUsedPorts()
    const servicePorts = this.getServicePorts()
    const allUsedPorts = [...new Set([...usedPorts, ...servicePorts, ...this.RESERVED_PORTS])]

    const start = startPort || this.DEFAULT_PORT_RANGE.min
    const end = this.DEFAULT_PORT_RANGE.max

    for (let port = start; port <= end; port++) {
      if (!allUsedPorts.includes(port)) {
        return port
      }
    }

    throw new Error(`No available ports in range ${start}-${end}`)
  }

  /**
   * Find multiple available ports
   */
  async findAvailablePorts(count: number, startPort?: number): Promise<number[]> {
    const usedPorts = await this.getUsedPorts()
    const servicePorts = this.getServicePorts()
    const allUsedPorts = [...new Set([...usedPorts, ...servicePorts, ...this.RESERVED_PORTS])]

    const start = startPort || this.DEFAULT_PORT_RANGE.min
    const end = this.DEFAULT_PORT_RANGE.max
    const availablePorts: number[] = []

    for (let port = start; port <= end && availablePorts.length < count; port++) {
      if (!allUsedPorts.includes(port)) {
        availablePorts.push(port)
      }
    }

    if (availablePorts.length < count) {
      throw new Error(`Only found ${availablePorts.length} available ports, needed ${count}`)
    }

    return availablePorts
  }

  /**
   * Detect port conflicts for all services
   */
  async detectConflicts(): Promise<Array<{
    serviceId: string
    serviceName: string
    port: number
    conflict: 'system' | 'service' | 'both'
    conflictingService?: string
  }>> {
    const usedPorts = await this.getUsedPorts()
    const conflicts: Array<{
      serviceId: string
      serviceName: string
      port: number
      conflict: 'system' | 'service' | 'both'
      conflictingService?: string
    }> = []

    // Get all services with ports
    const stmt = db.prepare('SELECT id, name, port FROM services WHERE port IS NOT NULL')
    const services = stmt.all() as Array<{ id: string, name: string, port: number }>

    // Track service port assignments
    const portToService = new Map<number, Array<{ id: string, name: string }>>()

    for (const service of services) {
      if (!portToService.has(service.port)) {
        portToService.set(service.port, [])
      }
      portToService.get(service.port)!.push({ id: service.id, name: service.name })
    }

    // Check for conflicts
    for (const service of services) {
      const systemConflict = usedPorts.includes(service.port)
      const servicesOnPort = portToService.get(service.port) || []
      const serviceConflict = servicesOnPort.length > 1

      if (systemConflict || serviceConflict) {
        let conflictType: 'system' | 'service' | 'both'
        if (systemConflict && serviceConflict) {
          conflictType = 'both'
        } else if (systemConflict) {
          conflictType = 'system'
        } else {
          conflictType = 'service'
        }

        const conflictingService = serviceConflict
          ? servicesOnPort.find(s => s.id !== service.id)?.name
          : undefined

        conflicts.push({
          serviceId: service.id,
          serviceName: service.name,
          port: service.port,
          conflict: conflictType,
          conflictingService,
        })
      }
    }

    return conflicts
  }

  /**
   * Auto-assign ports to services with conflicts
   */
  async autoAssignPorts(serviceIds?: string[]): Promise<Array<{
    serviceId: string
    serviceName: string
    oldPort: number
    newPort: number
  }>> {
    const conflicts = await this.detectConflicts()
    const servicesToFix = serviceIds
      ? conflicts.filter(c => serviceIds.includes(c.serviceId))
      : conflicts

    const assignments: Array<{
      serviceId: string
      serviceName: string
      oldPort: number
      newPort: number
    }> = []

    for (const conflict of servicesToFix) {
      try {
        const newPort = await this.findAvailablePort(conflict.port + 1)

        // Update service port
        const stmt = db.prepare('UPDATE services SET port = ? WHERE id = ?')
        stmt.run(newPort, conflict.serviceId)

        assignments.push({
          serviceId: conflict.serviceId,
          serviceName: conflict.serviceName,
          oldPort: conflict.port,
          newPort,
        })
      } catch (error) {
        console.error(`Failed to assign port for service ${conflict.serviceId}:`, error)
      }
    }

    return assignments
  }

  /**
   * Get port usage statistics
   */
  async getPortStats(): Promise<{
    totalSystemPorts: number
    totalServicePorts: number
    availableInRange: number
    conflicts: number
  }> {
    const systemPorts = await this.getUsedPorts()
    const servicePorts = this.getServicePorts()
    const conflicts = await this.detectConflicts()

    // Calculate available ports in default range
    const allUsed = [...new Set([...systemPorts, ...servicePorts])]
    const rangeSize = this.DEFAULT_PORT_RANGE.max - this.DEFAULT_PORT_RANGE.min + 1
    const usedInRange = allUsed.filter(
      p => p >= this.DEFAULT_PORT_RANGE.min && p <= this.DEFAULT_PORT_RANGE.max
    ).length
    const availableInRange = rangeSize - usedInRange

    return {
      totalSystemPorts: systemPorts.length,
      totalServicePorts: servicePorts.length,
      availableInRange,
      conflicts: conflicts.length,
    }
  }
}

export const portManager = new PortManager()
