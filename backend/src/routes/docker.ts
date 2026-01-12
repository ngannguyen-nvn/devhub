import { Router, Request, Response } from 'express'
import { DockerManager } from '@devhub/core'

const router = Router()
const dockerManager = new DockerManager()

// Security: Path traversal protection
function validatePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return !normalized.includes('../') && !normalized.includes('..\\')
}

// Security: Validate container/image name (alphanumeric, underscores, hyphens, dots, colons)
function validateDockerName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0 || name.length > 200) {
    return false
  }
  return /^[a-zA-Z0-9_.\-/:]+$/.test(name)
}

// Security: Sanitize string input
function sanitizeString(input: any, maxLength = 200): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, maxLength).trim()
}

/**
 * Ping Docker to check if it's available
 */
router.get('/ping', async (req: Request, res: Response) => {
  try {
    const isAvailable = await dockerManager.ping()
    res.json({ success: true, available: isAvailable })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get Docker info
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const info = await dockerManager.getInfo()
    res.json({ success: true, info })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * List all Docker images
 */
router.get('/images', async (req: Request, res: Response) => {
  try {
    const images = await dockerManager.listImages()
    res.json({ success: true, images })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Build Docker image
 * Body: { contextPath, dockerfilePath, tag }
 */
router.post('/images/build', async (req: Request, res: Response) => {
  try {
    const { contextPath, dockerfilePath, tag } = req.body

    if (!contextPath || !dockerfilePath || !tag) {
      return res.status(400).json({
        success: false,
        error: 'contextPath, dockerfilePath, and tag are required',
      })
    }

    // Security: Validate paths (prevent traversal)
    if (!validatePath(contextPath) || !validatePath(dockerfilePath)) {
      return res.status(400).json({
        success: false,
        error: 'Path contains invalid sequences (../ or ..\\)',
      })
    }

    // Security: Validate tag name
    if (!validateDockerName(tag)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tag name. Use only alphanumeric characters, underscores, hyphens, dots, and colons',
      })
    }

    // Set up SSE for build progress
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    await dockerManager.buildImage(
      sanitizeString(contextPath, 500),
      sanitizeString(dockerfilePath, 500),
      sanitizeString(tag, 200),
      (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`)
      }
    )

    res.write(`data: ${JSON.stringify({ success: true })}\n\n`)
    res.end()
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ success: false, error: error.message })}\n\n`)
    res.end()
  }
})

/**
 * Remove Docker image
 */
router.delete('/images/:imageId', async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params
    const force = req.query.force === 'true'

    await dockerManager.removeImage(imageId, force)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * List all Docker containers
 */
router.get('/containers', async (req: Request, res: Response) => {
  try {
    const all = req.query.all === 'true'
    const containers = await dockerManager.listContainers(all)
    res.json({ success: true, containers })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Run a new container
 * Body: { imageName, containerName, ports, env, volumes, command }
 */
router.post('/containers/run', async (req: Request, res: Response) => {
  try {
    const { imageName, containerName, ports, env, volumes, command } = req.body

    if (!imageName || !containerName) {
      return res.status(400).json({
        success: false,
        error: 'imageName and containerName are required',
      })
    }

    // Security: Validate image name
    if (!validateDockerName(imageName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image name. Use only alphanumeric characters, underscores, hyphens, dots, and colons',
      })
    }

    // Security: Validate container name
    if (!validateDockerName(containerName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid container name. Use only alphanumeric characters, underscores, hyphens, dots, and colons',
      })
    }

    const containerId = await dockerManager.runContainer(
      sanitizeString(imageName, 200),
      sanitizeString(containerName, 200),
      { ports, env, volumes, command }
    )

    res.json({ success: true, containerId })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Start a stopped container
 */
router.post('/containers/:containerId/start', async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params
    await dockerManager.startContainer(containerId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Stop a running container
 */
router.post('/containers/:containerId/stop', async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params
    await dockerManager.stopContainer(containerId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Remove a container
 */
router.delete('/containers/:containerId', async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params
    const force = req.query.force === 'true'
    await dockerManager.removeContainer(containerId, force)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get container logs
 */
router.get('/containers/:containerId/logs', async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params
    const tail = req.query.tail ? parseInt(req.query.tail as string) : 100

    const logs = await dockerManager.getContainerLogs(containerId, tail)
    res.json({ success: true, logs })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Generate docker-compose.yml
 * Body: { services: [...] }
 */
router.post('/compose/generate', async (req: Request, res: Response) => {
  try {
    const { services } = req.body

    if (!services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        error: 'services array is required',
      })
    }

    const yaml = dockerManager.generateDockerCompose(services)
    res.json({ success: true, yaml })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
