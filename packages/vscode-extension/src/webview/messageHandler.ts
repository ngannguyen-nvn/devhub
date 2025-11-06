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
  constructor(private devhubManager: DevHubManager) {}

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
        const container = await this.devhubManager.getDockerManager().runContainer(imageName, containerName, ports, env)
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
        return this.devhubManager.getWorkspaceManager().setActiveWorkspace(payload.id)
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
          { syncEnvFiles }
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
        const { profileId, serviceId } = payload
        return this.devhubManager.getEnvManager().syncProfileToService(profileId, serviceId)
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
        return this.devhubManager.getNotesManager().getCategories(workspaceId)
      }

      if (type === 'notes.getTags') {
        return this.devhubManager.getNotesManager().getTags(workspaceId)
      }

      if (type === 'notes.getTemplates') {
        return this.devhubManager.getNotesManager().getTemplates()
      }

      if (type === 'notes.getLinks') {
        return this.devhubManager.getNotesManager().getNoteLinks(payload.noteId)
      }

      if (type === 'notes.getBacklinks') {
        return this.devhubManager.getNotesManager().getNoteBacklinks(payload.noteId)
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
