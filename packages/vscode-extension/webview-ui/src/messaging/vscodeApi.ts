/**
 * VSCode API Wrapper
 *
 * Provides a clean interface for communicating with the extension host.
 * Replaces axios calls from the web app with message passing.
 */

// VSCode API type (provided by webview context)
interface VSCodeAPI {
  postMessage(message: any): void
  getState(): any
  setState(state: any): void
}

declare function acquireVsCodeApi(): VSCodeAPI

// Get VSCode API singleton
const vscode = acquireVsCodeApi()

// Export for direct use when needed (e.g., sending ready signal)
export { vscode }

// Message ID counter
let messageIdCounter = 0

// Pending message promises
const pendingMessages = new Map<number, {
  resolve: (value: any) => void
  reject: (error: any) => void
}>()

/**
 * Send message to extension host and wait for response
 */
export async function sendMessage<T = any>(type: string, payload?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++messageIdCounter

    // Store promise handlers
    pendingMessages.set(id, { resolve, reject })

    // Send message to extension
    vscode.postMessage({ id, type, payload })

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id)
        reject(new Error(`Request timeout: ${type}`))
      }
    }, 30000)
  })
}

/**
 * Handle incoming messages from extension
 */
window.addEventListener('message', (event) => {
  const message = event.data

  if (message.id && pendingMessages.has(message.id)) {
    const { resolve, reject } = pendingMessages.get(message.id)!
    pendingMessages.delete(message.id)

    if (message.type === 'error') {
      reject(new Error(message.error))
    } else {
      resolve(message.response)
    }
  }
})

/**
 * API helper functions (similar to axios interface)
 */

// Repository operations
export const repoApi = {
  scan: () => sendMessage('repos.scan'),
  analyzeBatch: (repoPaths: string[]) => sendMessage('repos.analyzeBatch', { repoPaths })
}

// Service operations
export const serviceApi = {
  getAll: () => sendMessage('services.getAll'),
  getRunning: () => sendMessage('services.getRunning'),
  create: (data: any) => sendMessage('services.create', data),
  batchCreate: (services: any[]) => sendMessage('services.batchCreate', { services }),
  update: (id: string, data: any) => sendMessage('services.update', { id, ...data }),
  delete: (id: string) => sendMessage('services.delete', { id }),
  start: (id: string) => sendMessage('services.start', { id }),
  stop: (id: string) => sendMessage('services.stop', { id }),
  getLogs: (id: string) => sendMessage('services.getLogs', { id }),
  openTerminal: (id: string) => sendMessage('services.openTerminal', { id }),
  createEnvProfile: (data: any) => sendMessage('env.createProfile', data),
  importEnvFile: (profileId: string, filePath: string) =>
    sendMessage('env.importFile', { profileId, filePath })
}

// Environment operations
export const envApi = {
  getProfiles: () => sendMessage('env.getProfiles'),
  createProfile: (data: any) => sendMessage('env.createProfile', data),
  deleteProfile: (id: string) => sendMessage('env.deleteProfile', { id }),
  copyProfile: (id: string, name: string) => sendMessage('env.copyProfile', { id, name }),
  getVariables: (profileId: string) => sendMessage('env.getVariables', { profileId }),
  createVariable: (data: any) => sendMessage('env.createVariable', data),
  updateVariable: (id: string, data: any) => sendMessage('env.updateVariable', { id, ...data }),
  deleteVariable: (id: string) => sendMessage('env.deleteVariable', { id }),
  importFile: (profileId: string, filePath: string) => sendMessage('env.importFile', { profileId, filePath }),
  exportFile: (profileId: string, filePath: string) => sendMessage('env.exportFile', { profileId, filePath }),
  syncToService: (profileId: string, serviceId: string) => sendMessage('env.syncToService', { profileId, serviceId })
}

// Docker operations
export const dockerApi = {
  ping: () => sendMessage('docker.ping'),
  listImages: () => sendMessage('docker.listImages'),
  buildImage: (data: any) => sendMessage('docker.buildImage', data),
  removeImage: (id: string) => sendMessage('docker.removeImage', { id }),
  listContainers: () => sendMessage('docker.listContainers'),
  runContainer: (data: any) => sendMessage('docker.runContainer', data),
  startContainer: (id: string) => sendMessage('docker.startContainer', { id }),
  stopContainer: (id: string) => sendMessage('docker.stopContainer', { id }),
  removeContainer: (id: string) => sendMessage('docker.removeContainer', { id }),
  getContainerLogs: (id: string) => sendMessage('docker.getContainerLogs', { id }),
  generateCompose: (data: any) => sendMessage('docker.generateCompose', data)
}

// Workspace operations
export const workspaceApi = {
  getAll: () => sendMessage('workspaces.getAll'),
  getActive: () => sendMessage('workspaces.getActive'),
  create: (data: any) => sendMessage('workspaces.create', data),
  setActive: (id: string) => sendMessage('workspaces.setActive', { id }),
  delete: (id: string) => sendMessage('workspaces.delete', { id }),
  getSnapshots: (workspaceId: string) => sendMessage('workspaces.getSnapshots', { workspaceId }),
  createSnapshot: (data: any) => sendMessage('workspaces.createSnapshot', data),
  createQuickSnapshot: () => sendMessage('workspaces.createQuickSnapshot'),
  getSnapshot: (snapshotId: string) => sendMessage('workspaces.getSnapshot', { snapshotId }),
  restoreSnapshot: (snapshotId: string, options: any) => sendMessage('workspaces.restoreSnapshot', { snapshotId, ...options }),
  deleteSnapshot: (snapshotId: string) => sendMessage('workspaces.deleteSnapshot', { snapshotId }),
  exportSnapshot: (snapshotId: string) => sendMessage('workspaces.exportSnapshot', { snapshotId })
}

// Notes operations
export const notesApi = {
  getAll: () => sendMessage('notes.getAll'),
  create: (data: any) => sendMessage('notes.create', data),
  update: (id: string, data: any) => sendMessage('notes.update', { id, ...data }),
  delete: (id: string) => sendMessage('notes.delete', { id }),
  search: (query: string) => sendMessage('notes.search', { query }),
  getCategories: () => sendMessage('notes.getCategories'),
  getTags: () => sendMessage('notes.getTags'),
  getTemplates: () => sendMessage('notes.getTemplates'),
  getLinks: (noteId: string) => sendMessage('notes.getLinks', { noteId }),
  getBacklinks: (noteId: string) => sendMessage('notes.getBacklinks', { noteId })
}

// Health check operations
export const healthCheckApi = {
  getAll: () => sendMessage('healthChecks.getAll'),
  create: (data: any) => sendMessage('healthChecks.create', data),
  delete: (id: string) => sendMessage('healthChecks.delete', { id })
}

// Log operations
export const logApi = {
  getSessions: (serviceId: string) => sendMessage('logs.getSessions', { serviceId }),
  getLogs: (sessionId: string, options?: any) => sendMessage('logs.getLogs', { sessionId, ...options })
}

// Group operations
export const groupApi = {
  getAll: () => sendMessage('groups.getAll'),
  create: (data: any) => sendMessage('groups.create', data),
  delete: (id: string) => sendMessage('groups.delete', { id }),
  addService: (groupId: string, serviceId: string) =>
    sendMessage('groups.addService', { groupId, serviceId }),
  removeService: (groupId: string, serviceId: string) =>
    sendMessage('groups.removeService', { groupId, serviceId })
}

/**
 * State management (persists across webview reloads)
 */
export const state = {
  get: () => vscode.getState(),
  set: (state: any) => vscode.setState(state)
}
