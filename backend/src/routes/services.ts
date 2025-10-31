import { Router, Request, Response } from 'express'
import { serviceManager } from '../services/serviceManager'
import { spawn } from 'child_process'
import os from 'os'

const router = Router()

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

/**
 * GET /api/services
 * Get all services for active workspace (or specified workspace_id)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const running = serviceManager.getRunningServices()

    // Merge service definitions with running status
    const servicesWithStatus = services.map(service => ({
      ...service,
      status: running.find(r => r.id === service.id)?.status || 'stopped',
      pid: running.find(r => r.id === service.id)?.pid,
    }))

    res.json({ success: true, services: servicesWithStatus, workspaceId })
  } catch (error) {
    console.error('Error getting services:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/services/:id
 * Get a specific service
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    const running = serviceManager.getServiceStatus(req.params.id)

    res.json({
      success: true,
      service: {
        ...service,
        status: running?.status || 'stopped',
        pid: running?.pid,
      },
    })
  } catch (error) {
    console.error('Error getting service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services
 * Create a new service in active workspace (or specified workspace_id)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, repoPath, command, port, envVars } = req.body

    if (!name || !repoPath || !command) {
      return res.status(400).json({
        success: false,
        error: 'Name, repoPath, and command are required',
      })
    }

    const workspaceId = await getWorkspaceId(req)

    const service = serviceManager.createService(workspaceId, {
      name,
      repoPath,
      command,
      port,
      envVars,
    })

    res.json({ success: true, service })
  } catch (error) {
    console.error('Error creating service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * PUT /api/services/:id
 * Update a service
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, repoPath, command, port, envVars } = req.body

    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    const updated = serviceManager.updateService(req.params.id, {
      name,
      repoPath,
      command,
      port,
      envVars,
    })

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * DELETE /api/services/:id
 * Delete a service
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    const deleted = serviceManager.deleteService(req.params.id)

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Service not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services/:id/start
 * Start a service
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    await serviceManager.startService(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error starting service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services/:id/stop
 * Stop a service
 */
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    serviceManager.stopService(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error stopping service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services/:id/terminal
 * Open service in a new terminal window
 */
router.post('/:id/terminal', async (req: Request, res: Response) => {
  try {
    console.log('\n========== TERMINAL SPAWN REQUEST ==========')

    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      console.log('❌ Service not found:', req.params.id)
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    console.log('✅ Service found:', service.name)
    console.log('   Repo path:', service.repoPath)
    console.log('   Command:', service.command)

    const platform = os.platform()
    const { repoPath, command, name } = service

    console.log('🖥️  Platform detected:', platform)
    console.log('   DISPLAY:', process.env.DISPLAY || 'not set')
    console.log('   PWD:', process.env.PWD)

    let terminalCommand: string
    let terminalArgs: string[]

    // Check if we're in WSL (even though platform shows 'linux')
    let isWSL = false
    if (platform === 'linux') {
      try {
        const fs = require('fs')
        const procVersion = fs.readFileSync('/proc/version', 'utf8')
        isWSL = procVersion.toLowerCase().includes('microsoft') || procVersion.toLowerCase().includes('wsl')
        console.log('🔍 WSL detection:', isWSL ? 'YES (found in /proc/version)' : 'NO')
        if (isWSL) {
          console.log('   /proc/version:', procVersion.substring(0, 100) + '...')
        }
      } catch {
        console.log('🔍 WSL detection: Could not read /proc/version')
      }
    }

    // Detect platform and choose appropriate terminal
    if (platform === 'darwin') {
      console.log('🍎 Using macOS Terminal.app')
      // macOS - use Terminal.app with osascript
      terminalCommand = 'osascript'
      terminalArgs = [
        '-e',
        `tell application "Terminal" to do script "cd '${repoPath}' && echo 'Running ${name}' && ${command}"`
      ]
    } else if (isWSL) {
      console.log('🪟 Running in WSL - attempting Windows terminal launch')

      // We're in WSL - try to launch Windows terminals
      // First convert WSL path to Windows path
      let windowsPath: string
      try {
        const { execSync } = require('child_process')
        windowsPath = execSync(`wslpath -w "${repoPath}"`, { encoding: 'utf8' }).trim()
        console.log('   WSL path converted:', repoPath, '→', windowsPath)
      } catch (err) {
        console.log('   ⚠️  wslpath conversion failed, using original path')
        windowsPath = repoPath
      }

      // Try Windows Terminal first
      try {
        require('child_process').execSync('which wt.exe', { stdio: 'ignore' })
        console.log('   ✅ Found: wt.exe (Windows Terminal)')
        terminalCommand = 'wt.exe'
        terminalArgs = [
          'wsl',
          '--cd',
          repoPath,
          'bash',
          '-c',
          `echo 'Running ${name}' && ${command}; exec bash`
        ]
      } catch {
        console.log('   ❌ wt.exe not found, trying cmd.exe')
        // Fallback to cmd.exe
        try {
          require('child_process').execSync('which cmd.exe', { stdio: 'ignore' })
          console.log('   ✅ Found: cmd.exe')
          terminalCommand = 'cmd.exe'
          terminalArgs = [
            '/c',
            'start',
            'cmd.exe',
            '/k',
            `wsl --cd ${repoPath} bash -c "echo 'Running ${name}' && ${command}; exec bash"`
          ]
        } catch {
          console.log('   ❌ cmd.exe not found')
          return res.status(400).json({
            success: false,
            error: 'No Windows terminal found from WSL. Ensure Windows Terminal (wt.exe) or cmd.exe is in PATH.'
          })
        }
      }
    } else if (platform === 'linux') {
      // Linux - check if we have a display server first
      if (!process.env.DISPLAY) {
        return res.status(400).json({
          success: false,
          error: 'No X11 display available. Terminal feature requires a graphical environment or X11 forwarding (set DISPLAY variable).'
        })
      }

      // Linux - try multiple terminal emulators
      const terminals = [
        {
          name: 'gnome-terminal',
          check: 'gnome-terminal',
          args: ['--', 'bash', '-c', `cd '${repoPath}' && echo 'Running ${name}' && ${command}; exec bash`]
        },
        {
          name: 'konsole',
          check: 'konsole',
          args: ['-e', 'bash', '-c', `cd '${repoPath}' && echo 'Running ${name}' && ${command}; exec bash`]
        },
        {
          name: 'xfce4-terminal',
          check: 'xfce4-terminal',
          args: ['-e', 'bash', '-c', `cd '${repoPath}' && echo 'Running ${name}' && ${command}; exec bash`]
        },
        {
          name: 'xterm',
          check: 'xterm',
          args: ['-hold', '-e', `cd '${repoPath}' && echo 'Running ${name}' && ${command}`]
        },
        {
          name: 'x-terminal-emulator',
          check: 'x-terminal-emulator',
          args: ['-e', 'bash', '-c', `cd '${repoPath}' && echo 'Running ${name}' && ${command}; exec bash`]
        }
      ]

      let foundTerminal = false
      for (const terminal of terminals) {
        try {
          require('child_process').execSync(`which ${terminal.check}`, { stdio: 'ignore' })
          terminalCommand = terminal.name
          terminalArgs = terminal.args
          foundTerminal = true
          break
        } catch {
          // Try next terminal
        }
      }

      if (!foundTerminal) {
        return res.status(400).json({
          success: false,
          error: 'No terminal emulator found. Please install gnome-terminal, konsole, xfce4-terminal, or xterm.'
        })
      }
    } else if (platform === 'win32') {
      // Windows - check for WSL first, fallback to cmd
      try {
        // Check if WSL is available
        require('child_process').execSync('wsl --list --quiet', { stdio: 'ignore' })
        // WSL is available - use Windows Terminal with WSL
        try {
          // Try Windows Terminal first
          require('child_process').execSync('where wt', { stdio: 'ignore' })
          terminalCommand = 'wt'
          terminalArgs = [
            'wsl',
            '--',
            'bash',
            '-c',
            `cd '${repoPath}' && echo 'Running ${name}' && ${command}; exec bash`
          ]
        } catch {
          // Fallback to cmd with wsl
          terminalCommand = 'cmd'
          terminalArgs = [
            '/c',
            'start',
            'cmd',
            '/k',
            `wsl bash -c "cd '${repoPath}' && echo 'Running ${name}' && ${command}; exec bash"`
          ]
        }
      } catch {
        // No WSL, use regular cmd
        terminalCommand = 'cmd'
        terminalArgs = [
          '/c',
          'start',
          'cmd',
          '/k',
          `cd /d "${repoPath}" && echo Running ${name} && ${command}`
        ]
      }
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported platform: ${platform}`
      })
    }

    // Spawn the terminal
    console.log('🚀 Spawning terminal...')
    console.log('   Command:', terminalCommand)
    console.log('   Args:', JSON.stringify(terminalArgs, null, 2))

    const terminal = spawn(terminalCommand, terminalArgs, {
      detached: true,
      stdio: 'ignore'
    })

    console.log('   Process spawned with PID:', terminal.pid)

    // Handle spawn errors
    terminal.on('error', (err) => {
      console.error('❌ Terminal spawn error:', err)
      console.error('   Error code:', (err as any).code)
      console.error('   Error syscall:', (err as any).syscall)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: `Failed to spawn terminal: ${err.message}`
        })
      }
    })

    terminal.on('exit', (code, signal) => {
      console.log('🔚 Terminal process exited')
      console.log('   Exit code:', code)
      console.log('   Signal:', signal)
    })

    terminal.unref() // Allow the process to run independently

    console.log('✅ Terminal spawn initiated successfully')
    console.log('============================================\n')

    res.json({
      success: true,
      message: `Opened ${name} in new terminal`
    })
  } catch (error) {
    console.error('❌ Exception in terminal endpoint:', error)
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open terminal'
    })
  }
})

/**
 * GET /api/services/:id/logs
 * Get service logs
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    // Verify service exists and belongs to a workspace the user has access to
    const workspaceId = await getWorkspaceId(req)
    const services = serviceManager.getAllServices(workspaceId)
    const service = services.find(s => s.id === req.params.id)

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found in this workspace' })
    }

    const lines = req.query.lines ? parseInt(req.query.lines as string, 10) : 100
    const logs = serviceManager.getServiceLogs(req.params.id, lines)

    res.json({ success: true, logs })
  } catch (error) {
    console.error('Error getting logs:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/services/batch
 * Create multiple services in a single request
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { services } = req.body

    if (!Array.isArray(services)) {
      return res.status(400).json({ error: 'services must be an array' })
    }

    if (services.length === 0) {
      return res.status(400).json({ error: 'services array cannot be empty' })
    }

    // Get workspace ID (can be overridden in body or uses active workspace)
    const workspaceId = await getWorkspaceId(req)

    // Get existing services to check for duplicates
    const existingServices = serviceManager.getAllServices(workspaceId)
    const existingRepoPaths = new Set(existingServices.map(s => s.repoPath))

    const results = {
      created: [] as any[],
      skipped: [] as any[],
      failed: [] as any[],
    }

    // Process all services
    for (const serviceData of services) {
      try {
        // Validate required fields
        if (!serviceData.name || !serviceData.repoPath || !serviceData.command) {
          results.failed.push({
            service: serviceData,
            error: 'Missing required fields (name, repoPath, command)',
          })
          continue
        }

        // Check for duplicate
        if (existingRepoPaths.has(serviceData.repoPath)) {
          results.skipped.push({
            repoPath: serviceData.repoPath,
            name: serviceData.name,
            reason: 'Service with this repoPath already exists',
          })
          continue
        }

        // Create service
        const service = serviceManager.createService(workspaceId, {
          name: serviceData.name,
          repoPath: serviceData.repoPath,
          command: serviceData.command,
          port: serviceData.port || undefined,
          envVars: serviceData.envVars || undefined,
        })

        results.created.push(service)
        // Add to existing paths to prevent duplicates within this batch
        existingRepoPaths.add(serviceData.repoPath)
      } catch (error) {
        results.failed.push({
          service: serviceData,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        total: services.length,
        created: results.created.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      },
    })
  } catch (error) {
    console.error('Error in batch service creation:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
export { serviceManager }
