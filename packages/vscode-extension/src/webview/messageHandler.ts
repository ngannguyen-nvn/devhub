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
      const workspaceId = this.devhubManager.getActiveWorkspaceId()

      // Repository operations
      if (type === 'repos.scan') {
        return await this.devhubManager.scanWorkspace()
      }

      // Service operations
      if (type === 'services.getAll') {
        return this.devhubManager.getServiceManager().getAllServices(workspaceId)
      }

      if (type === 'services.getRunning') {
        return this.devhubManager.getServiceManager().getRunningServicesForWorkspace(workspaceId)
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

      // Docker operations (simplified - just return empty for now)
      if (type === 'docker.listImages') {
        return this.devhubManager.getDockerManager().listImages()
      }

      if (type === 'docker.listContainers') {
        return this.devhubManager.getDockerManager().listContainers()
      }

      // Workspace operations
      if (type === 'workspaces.getAll') {
        return this.devhubManager.getWorkspaceManager().getAllWorkspaces()
      }

      if (type === 'workspaces.getActive') {
        return this.devhubManager.getWorkspaceManager().getActiveWorkspace()
      }

      if (type === 'workspaces.create') {
        const { name, description, folderPath } = payload
        return this.devhubManager.getWorkspaceManager().createWorkspace(
          name,
          description,
          folderPath
        )
      }

      if (type === 'workspaces.setActive') {
        return this.devhubManager.getWorkspaceManager().setActiveWorkspace(payload.id)
      }

      if (type === 'workspaces.delete') {
        return this.devhubManager.getWorkspaceManager().deleteWorkspace(payload.id)
      }

      if (type === 'workspaces.getSnapshots') {
        return this.devhubManager.getWorkspaceManager().getSnapshots(payload.workspaceId)
      }

      if (type === 'workspaces.createSnapshot') {
        const { workspaceId, name, description, config } = payload
        return this.devhubManager.getWorkspaceManager().createSnapshot(
          workspaceId,
          name,
          description,
          config
        )
      }

      // Notes operations
      if (type === 'notes.getAll') {
        return this.devhubManager.getNotesManager().getAllNotes(workspaceId)
      }

      if (type === 'notes.create') {
        const { title, content } = payload
        return this.devhubManager.getNotesManager().createNote(workspaceId, title, content)
      }

      if (type === 'notes.update') {
        const { id, title, content } = payload
        return this.devhubManager.getNotesManager().updateNote(id, title, content)
      }

      if (type === 'notes.delete') {
        return this.devhubManager.getNotesManager().deleteNote(payload.id)
      }

      if (type === 'notes.search') {
        return this.devhubManager.getNotesManager().searchNotes(workspaceId, payload.query)
      }

      // Health check operations
      if (type === 'healthChecks.getAll') {
        return this.devhubManager.getHealthCheckManager().getHealthChecks(workspaceId)
      }

      if (type === 'healthChecks.create') {
        const { serviceId, type: checkType, config } = payload
        return this.devhubManager.getHealthCheckManager().createHealthCheck(
          serviceId,
          checkType,
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
          payload.limit,
          payload.offset
        )
      }

      // Group operations
      if (type === 'groups.getAll') {
        return this.devhubManager.getGroupManager().getGroups(workspaceId)
      }

      if (type === 'groups.create') {
        const { name, description, color } = payload
        return this.devhubManager.getGroupManager().createGroup(
          workspaceId,
          name,
          description,
          color
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

      // Environment variables (stubbed for now)
      if (type.startsWith('env.')) {
        console.log('Environment operations not yet implemented:', type)
        return { success: false, message: 'Not yet implemented' }
      }

      throw new Error(`Unknown message type: ${type}`)
    } catch (error) {
      console.error(`Error handling message ${type}:`, error)
      throw error
    }
  }
}
