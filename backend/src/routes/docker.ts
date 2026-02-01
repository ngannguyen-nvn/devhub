import { Router, Request, Response } from 'express'
import { DockerManager, dockerComposeParser, serviceManager } from '@devhub/core'
import path from 'path'
import fs from 'fs/promises'

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

/**
 * POST /api/docker/compose/parse
 * Parse a docker-compose file and return service information
 */
router.post('/compose/parse', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'filePath is required',
      })
    }

    // Security: Validate path
    if (!validatePath(filePath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path',
      })
    }

    const parsed = await dockerComposeParser.parseFile(filePath)

    if (!parsed) {
      return res.status(400).json({
        success: false,
        error: 'Failed to parse docker-compose file',
      })
    }

    res.json({ success: true, compose: parsed })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/docker/compose/import
 * Import services from docker-compose file into DevHub
 */
router.post('/compose/import', async (req: Request, res: Response) => {
  try {
    const { filePath, workspaceId, serviceNames } = req.body

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'filePath is required',
      })
    }

    // Security: Validate path
    if (!validatePath(filePath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path',
      })
    }

    const parsed = await dockerComposeParser.parseFile(filePath)

    if (!parsed) {
      return res.status(400).json({
        success: false,
        error: 'Failed to parse docker-compose file',
      })
    }

    // Filter services if specific ones requested
    const servicesToImport = serviceNames && Array.isArray(serviceNames)
      ? parsed.services.filter(s => serviceNames.includes(s.name))
      : parsed.services

    // Import each service
    const importedServices = []
    for (const composeService of servicesToImport) {
      const repoPath = path.dirname(filePath)
      const devhubService = dockerComposeParser.convertToDevHubService(composeService, repoPath)
      
      // Add workspace ID if provided
      if (workspaceId) {
        devhubService.workspaceId = workspaceId
      }

      importedServices.push(devhubService)
    }

    res.json({
      success: true,
      imported: importedServices.length,
      services: importedServices,
      compose: {
        filePath: parsed.filePath,
        fileName: parsed.fileName,
        version: parsed.version,
        networks: parsed.networks,
        volumes: parsed.volumes,
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/docker/compose/validate
 * Validate docker-compose YAML content
 */
router.post('/compose/validate', async (req: Request, res: Response) => {
  try {
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'content is required',
      })
    }

    const result = dockerComposeParser.validateContent(content)

    if (result.valid) {
      res.json({ success: true, valid: true })
    } else {
      res.json({ success: true, valid: false, error: result.error })
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/docker/compose/save
 * Save docker-compose content to file
 */
router.post('/compose/save', async (req: Request, res: Response) => {
  try {
    const { filePath, content } = req.body

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'filePath is required',
      })
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'content is required',
      })
    }

    // Security: Validate path
    if (!validatePath(filePath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path',
      })
    }

    // Validate content first
    const validation = dockerComposeParser.validateContent(content)
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid docker-compose content: ${validation.error}`,
      })
    }

    const success = await dockerComposeParser.saveFile(filePath, content)

    if (success) {
      res.json({ success: true, message: 'File saved successfully' })
    } else {
      res.status(500).json({ success: false, error: 'Failed to save file' })
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/docker/compose/up
 * Run docker-compose up on a compose file
 */
router.post('/compose/up', async (req: Request, res: Response) => {
  try {
    const { filePath, options = {} } = req.body

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'filePath is required',
      })
    }

    // Security: Validate path
    if (!validatePath(filePath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path',
      })
    }

    // Use Dockerode to run compose (requires docker-compose CLI)
    const { spawn } = require('child_process')
    const cwd = path.dirname(filePath)
    const fileName = path.basename(filePath)

    const args = ['-f', fileName, 'up', '-d']
    
    if (options.build) args.push('--build')
    if (options.forceRecreate) args.push('--force-recreate')
    if (options.services && Array.isArray(options.services)) {
      args.push(...options.services)
    }

    const composeProcess = spawn('docker', ['compose', ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    composeProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    composeProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    composeProcess.on('close', (code: number) => {
      if (code === 0) {
        res.json({ success: true, output: stdout })
      } else {
        res.status(500).json({
          success: false,
          error: `docker compose up failed with code ${code}`,
          output: stdout,
          errorOutput: stderr,
        })
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/docker/compose/down
 * Run docker-compose down on a compose file
 */
router.post('/compose/down', async (req: Request, res: Response) => {
  try {
    const { filePath, options = {} } = req.body

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'filePath is required',
      })
    }

    // Security: Validate path
    if (!validatePath(filePath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path',
      })
    }

    const { spawn } = require('child_process')
    const cwd = path.dirname(filePath)
    const fileName = path.basename(filePath)

    const args = ['-f', fileName, 'down']
    
    if (options.volumes) args.push('-v')
    if (options.removeImages) args.push('--rmi', options.removeImages)
    if (options.removeOrphans) args.push('--remove-orphans')

    const composeProcess = spawn('docker', ['compose', ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    composeProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    composeProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    composeProcess.on('close', (code: number) => {
      if (code === 0) {
        res.json({ success: true, output: stdout })
      } else {
        res.status(500).json({
          success: false,
          error: `docker compose down failed with code ${code}`,
          output: stdout,
          errorOutput: stderr,
        })
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/docker/compose/ps
 * List containers from docker-compose file
 */
router.get('/compose/ps', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.query

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'filePath query parameter is required',
      })
    }

    // Security: Validate path
    if (!validatePath(filePath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path',
      })
    }

    const { spawn } = require('child_process')
    const cwd = path.dirname(filePath)
    const fileName = path.basename(filePath)

    const composeProcess = spawn('docker', ['compose', '-f', fileName, 'ps', '--format', 'json'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    composeProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    composeProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    composeProcess.on('close', (code: number) => {
      if (code === 0) {
        try {
          // Parse the JSON output if available
          const containers = stdout ? JSON.parse(stdout) : []
          res.json({ success: true, containers })
        } catch {
          // If JSON parsing fails, return raw output
          res.json({ success: true, containers: [], output: stdout })
        }
      } else {
        res.status(500).json({
          success: false,
          error: `docker compose ps failed with code ${code}`,
          errorOutput: stderr,
        })
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/docker/compose/logs
 * Get logs from docker-compose services
 */
router.get('/compose/logs', async (req: Request, res: Response) => {
  try {
    const { filePath, service, tail = '100' } = req.query

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'filePath query parameter is required',
      })
    }

    // Security: Validate path
    if (!validatePath(filePath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path',
      })
    }

    const { spawn } = require('child_process')
    const cwd = path.dirname(filePath)
    const fileName = path.basename(filePath)

    const args = ['-f', fileName, 'logs', '--tail', String(tail)]
    if (service && typeof service === 'string') {
      args.push(service)
    }

    const composeProcess = spawn('docker', ['compose', ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    composeProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    composeProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    composeProcess.on('close', (code: number) => {
      // Compose logs returns exit code 0 even if some services are stopped
      res.json({
        success: true,
        logs: stdout,
        errors: stderr || undefined,
      })
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/docker/compose/scan
 * Scan any directory for docker-compose files (not just git repos)
 */
router.get('/compose/scan', async (req: Request, res: Response) => {
  try {
    const { path: scanPath, depth = '4' } = req.query

    if (!scanPath || typeof scanPath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'path query parameter is required',
      })
    }

    // Security: Validate path
    if (!validatePath(scanPath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid path',
      })
    }

    const maxDepth = parseInt(depth as string, 10) || 4
    const composeFiles: string[] = []
    
    // Patterns to match
    const isDockerComposeFile = (fileName: string): boolean => {
      if (['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'].includes(fileName)) {
        return true
      }
      if (fileName.startsWith('docker-compose.') && (fileName.endsWith('.yml') || fileName.endsWith('.yaml'))) {
        return true
      }
      if (fileName.startsWith('compose.') && (fileName.endsWith('.yml') || fileName.endsWith('.yaml'))) {
        return true
      }
      return false
    }
    
    // Directories to skip
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor']

    // Recursive scan function
    const scanDir = async (currentDir: string, currentDepth: number): Promise<void> => {
      if (currentDepth > maxDepth) return

      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name)

          if (entry.isFile() && isDockerComposeFile(entry.name)) {
            composeFiles.push(fullPath)
          } else if (entry.isDirectory() && 
                     !entry.name.startsWith('.') && 
                     !skipDirs.includes(entry.name)) {
            await scanDir(fullPath, currentDepth + 1)
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await scanDir(scanPath, 0)

    res.json({
      success: true,
      path: scanPath,
      count: composeFiles.length,
      files: composeFiles,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
