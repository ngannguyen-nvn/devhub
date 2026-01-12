import express, { Request, Response } from 'express'
import { groupManager } from '@devhub/core'

const router = express.Router()

// Security: Validate group name (alphanumeric, spaces, hyphens, underscores)
function validateGroupName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0 || name.length > 100) {
    return false
  }
  return /^[a-zA-Z0-9\s\-_]+$/.test(name)
}

// Security: Validate color (hex color or CSS color name)
function validateColor(color: string): boolean {
  if (typeof color !== 'string' || color.length === 0 || color.length > 50) {
    return false
  }
  // Allow hex colors (#fff, #ffffff) or simple color names
  return /^(#[a-fA-F0-9]{3,8}|[a-zA-Z]+)$/.test(color)
}

// Security: Sanitize string input
function sanitizeString(input: any, maxLength = 100): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, maxLength).trim()
}

/**
 * GET /api/groups/:workspaceId
 * Get all groups in a workspace
 */
router.get('/:workspaceId', (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params
    const groups = groupManager.getGroups(workspaceId)
    res.json({ success: true, groups })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/groups/group/:groupId
 * Get a specific group
 */
router.get('/group/:groupId', (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    const group = groupManager.getGroup(groupId)

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    res.json({ success: true, group })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/groups
 * Create a new group
 * Body: { workspaceId, name, description?, color?, icon? }
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { workspaceId, name, description, color, icon } = req.body

    if (!workspaceId || !name) {
      return res.status(400).json({ success: false, error: 'workspaceId and name are required' })
    }

    // Security: Validate group name
    if (!validateGroupName(name)) {
      return res.status(400).json({ success: false, error: 'Invalid group name. Use only alphanumeric characters, spaces, hyphens, and underscores (max 100 chars)' })
    }

    // Security: Validate color if provided
    if (color && !validateColor(color)) {
      return res.status(400).json({ success: false, error: 'Invalid color format. Use hex colors (#fff) or color names' })
    }

    const group = groupManager.createGroup(workspaceId, sanitizeString(name, 100), {
      description: description ? sanitizeString(description, 500) : undefined,
      color: color ? sanitizeString(color, 50) : undefined,
      icon: icon ? sanitizeString(icon, 50) : undefined,
    })
    res.json({ success: true, group })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/groups/:groupId
 * Update a group
 */
router.put('/:groupId', (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    const { name, description, color, icon } = req.body

    // Security: Validate name if provided
    if (name !== undefined && !validateGroupName(name)) {
      return res.status(400).json({ success: false, error: 'Invalid group name. Use only alphanumeric characters, spaces, hyphens, and underscores (max 100 chars)' })
    }

    // Security: Validate color if provided
    if (color !== undefined && color !== null && !validateColor(color)) {
      return res.status(400).json({ success: false, error: 'Invalid color format. Use hex colors (#fff) or color names' })
    }

    const sanitizedUpdates = {
      name: name !== undefined ? sanitizeString(name, 100) : undefined,
      description: description !== undefined ? sanitizeString(description, 500) : undefined,
      color: color !== undefined ? sanitizeString(color, 50) : undefined,
      icon: icon !== undefined ? sanitizeString(icon, 50) : undefined,
    }

    const success = groupManager.updateGroup(groupId, sanitizedUpdates)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Group not found or no changes made' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/groups/:groupId
 * Delete a group
 */
router.delete('/:groupId', (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    const success = groupManager.deleteGroup(groupId)
    res.json({ success })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/groups/:groupId/services
 * Add service(s) to group
 * Body: { serviceId } or { serviceIds: string[] }
 */
router.post('/:groupId/services', (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    const { serviceId, serviceIds } = req.body

    if (serviceIds && Array.isArray(serviceIds)) {
      const added = groupManager.addServicesToGroup(groupId, serviceIds)
      return res.json({ success: true, added })
    }

    if (serviceId) {
      const success = groupManager.addServiceToGroup(groupId, serviceId)
      return res.json({ success })
    }

    res.status(400).json({ success: false, error: 'serviceId or serviceIds required' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/groups/:groupId/services/:serviceId
 * Remove service from group
 */
router.delete('/:groupId/services/:serviceId', (req: Request, res: Response) => {
  try {
    const { groupId, serviceId } = req.params
    const success = groupManager.removeServiceFromGroup(groupId, serviceId)
    res.json({ success })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/groups/:groupId/reorder
 * Reorder services in group
 * Body: { serviceIds: string[] }
 */
router.put('/:groupId/reorder', (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    const { serviceIds } = req.body

    if (!Array.isArray(serviceIds)) {
      return res.status(400).json({ success: false, error: 'serviceIds array required' })
    }

    const success = groupManager.reorderGroup(groupId, serviceIds)
    res.json({ success })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/groups/:groupId/stats
 * Get group statistics
 */
router.get('/:groupId/stats', (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    const stats = groupManager.getGroupStats(groupId)
    res.json({ success: true, stats })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/groups/service/:serviceId/groups
 * Get all groups a service belongs to
 */
router.get('/service/:serviceId/groups', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const groups = groupManager.getServiceGroups(serviceId)
    res.json({ success: true, groups })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/groups/:groupId/start-all
 * Start all services in a group
 */
router.post('/:groupId/start-all', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    const result = await groupManager.startAllServices(groupId)
    res.json({ success: true, ...result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/groups/:groupId/stop-all
 * Stop all services in a group
 */
router.post('/:groupId/stop-all', (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    const result = groupManager.stopAllServices(groupId)
    res.json({ success: true, ...result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
