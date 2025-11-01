import { Router, Request, Response } from 'express'
import { EnvManager } from '@devhub/core'

const router = Router()
const envManager = new EnvManager()

/**
 * Middleware to get active workspace ID
 * Can be overridden by workspace_id query param
 */
async function getWorkspaceId(req: Request): Promise<string> {
  // Allow explicit workspace_id in query or body
  const explicitWorkspaceId = req.query.workspace_id || req.body?.workspace_id

  if (explicitWorkspaceId && typeof explicitWorkspaceId === 'string') {
    return explicitWorkspaceId
  }

  // Otherwise, use active workspace
  const db = require('../db').default
  const stmt = db.prepare('SELECT id FROM workspaces WHERE active = 1 LIMIT 1')
  const row = stmt.get() as { id: string } | undefined

  if (!row) {
    throw new Error('No active workspace found. Please activate a workspace first.')
  }

  return row.id
}

// ===== PROFILES =====

/**
 * Get all environment profiles for active workspace
 */
router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const workspaceId = await getWorkspaceId(req)
    const profiles = envManager.getAllProfiles(workspaceId)
    res.json({ success: true, profiles, workspaceId })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a specific profile
 */
router.get('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const profile = envManager.getProfile(profileId)

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    // Verify profile belongs to accessible workspace
    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    res.json({ success: true, profile })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new profile in active workspace
 */
router.post('/profiles', async (req: Request, res: Response) => {
  try {
    const { name, description, sourceType, sourceId, sourceName } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }

    const workspaceId = await getWorkspaceId(req)

    // Build metadata object if source fields are provided
    const metadata = (sourceType || sourceId || sourceName) ? {
      sourceType,
      sourceId,
      sourceName,
    } : undefined

    const profile = envManager.createProfile(workspaceId, name, description, metadata)
    res.json({ success: true, profile })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a profile
 */
router.put('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { name, description } = req.body

    // Verify profile belongs to accessible workspace
    const profile = envManager.getProfile(profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    const updated = envManager.updateProfile(profileId, { name, description })

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a profile
 */
router.delete('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params

    // Verify profile belongs to accessible workspace
    const profile = envManager.getProfile(profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    const deleted = envManager.deleteProfile(profileId)

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Copy a profile within the same workspace
 */
router.post('/profiles/:profileId/copy', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }

    // Verify profile belongs to accessible workspace
    const profile = envManager.getProfile(profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    // Create new profile in same workspace
    const newProfile = envManager.createProfile(workspaceId, name, description)

    // Copy variables
    const copied = envManager.copyProfile(profileId, newProfile.id)

    res.json({ success: true, profile: newProfile, copiedVariables: copied })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== VARIABLES =====

/**
 * Get all variables for a profile
 */
router.get('/profiles/:profileId/variables', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { serviceId } = req.query

    // Verify profile belongs to accessible workspace
    const profile = envManager.getProfile(profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    const variables = envManager.getVariables(profileId, serviceId as string)
    res.json({ success: true, variables })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a specific variable
 */
router.get('/variables/:variableId', async (req: Request, res: Response) => {
  try {
    const { variableId } = req.params
    const variable = envManager.getVariable(variableId)

    if (!variable) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    // Verify variable's profile belongs to accessible workspace
    const profile = envManager.getProfile(variable.profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Variable not found in this workspace' })
    }

    res.json({ success: true, variable })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new variable
 */
router.post('/variables', async (req: Request, res: Response) => {
  try {
    const { key, value, profileId, serviceId, isSecret, description } = req.body

    if (!key || value === undefined || !profileId) {
      return res.status(400).json({
        success: false,
        error: 'key, value, and profileId are required',
      })
    }

    // Verify profile belongs to accessible workspace
    const profile = envManager.getProfile(profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    const variable = envManager.createVariable({
      key,
      value,
      profileId,
      serviceId,
      isSecret,
      description,
    })

    res.json({ success: true, variable })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a variable
 */
router.put('/variables/:variableId', async (req: Request, res: Response) => {
  try {
    const { variableId } = req.params
    const { key, value, isSecret, description } = req.body

    // Verify variable's profile belongs to accessible workspace
    const variable = envManager.getVariable(variableId)
    if (!variable) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    const profile = envManager.getProfile(variable.profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Variable not found in this workspace' })
    }

    const updated = envManager.updateVariable(variableId, {
      key,
      value,
      isSecret,
      description,
    })

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a variable
 */
router.delete('/variables/:variableId', async (req: Request, res: Response) => {
  try {
    const { variableId } = req.params

    // Verify variable's profile belongs to accessible workspace
    const variable = envManager.getVariable(variableId)
    if (!variable) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    const profile = envManager.getProfile(variable.profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Variable not found in this workspace' })
    }

    const deleted = envManager.deleteVariable(variableId)

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== FILE OPERATIONS =====

/**
 * Import variables from .env file
 */
router.post('/profiles/:profileId/import', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { filePath, serviceId } = req.body

    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' })
    }

    // Verify profile belongs to accessible workspace
    const profile = envManager.getProfile(profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    const imported = envManager.importFromEnvFile(filePath, profileId, serviceId)
    res.json({ success: true, imported })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Export variables to .env file
 */
router.post('/profiles/:profileId/export', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { filePath, serviceId } = req.body

    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' })
    }

    // Verify profile belongs to accessible workspace
    const profile = envManager.getProfile(profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    const exported = envManager.exportToEnvFile(profileId, filePath, serviceId)
    res.json({ success: true, exported })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Read .env file (preview) - not workspace-scoped
 */
router.post('/read-env', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body

    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' })
    }

    const variables = envManager.readEnvFile(filePath)
    res.json({ success: true, variables })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Sync profile variables to a service's .env file
 */
router.post('/profiles/:profileId/sync-to-service', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { serviceId } = req.body

    if (!serviceId) {
      return res.status(400).json({ success: false, error: 'serviceId is required' })
    }

    // Verify profile belongs to accessible workspace
    const profile = envManager.getProfile(profileId)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    const workspaceId = await getWorkspaceId(req)
    if (profile.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Profile not found in this workspace' })
    }

    // Get service details
    const db = require('../db').default
    const service = db.prepare('SELECT * FROM services WHERE id = ? AND workspace_id = ?').get(serviceId, workspaceId)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    // Sync to service's .env file
    const filePath = `${service.repo_path}/.env`
    const synced = envManager.exportToEnvFile(profileId, filePath)

    res.json({
      success: true,
      synced,
      filePath,
      serviceName: service.name,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
