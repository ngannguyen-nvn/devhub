import { DatabaseInstance } from '../db'
import type { ServiceDependency } from '@devhub/shared'

const db = DatabaseInstance.getInstance()

/**
 * DependencyManager - Manages service dependencies and orchestrated startup
 */
export class DependencyManager {
  /**
   * Add dependency relationship
   */
  addDependency(serviceId: string, dependsOnServiceId: string, waitForHealth: boolean = true, startupDelay: number = 0): ServiceDependency {
    const id = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    const stmt = db.prepare(`
      INSERT INTO service_dependencies (id, service_id, depends_on_service_id, wait_for_health, startup_delay)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(id, serviceId, dependsOnServiceId, waitForHealth ? 1 : 0, startupDelay)

    return {
      id,
      serviceId,
      dependsOnServiceId,
      waitForHealth,
      startupDelay,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Remove dependency
   */
  removeDependency(id: string): boolean {
    const stmt = db.prepare('DELETE FROM service_dependencies WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Get dependencies for a service
   */
  getDependencies(serviceId: string): ServiceDependency[] {
    const stmt = db.prepare(`
      SELECT
        id,
        service_id as serviceId,
        depends_on_service_id as dependsOnServiceId,
        wait_for_health as waitForHealth,
        startup_delay as startupDelay,
        created_at as createdAt
      FROM service_dependencies
      WHERE service_id = ?
    `)

    const rows = stmt.all(serviceId) as any[]
    return rows.map(row => ({
      ...row,
      waitForHealth: Boolean(row.waitForHealth),
    }))
  }

  /**
   * Get all dependencies in workspace
   */
  getAllDependencies(workspaceId: string): ServiceDependency[] {
    const stmt = db.prepare(`
      SELECT
        sd.id,
        sd.service_id as serviceId,
        sd.depends_on_service_id as dependsOnServiceId,
        sd.wait_for_health as waitForHealth,
        sd.startup_delay as startupDelay,
        sd.created_at as createdAt
      FROM service_dependencies sd
      JOIN services s ON sd.service_id = s.id
      WHERE s.workspace_id = ?
    `)

    const rows = stmt.all(workspaceId) as any[]
    return rows.map(row => ({
      ...row,
      waitForHealth: Boolean(row.waitForHealth),
    }))
  }

  /**
   * Get services that depend on this service
   */
  getDependents(serviceId: string): ServiceDependency[] {
    const stmt = db.prepare(`
      SELECT
        id,
        service_id as serviceId,
        depends_on_service_id as dependsOnServiceId,
        wait_for_health as waitForHealth,
        startup_delay as startupDelay,
        created_at as createdAt
      FROM service_dependencies
      WHERE depends_on_service_id = ?
    `)

    const rows = stmt.all(serviceId) as any[]
    return rows.map(row => ({
      ...row,
      waitForHealth: Boolean(row.waitForHealth),
    }))
  }

  /**
   * Detect circular dependencies
   */
  hasCircularDependency(serviceId: string, visited: Set<string> = new Set(), path: Set<string> = new Set()): boolean {
    if (path.has(serviceId)) {
      return true // Circular dependency found
    }

    if (visited.has(serviceId)) {
      return false // Already checked this path
    }

    visited.add(serviceId)
    path.add(serviceId)

    const dependencies = this.getDependencies(serviceId)
    for (const dep of dependencies) {
      if (this.hasCircularDependency(dep.dependsOnServiceId, visited, path)) {
        return true
      }
    }

    path.delete(serviceId)
    return false
  }

  /**
   * Topological sort for startup order
   * Returns services in the order they should be started
   */
  getStartupOrder(serviceIds: string[]): { order: string[], cycles: string[][] } {
    const inDegree = new Map<string, number>()
    const adjList = new Map<string, string[]>()

    // Initialize
    for (const serviceId of serviceIds) {
      inDegree.set(serviceId, 0)
      adjList.set(serviceId, [])
    }

    // Build adjacency list and calculate in-degrees
    for (const serviceId of serviceIds) {
      const dependencies = this.getDependencies(serviceId)
      for (const dep of dependencies) {
        if (serviceIds.includes(dep.dependsOnServiceId)) {
          // Edge from dependency to dependent
          const neighbors = adjList.get(dep.dependsOnServiceId) || []
          neighbors.push(serviceId)
          adjList.set(dep.dependsOnServiceId, neighbors)

          inDegree.set(serviceId, (inDegree.get(serviceId) || 0) + 1)
        }
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = []
    const result: string[] = []

    // Add all nodes with in-degree 0 to queue
    for (const [serviceId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(serviceId)
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)

      const neighbors = adjList.get(current) || []
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1)
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor)
        }
      }
    }

    // Detect cycles
    const cycles: string[][] = []
    if (result.length !== serviceIds.length) {
      // There are cycles - find them
      const remaining = serviceIds.filter(id => !result.includes(id))
      cycles.push(remaining)
    }

    return { order: result, cycles }
  }

  /**
   * Get dependency graph for visualization
   */
  getDependencyGraph(workspaceId: string): {
    nodes: Array<{ id: string, name: string }>
    edges: Array<{ from: string, to: string, waitForHealth: boolean, startupDelay: number }>
  } {
    const servicesStmt = db.prepare('SELECT id, name FROM services WHERE workspace_id = ?')
    const services = servicesStmt.all(workspaceId) as any[]

    const dependencies = this.getAllDependencies(workspaceId)

    return {
      nodes: services.map(s => ({ id: s.id, name: s.name })),
      edges: dependencies.map(d => ({
        from: d.dependsOnServiceId,
        to: d.serviceId,
        waitForHealth: d.waitForHealth,
        startupDelay: d.startupDelay,
      })),
    }
  }
}

export const dependencyManager = new DependencyManager()
