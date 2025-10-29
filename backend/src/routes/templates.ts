import express, { Request, Response } from 'express'
import { templateManager } from '../services/templateManager'

const router = express.Router()

/**
 * GET /api/templates
 * Get all service templates
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const templates = templateManager.getAllTemplates()
    res.json({ success: true, templates })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/templates/:id
 * Get template by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const template = templateManager.getTemplate(id)

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' })
    }

    res.json({ success: true, template })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/templates/language/:language
 * Get templates by language
 */
router.get('/language/:language', (req: Request, res: Response) => {
  try {
    const { language } = req.params
    const templates = templateManager.getTemplatesByLanguage(language)
    res.json({ success: true, templates })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/templates/detect
 * Detect template from repository path
 * Body: { repoPath: string }
 */
router.post('/detect', (req: Request, res: Response) => {
  try {
    const { repoPath } = req.body

    if (!repoPath) {
      return res.status(400).json({ success: false, error: 'repoPath is required' })
    }

    const template = templateManager.detectTemplate(repoPath)

    if (!template) {
      return res.json({ success: true, template: null, message: 'No matching template found' })
    }

    res.json({ success: true, template })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/templates
 * Create custom template
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      icon,
      language,
      framework,
      defaultCommand,
      defaultPort,
      defaultEnvVars,
      healthCheckConfig,
      detectFiles,
    } = req.body

    if (!name || !language || !defaultCommand || !detectFiles) {
      return res.status(400).json({
        success: false,
        error: 'name, language, defaultCommand, and detectFiles are required',
      })
    }

    const template = templateManager.createTemplate({
      name,
      description,
      icon,
      language,
      framework,
      defaultCommand,
      defaultPort,
      defaultEnvVars,
      healthCheckConfig,
      detectFiles,
      isBuiltin: false,
    })

    res.json({ success: true, template })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/templates/:id
 * Update template (custom templates only)
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Check if template is built-in
    const template = templateManager.getTemplate(id)
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' })
    }

    if (template.isBuiltin) {
      return res.status(403).json({ success: false, error: 'Cannot modify built-in templates' })
    }

    const success = templateManager.updateTemplate(id, updates)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Template not found or no changes made' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/templates/:id
 * Delete template (custom templates only)
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const success = templateManager.deleteTemplate(id)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Template not found or is built-in' })
    }

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
