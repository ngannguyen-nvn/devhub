import { Router, Request, Response } from 'express'
import { EnvManager } from '../services/envManager'

const router = Router()
const envManager = new EnvManager()

// ===== PROFILES =====

/**
 * Get all environment profiles
 */
router.get('/profiles', (req: Request, res: Response) => {
  try {
    const profiles = envManager.getAllProfiles()
    res.json({ success: true, profiles })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a specific profile
 */
router.get('/profiles/:profileId', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const profile = envManager.getProfile(profileId)

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    res.json({ success: true, profile })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new profile
 */
router.post('/profiles', (req: Request, res: Response) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }

    const profile = envManager.createProfile(name, description)
    res.json({ success: true, profile })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a profile
 */
router.put('/profiles/:profileId', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { name, description } = req.body

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
router.delete('/profiles/:profileId', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
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
 * Copy a profile
 */
router.post('/profiles/:profileId/copy', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }

    // Create new profile
    const newProfile = envManager.createProfile(name, description)

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
router.get('/profiles/:profileId/variables', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { serviceId } = req.query

    const variables = envManager.getVariables(profileId, serviceId as string)
    res.json({ success: true, variables })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a specific variable
 */
router.get('/variables/:variableId', (req: Request, res: Response) => {
  try {
    const { variableId } = req.params
    const variable = envManager.getVariable(variableId)

    if (!variable) {
      return res.status(404).json({ success: false, error: 'Variable not found' })
    }

    res.json({ success: true, variable })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new variable
 */
router.post('/variables', (req: Request, res: Response) => {
  try {
    const { key, value, profileId, serviceId, isSecret, description } = req.body

    if (!key || value === undefined || !profileId) {
      return res.status(400).json({
        success: false,
        error: 'key, value, and profileId are required',
      })
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
router.put('/variables/:variableId', (req: Request, res: Response) => {
  try {
    const { variableId } = req.params
    const { key, value, isSecret, description } = req.body

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
router.delete('/variables/:variableId', (req: Request, res: Response) => {
  try {
    const { variableId } = req.params
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
router.post('/profiles/:profileId/import', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { filePath, serviceId } = req.body

    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' })
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
router.post('/profiles/:profileId/export', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const { filePath, serviceId } = req.body

    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' })
    }

    const exported = envManager.exportToEnvFile(profileId, filePath, serviceId)
    res.json({ success: true, exported })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Read .env file (preview)
 */
router.post('/read-env', (req: Request, res: Response) => {
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

export default router
