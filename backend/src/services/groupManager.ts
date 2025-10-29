import { DatabaseInstance } from '../db'
import type { ServiceGroup } from '@devhub/shared'

const db = DatabaseInstance.getInstance()

/**
 * GroupManager - Manages service groups for batch operations
 */
export class GroupManager {
  /**
   * Create a new service group
   */
  createGroup(
    workspaceId: string,
    name: string,
    options: {
      description?: string
      color?: string
      icon?: string
    } = {}
  ): ServiceGroup {
    const id = `group_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO service_groups (id, workspace_id, name, description, color, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      workspaceId,
      name,
      options.description || null,
      options.color || '#3B82F6', // Default blue
      options.icon || '📦'
    )

    return {
      id,
      workspaceId,
      name,
      description: options.description,
      color: options.color || '#3B82F6',
      icon: options.icon || '📦',
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * Get all groups in a workspace
   */
  getGroups(workspaceId: string): ServiceGroup[] {
    const stmt = db.prepare(`
      SELECT
        id,
        workspace_id as workspaceId,
        name,
        description,
        color,
        icon,
        created_at as createdAt,
        updated_at as updatedAt
      FROM service_groups
      WHERE workspace_id = ?
      ORDER BY name ASC
    `)

    const groups = stmt.all(workspaceId) as ServiceGroup[]

    // Get service IDs for each group
    for (const group of groups) {
      const serviceIds = this.getGroupServiceIds(group.id)
      group.serviceIds = serviceIds
    }

    return groups
  }

  /**
   * Get a specific group
   */
  getGroup(groupId: string): ServiceGroup | null {
    const stmt = db.prepare(`
      SELECT
        id,
        workspace_id as workspaceId,
        name,
        description,
        color,
        icon,
        created_at as createdAt,
        updated_at as updatedAt
      FROM service_groups
      WHERE id = ?
    `)

    const group = stmt.get(groupId) as ServiceGroup | undefined

    if (!group) return null

    // Get service IDs
    group.serviceIds = this.getGroupServiceIds(group.id)

    return group
  }

  /**
   * Update a group
   */
  updateGroup(groupId: string, updates: Partial<ServiceGroup>): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }

    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }

    if (updates.color !== undefined) {
      fields.push('color = ?')
      values.push(updates.color)
    }

    if (updates.icon !== undefined) {
      fields.push('icon = ?')
      values.push(updates.icon)
    }

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(groupId)

    const stmt = db.prepare(`UPDATE service_groups SET ${fields.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)

    return result.changes > 0
  }

  /**
   * Delete a group (removes members but not services)
   */
  deleteGroup(groupId: string): boolean {
    db.transaction(() => {
      // Remove all members
      db.prepare('DELETE FROM service_group_members WHERE group_id = ?').run(groupId)

      // Delete group
      db.prepare('DELETE FROM service_groups WHERE id = ?').run(groupId)
    })()

    return true
  }

  /**
   * Add service to group
   */
  addServiceToGroup(groupId: string, serviceId: string, position?: number): boolean {
    // Check if already in group
    const existing = db.prepare('SELECT id FROM service_group_members WHERE group_id = ? AND service_id = ?')
      .get(groupId, serviceId)

    if (existing) {
      return false // Already in group
    }

    const id = `member_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // If no position specified, add to end
    let finalPosition = position
    if (finalPosition === undefined) {
      const maxPosStmt = db.prepare('SELECT MAX(position) as maxPos FROM service_group_members WHERE group_id = ?')
      const row = maxPosStmt.get(groupId) as { maxPos: number | null }
      finalPosition = (row.maxPos || 0) + 1
    }

    const stmt = db.prepare('INSERT INTO service_group_members (id, group_id, service_id, position) VALUES (?, ?, ?, ?)')
    stmt.run(id, groupId, serviceId, finalPosition)

    return true
  }

  /**
   * Remove service from group
   */
  removeServiceFromGroup(groupId: string, serviceId: string): boolean {
    const stmt = db.prepare('DELETE FROM service_group_members WHERE group_id = ? AND service_id = ?')
    const result = stmt.run(groupId, serviceId)
    return result.changes > 0
  }

  /**
   * Get all service IDs in a group
   */
  getGroupServiceIds(groupId: string): string[] {
    const stmt = db.prepare(`
      SELECT service_id as serviceId
      FROM service_group_members
      WHERE group_id = ?
      ORDER BY position ASC
    `)

    const rows = stmt.all(groupId) as Array<{ serviceId: string }>
    return rows.map(r => r.serviceId)
  }

  /**
   * Get all groups a service belongs to
   */
  getServiceGroups(serviceId: string): ServiceGroup[] {
    const stmt = db.prepare(`
      SELECT
        g.id,
        g.workspace_id as workspaceId,
        g.name,
        g.description,
        g.color,
        g.icon,
        g.created_at as createdAt,
        g.updated_at as updatedAt
      FROM service_groups g
      JOIN service_group_members m ON g.id = m.group_id
      WHERE m.service_id = ?
      ORDER BY g.name ASC
    `)

    return stmt.all(serviceId) as ServiceGroup[]
  }

  /**
   * Reorder services in a group
   */
  reorderGroup(groupId: string, serviceIds: string[]): boolean {
    db.transaction(() => {
      for (let i = 0; i < serviceIds.length; i++) {
        db.prepare('UPDATE service_group_members SET position = ? WHERE group_id = ? AND service_id = ?')
          .run(i + 1, groupId, serviceIds[i])
      }
    })()

    return true
  }

  /**
   * Add multiple services to a group at once
   */
  addServicesToGroup(groupId: string, serviceIds: string[]): number {
    let added = 0

    db.transaction(() => {
      for (const serviceId of serviceIds) {
        if (this.addServiceToGroup(groupId, serviceId)) {
          added++
        }
      }
    })()

    return added
  }

  /**
   * Remove multiple services from a group
   */
  removeServicesFromGroup(groupId: string, serviceIds: string[]): number {
    let removed = 0

    db.transaction(() => {
      for (const serviceId of serviceIds) {
        if (this.removeServiceFromGroup(groupId, serviceId)) {
          removed++
        }
      }
    })()

    return removed
  }

  /**
   * Get group statistics
   */
  getGroupStats(groupId: string): {
    totalServices: number
    runningServices: number
    healthyServices: number
  } {
    const serviceIds = this.getGroupServiceIds(groupId)

    if (serviceIds.length === 0) {
      return { totalServices: 0, runningServices: 0, healthyServices: 0 }
    }

    const placeholders = serviceIds.map(() => '?').join(',')

    // Count total
    const total = serviceIds.length

    // Count running (would need to check serviceManager, simplified here)
    const runningStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM services
      WHERE id IN (${placeholders}) AND status = 'running'
    `)
    const runningRow = runningStmt.get(...serviceIds) as { count: number }

    // Count healthy
    const healthyStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM services
      WHERE id IN (${placeholders}) AND health_status = 'healthy'
    `)
    const healthyRow = healthyStmt.get(...serviceIds) as { count: number }

    return {
      totalServices: total,
      runningServices: runningRow?.count || 0,
      healthyServices: healthyRow?.count || 0,
    }
  }
}

export const groupManager = new GroupManager()
