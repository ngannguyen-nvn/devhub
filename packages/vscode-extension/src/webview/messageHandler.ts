/**
 * Message Handler
 *
 * Handles messages from the webview and routes them to appropriate
 * @devhub/core service managers. This is the bridge between the UI
 * and the business logic.
 *
 * NOTE: This is a simplified version for Phase 1/2. Many methods are
 * stubbed or simplified to get the extension working. Full implementation
 * will be completed in later phases.
 */

import { DevHubManager } from '../extensionHost/devhubManager'

export class MessageHandler {
  constructor(
    private devhubManager: DevHubManager,
    private postMessage?: (message: any) => void
  ) {}

  /**
   * Handle message from webview
   * Routes to appropriate service manager method
   */
  async handleMessage(message: any): Promise<any> {
    const { type, payload } = message

    try {
      // Repository operations
      if (type === 'repos.scan') {
        return await this.devhubManager.scanWorkspace()
      }

      // Get workspace ID for operations that need it
      const workspaceId = this.devhubManager.getActiveWorkspaceId()

      // Service operations
      if (type === 'services.getAll') {
        const services = this.devhubManager.getServiceManager().getAllServices(workspaceId)
        return services
      }

      if (type === 'services.getRunning') {
        const running = this.devhubManager.getServiceManager().getRunningServicesForWorkspace(workspaceId)
        return running
      }

      if (type === 'services.create') {
        const { name, repoPath, command, port, envVars } = payload
        return this.devhubManager.getServiceManager().createService(workspaceId, {
          name,
          repoPath,
          command,
          port,
          envVars,
        })
      }

      if (type === 'services.update') {
        const { id, ...updates } = payload
        return this.devhubManager.getServiceManager().updateService(id, updates)
      }

      if (type === 'services.delete') {
        return this.devhubManager.getServiceManager().deleteService(payload.id)
      }

      if (type === 'services.start') {
        return this.devhubManager.getServiceManager().startService(payload.id)
      }

      if (type === 'services.stop') {
        return this.devhubManager.getServiceManager().stopService(payload.id)
      }

      if (type === 'services.getLogs') {
        const service = this.devhubManager.getServiceManager()
          .getRunningServices()
          .find(s => s.id === payload.id)
        return service?.logs || []
      }

      // Docker operations
      if (type === 'docker.ping') {
        try {
          const info = await this.devhubManager.getDockerManager().getInfo()
          return { available: true, info }
        } catch (error) {
          return { available: false }
        }
      }

      if (type === 'docker.listImages') {
        const images = await this.devhubManager.getDockerManager().listImages()
        return { images }
      }

      if (type === 'docker.buildImage') {
        const { contextPath, dockerfilePath, tag } = payload
        try {
          await this.devhubManager.getDockerManager().buildImage(contextPath, dockerfilePath || 'Dockerfile', tag)
          return { success: true }
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Build failed' }
        }
      }

      if (type === 'docker.buildImageStream') {
        const { contextPath, dockerfilePath, tag, requestId } = payload

        if (!this.postMessage) {
          return { success: false, error: 'Streaming not supported' }
        }

        try {
          const buildLogs: string[] = []
          await this.devhubManager.getDockerManager().buildImage(
            contextPath,
            dockerfilePath || 'Dockerfile',
            tag,
            (progress) => {
              // Send progress updates to webview
              const logLine = progress.stream || progress.status || JSON.stringify(progress)
              buildLogs.push(logLine)
              this.postMessage!({
                type: 'docker.buildProgress',
                payload: {
                  requestId,
                  log: logLine,
                  progress,
                },
              })
            }
          )

          // Send completion
          this.postMessage!({
            type: 'docker.buildComplete',
            payload: {
              requestId,
              success: true,
              logs: buildLogs,
            },
          })

          return { success: true, streamed: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Build failed'
          this.postMessage!({
            type: 'docker.buildComplete',
            payload: {
              requestId,
              success: false,
              error: errorMessage,
            },
          })
          return { success: false, error: errorMessage }
        }
      }

      if (type === 'docker.removeImage') {
        await this.devhubManager.getDockerManager().removeImage(payload.id)
        return { success: true }
      }

      if (type === 'docker.listContainers') {
        const containers = await this.devhubManager.getDockerManager().listContainers()
        return { containers }
      }

      if (type === 'docker.runContainer') {
        const { imageName, containerName, ports, env } = payload
        const container = await this.devhubManager.getDockerManager().runContainer(imageName, containerName, { ports, env })
        return { success: true, container }
      }

      if (type === 'docker.startContainer') {
        await this.devhubManager.getDockerManager().startContainer(payload.id)
        return { success: true }
      }

      if (type === 'docker.stopContainer') {
        await this.devhubManager.getDockerManager().stopContainer(payload.id)
        return { success: true }
      }

      if (type === 'docker.removeContainer') {
        await this.devhubManager.getDockerManager().removeContainer(payload.id)
        return { success: true }
      }

      if (type === 'docker.getContainerLogs') {
        const logs = await this.devhubManager.getDockerManager().getContainerLogs(payload.id)
        return { logs }
      }

      if (type === 'docker.generateCompose') {
        const { services } = payload
        const yaml = await this.devhubManager.getDockerManager().generateDockerCompose(services)
        return { yaml }
      }

      if (type === 'docker.parseCompose') {
        const { filePath } = payload
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('filePath is required')
        }
        const parsed = await this.devhubManager.getDockerComposeParser().parseFile(filePath)
        if (!parsed) {
          throw new Error('Failed to parse docker-compose file')
        }
        return { compose: parsed }
      }

      if (type === 'docker.importCompose') {
        const { filePath, serviceNames } = payload
        const workspaceId = this.devhubManager.getActiveWorkspaceId()
        
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('filePath is required')
        }
        
        const parsed = await this.devhubManager.getDockerComposeParser().parseFile(filePath)
        if (!parsed) {
          throw new Error('Failed to parse docker-compose file')
        }
        
        // Filter services if specific ones requested
        const servicesToImport = serviceNames && Array.isArray(serviceNames)
          ? parsed.services.filter(s => serviceNames.includes(s.name))
          : parsed.services
        
        // Import each service
        const importedServices = []
        const path = require('path')
        for (const composeService of servicesToImport) {
          const repoPath = path.dirname(filePath)
          const devhubService = this.devhubManager.getDockerComposeParser().convertToDevHubService(composeService, repoPath)
          devhubService.workspaceId = workspaceId
          importedServices.push(devhubService)
        }
        
        return {
          imported: importedServices.length,
          services: importedServices,
          compose: {
            filePath: parsed.filePath,
            fileName: parsed.fileName,
            version: parsed.version,
            networks: parsed.networks,
            volumes: parsed.volumes,
          },
        }
      }

      if (type === 'docker.validateCompose') {
        const { content } = payload
        if (!content || typeof content !== 'string') {
          throw new Error('content is required')
        }
        const result = this.devhubManager.getDockerComposeParser().validateContent(content)
        return { valid: result.valid, error: result.error }
      }

      if (type === 'docker.saveCompose') {
        const { filePath, content } = payload
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('filePath is required')
        }
        if (!content || typeof content !== 'string') {
          throw new Error('content is required')
        }
        
        // Validate content first
        const validation = this.devhubManager.getDockerComposeParser().validateContent(content)
        if (!validation.valid) {
          throw new Error(`Invalid docker-compose content: ${validation.error}`)
        }
        
        const success = await this.devhubManager.getDockerComposeParser().saveFile(filePath, content)
        if (!success) {
          throw new Error('Failed to save file')
        }
        return { success: true, message: 'File saved successfully' }
      }

      if (type === 'docker.composeUp') {
        const { filePath, options = {} } = payload
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('filePath is required')
        }
        
        const { spawn } = require('child_process')
        const path = require('path')
        const cwd = path.dirname(filePath)
        const fileName = path.basename(filePath)
        
        const args = ['-f', fileName, 'up', '-d']
        if (options.build) args.push('--build')
        if (options.forceRecreate) args.push('--force-recreate')
        if (options.services && Array.isArray(options.services)) {
          args.push(...options.services)
        }
        
        return new Promise((resolve, reject) => {
          const composeProcess = spawn('docker-compose', args, {
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
              resolve({ success: true, output: stdout })
            } else {
              reject(new Error(`docker-compose up failed with code ${code}: ${stderr}`))
            }
          })
          
          composeProcess.on('error', (error: Error) => {
            reject(error)
          })
        })
      }

      if (type === 'docker.composeDown') {
        const { filePath, options = {} } = payload
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('filePath is required')
        }
        
        const { spawn } = require('child_process')
        const path = require('path')
        const cwd = path.dirname(filePath)
        const fileName = path.basename(filePath)
        
        const args = ['-f', fileName, 'down']
        if (options.volumes) args.push('-v')
        if (options.removeImages) args.push('--rmi', options.removeImages)
        if (options.removeOrphans) args.push('--remove-orphans')
        
        return new Promise((resolve, reject) => {
          const composeProcess = spawn('docker-compose', args, {
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
              resolve({ success: true, output: stdout })
            } else {
              reject(new Error(`docker-compose down failed with code ${code}: ${stderr}`))
            }
          })
          
          composeProcess.on('error', (error: Error) => {
            reject(error)
          })
        })
      }

      if (type === 'docker.composePs') {
        const { filePath } = payload
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('filePath is required')
        }
        
        const { spawn } = require('child_process')
        const path = require('path')
        const cwd = path.dirname(filePath)
        const fileName = path.basename(filePath)
        
        return new Promise((resolve, reject) => {
          const composeProcess = spawn('docker-compose', ['-f', fileName, 'ps', '--format', 'json'], {
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
                const containers = stdout ? JSON.parse(stdout) : []
                resolve({ success: true, containers })
              } catch {
                resolve({ success: true, containers: [], output: stdout })
              }
            } else {
              reject(new Error(`docker-compose ps failed with code ${code}: ${stderr}`))
            }
          })
          
          composeProcess.on('error', (error: Error) => {
            reject(error)
          })
        })
      }

      if (type === 'docker.composeLogs') {
        const { filePath, service, tail = '100' } = payload
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('filePath is required')
        }
        
        const { spawn } = require('child_process')
        const path = require('path')
        const cwd = path.dirname(filePath)
        const fileName = path.basename(filePath)
        
        const args = ['-f', fileName, 'logs', '--tail', String(tail)]
        if (service && typeof service === 'string') {
          args.push(service)
        }
        
        return new Promise((resolve, reject) => {
          const composeProcess = spawn('docker-compose', args, {
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
            resolve({
              success: true,
              logs: stdout,
              errors: stderr || undefined,
            })
          })
          
          composeProcess.on('error', (error: Error) => {
            reject(error)
          })
        })
      }

      if (type === 'docker.composeScan') {
        const { path: scanPath, depth = 4 } = payload
        if (!scanPath || typeof scanPath !== 'string') {
          throw new Error('path is required')
        }
        
        const path = require('path')
        const fs = require('fs')
        
        const maxDepth = parseInt(depth, 10) || 4
        const composeFiles: string[] = []
        
        // Patterns to match docker-compose files
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
        const scanDir = (currentDir: string, currentDepth: number): void => {
          if (currentDepth > maxDepth) return
          
          try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true })
            
            for (const entry of entries) {
              const fullPath = path.join(currentDir, entry.name)
              
              if (entry.isFile() && isDockerComposeFile(entry.name)) {
                composeFiles.push(fullPath)
              } else if (entry.isDirectory() && 
                         !entry.name.startsWith('.') && 
                         !skipDirs.includes(entry.name)) {
                scanDir(fullPath, currentDepth + 1)
              }
            }
          } catch (error) {
            // Skip directories we can't read
          }
        }
        
        scanDir(scanPath, 0)
        
        return {
          success: true,
          path: scanPath,
          count: composeFiles.length,
          files: composeFiles,
        }
      }

      // Workspace operations
      if (type === 'workspaces.getAll') {
        return this.devhubManager.getWorkspaceManager().getAllWorkspaces()
      }

      if (type === 'workspaces.getActive') {
        return this.devhubManager.getWorkspaceManager().getActiveWorkspace()
      }

      if (type === 'workspaces.create') {
        const { name, description, folderPath, tags } = payload
        return this.devhubManager.getWorkspaceManager().createWorkspace({
          name,
          description,
          folderPath,
          tags,
          setAsActive: payload.setAsActive
        })
      }

      if (type === 'workspaces.setActive') {
        // Update the active workspace in both the database AND the cached value
        await this.devhubManager.activateWorkspace(payload.id)
        return this.devhubManager.getWorkspaceManager().getWorkspace(payload.id)
      }

      if (type === 'workspaces.delete') {
        return this.devhubManager.getWorkspaceManager().deleteWorkspace(payload.id)
      }

      if (type === 'workspaces.getSnapshots') {
        return this.devhubManager.getWorkspaceManager().getWorkspaceSnapshots(payload.workspaceId)
      }

      if (type === 'workspaces.createSnapshot') {
        const { workspaceId, name, description, repoPaths, tags } = payload
        return await this.devhubManager.getWorkspaceManager().createSnapshot(
          name,
          description,
          repoPaths || [],
          undefined, // activeEnvProfile
          tags,
          undefined, // scannedPath
          workspaceId,
          false // autoImportEnv
        )
      }

      if (type === 'workspaces.createQuickSnapshot') {
        const name = `Snapshot - ${new Date().toLocaleString()}`
        return await this.devhubManager.createQuickSnapshot(name)
      }

      if (type === 'workspaces.getSnapshot') {
        return this.devhubManager.getWorkspaceManager().getSnapshot(payload.snapshotId)
      }

      if (type === 'workspaces.restoreSnapshot') {
        const { snapshotId, syncEnvFiles } = payload
        return await this.devhubManager.getWorkspaceManager().restoreSnapshot(
          snapshotId,
          syncEnvFiles ?? false
        )
      }

      if (type === 'workspaces.deleteSnapshot') {
        return this.devhubManager.getWorkspaceManager().deleteSnapshot(payload.snapshotId)
      }

      if (type === 'workspaces.exportSnapshot') {
        const snapshot = this.devhubManager.getWorkspaceManager().getSnapshot(payload.snapshotId)
        return snapshot
      }

      // Repository batch operations
      if (type === 'repos.analyzeBatch') {
        const { repoPaths } = payload
        const fs = require('fs')
        const path = require('path')
        const results = []

        for (const repoPath of repoPaths) {
          try {
            if (!repoPath || typeof repoPath !== 'string') {
              results.push({ success: false, repoPath, error: 'Invalid repository path' })
              continue
            }

            if (!fs.existsSync(repoPath)) {
              results.push({ success: false, repoPath, error: 'Repository path does not exist' })
              continue
            }

            const analysis: any = {
              name: path.basename(repoPath),
              command: null,
              port: null,
              packageJsonFound: false,
              envFound: false,
              envFiles: []
            }

            // Read package.json
            const packageJsonPath = path.join(repoPath, 'package.json')
            if (fs.existsSync(packageJsonPath)) {
              try {
                const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8')
                const packageJson = JSON.parse(packageJsonContent)
                analysis.packageJsonFound = true

                // Try to find start command
                if (packageJson.scripts) {
                  if (packageJson.scripts.start) {
                    analysis.command = 'npm start'
                  } else if (packageJson.scripts.dev) {
                    analysis.command = 'npm run dev'
                  } else if (packageJson.scripts.serve) {
                    analysis.command = 'npm run serve'
                  } else {
                    const scripts = Object.keys(packageJson.scripts)
                    if (scripts.length > 0) {
                      analysis.command = `npm run ${scripts[0]}`
                    }
                  }
                }
              } catch (error) {
                console.error(`Error parsing package.json for ${repoPath}:`, error)
              }
            }

            // Find all .env files
            try {
              const entries = fs.readdirSync(repoPath, { withFileTypes: true })
              const envFiles: string[] = []

              for (const entry of entries) {
                if (entry.isFile() && entry.name.startsWith('.env')) {
                  envFiles.push(entry.name)
                }
              }

              // Sort to ensure consistent order (.env first, then alphabetically)
              envFiles.sort((a, b) => {
                if (a === '.env') return -1
                if (b === '.env') return 1
                return a.localeCompare(b)
              })

              analysis.envFiles = envFiles
              analysis.envFound = envFiles.length > 0 // Backward compatibility

              // Parse PORT from main .env file if it exists
              if (envFiles.includes('.env')) {
                const envPath = path.join(repoPath, '.env')
                const envContent = fs.readFileSync(envPath, 'utf-8')
                const portMatch = envContent.match(/^PORT\s*=\s*(\d+)/m)
                if (portMatch && portMatch[1]) {
                  analysis.port = parseInt(portMatch[1], 10)
                }
              }
            } catch (error) {
              console.error(`Error finding .env files for ${repoPath}:`, error)
            }

            results.push({ success: true, repoPath, analysis })
          } catch (error) {
            results.push({ success: false, repoPath, error: error instanceof Error ? error.message : 'Unknown error' })
          }
        }

        return results
      }

      // Service batch operations
      if (type === 'services.batchCreate') {
        const { services } = payload
        const created = []

        for (const service of services) {
          try {
            const result = await this.devhubManager.getServiceManager().createService(workspaceId, service)
            created.push(result)
          } catch (error) {
            console.error(`[MessageHandler] Failed to create service ${service.name}:`, error)
          }
        }

        return created
      }

      // Environment operations
      if (type === 'env.getProfiles') {
        const profiles = this.devhubManager.getEnvManager().getAllProfiles(workspaceId)
        return { profiles }
      }

      if (type === 'env.createProfile') {
        const { name, description, metadata } = payload
        return this.devhubManager.getEnvManager().createProfile(
          workspaceId,
          name,
          description,
          metadata
        )
      }

      if (type === 'env.deleteProfile') {
        return this.devhubManager.getEnvManager().deleteProfile(payload.id)
      }

      if (type === 'env.copyProfile') {
        const { id, name, description } = payload
        const sourceProfile = this.devhubManager.getEnvManager().getProfile(id)
        if (!sourceProfile) {
          throw new Error('Source profile not found')
        }

        // Create new profile in same workspace
        const newProfile = this.devhubManager.getEnvManager().createProfile(
          workspaceId,
          name,
          description
        )

        // Copy variables from source to new profile
        const copiedCount = this.devhubManager.getEnvManager().copyProfile(id, newProfile.id)

        return { profile: newProfile, copiedVariables: copiedCount }
      }

      if (type === 'env.getVariables') {
        const { profileId, serviceId } = payload
        const variables = this.devhubManager.getEnvManager().getVariables(profileId, serviceId)
        return { variables }
      }

      if (type === 'env.createVariable') {
        return this.devhubManager.getEnvManager().createVariable(payload)
      }

      if (type === 'env.updateVariable') {
        const { id, ...data } = payload
        return this.devhubManager.getEnvManager().updateVariable(id, data)
      }

      if (type === 'env.deleteVariable') {
        return this.devhubManager.getEnvManager().deleteVariable(payload.id)
      }

      if (type === 'env.importFile') {
        const { profileId, filePath, serviceId } = payload
        return this.devhubManager.getEnvManager().importFromEnvFile(filePath, profileId, serviceId)
      }

      if (type === 'env.exportFile') {
        const { profileId, filePath, serviceId } = payload
        return this.devhubManager.getEnvManager().exportToEnvFile(profileId, filePath, serviceId)
      }

      if (type === 'env.syncToService') {
        // Export profile variables to the service's .env file
        const { profileId, serviceId } = payload
        const allServices = this.devhubManager.getServiceManager().getAllServices(workspaceId)
        const service = allServices.find(s => s.id === serviceId)
        if (!service) {
          throw new Error('Service not found')
        }
        const envFilePath = `${service.repoPath}/.env`
        return this.devhubManager.getEnvManager().exportToEnvFile(profileId, envFilePath, serviceId)
      }

      // Notes operations
      if (type === 'notes.getAll') {
        return this.devhubManager.getNotesManager().getAllNotes(workspaceId)
      }

      if (type === 'notes.create') {
        const { title, content, category, tags, template } = payload
        return this.devhubManager.getNotesManager().createNote(workspaceId, {
          title,
          content,
          category,
          tags,
          template
        })
      }

      if (type === 'notes.update') {
        const { id, title, content, category, tags } = payload
        return this.devhubManager.getNotesManager().updateNote(id, {
          title,
          content,
          category,
          tags
        })
      }

      if (type === 'notes.delete') {
        return this.devhubManager.getNotesManager().deleteNote(payload.id)
      }

      if (type === 'notes.search') {
        return this.devhubManager.getNotesManager().searchNotes(payload.query)
      }

      if (type === 'notes.getCategories') {
        return this.devhubManager.getNotesManager().getCategories()
      }

      if (type === 'notes.getTags') {
        return this.devhubManager.getNotesManager().getTags()
      }

      if (type === 'notes.getTemplates') {
        return this.devhubManager.getNotesManager().getTemplates()
      }

      if (type === 'notes.getLinks') {
        return this.devhubManager.getNotesManager().getLinkedNotes(payload.noteId)
      }

      if (type === 'notes.getBacklinks') {
        return this.devhubManager.getNotesManager().getBacklinks(payload.noteId)
      }

      // Health check operations
      if (type === 'healthChecks.getAll') {
        return this.devhubManager.getHealthCheckManager().getHealthChecks(workspaceId)
      }

      if (type === 'healthChecks.create') {
        const { serviceId, ...config } = payload
        return this.devhubManager.getHealthCheckManager().createHealthCheck(
          serviceId,
          config
        )
      }

      if (type === 'healthChecks.delete') {
        return this.devhubManager.getHealthCheckManager().deleteHealthCheck(payload.id)
      }

      // Log operations
      if (type === 'logs.getSessions') {
        return this.devhubManager.getLogManager().getSessions(payload.serviceId)
      }

      if (type === 'logs.getLogs') {
        return this.devhubManager.getLogManager().getLogs(
          payload.sessionId,
          {
            level: payload.level,
            search: payload.search,
            limit: payload.limit,
            offset: payload.offset
          }
        )
      }

      // Group operations
      if (type === 'groups.getAll') {
        return this.devhubManager.getGroupManager().getGroups(workspaceId)
      }

      if (type === 'groups.create') {
        const { name, description, color, icon } = payload
        return this.devhubManager.getGroupManager().createGroup(
          workspaceId,
          name,
          {
            description,
            color,
            icon
          }
        )
      }

      if (type === 'groups.delete') {
        return this.devhubManager.getGroupManager().deleteGroup(payload.id)
      }

      if (type === 'groups.addService') {
        return this.devhubManager.getGroupManager().addServiceToGroup(
          payload.groupId,
          payload.serviceId
        )
      }

      if (type === 'groups.removeService') {
        return this.devhubManager.getGroupManager().removeServiceFromGroup(
          payload.groupId,
          payload.serviceId
        )
      }

      throw new Error(`Unknown message type: ${type}`)
    } catch (error) {
      console.error(`Error handling message ${type}:`, error)
      throw error
    }
  }
}
