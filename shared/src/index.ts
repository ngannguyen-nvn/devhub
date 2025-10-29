export interface Repository {
  name: string
  path: string
  branch: string
  hasChanges: boolean
  lastCommit: {
    message: string
    date: string
    author: string
  } | null
  hasDockerfile: boolean
  hasEnvFile: boolean
}

export interface ScanResponse {
  success: boolean
  count: number
  repositories: Repository[]
  scannedPath: string
}

export interface Service {
  id: string
  workspaceId: string // Foreign key to workspace
  name: string
  repoPath: string
  port?: number
  command: string
  status: 'running' | 'stopped' | 'error'
  pid?: number
  // v2.0 additions
  healthStatus?: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  lastHealthCheck?: string
  healthCheckFailures?: number
  autoRestart?: boolean
  maxRestarts?: number
  restartCount?: number
  backoffStrategy?: 'immediate' | 'exponential' | 'fixed'
}

// Workspace entity (parent)
export interface Workspace {
  id: string
  name: string
  description?: string
  folderPath?: string // Base folder path (can be null for manual workspaces)
  active: boolean // Is this the currently active workspace
  activeSnapshotId?: string // Currently applied snapshot (if any)
  tags?: string[]
  createdAt: string
  updatedAt: string

  // Computed fields (not stored in DB, populated by backend)
  snapshotCount?: number
  latestSnapshot?: {
    id: string
    name: string
    createdAt: string
  }
}

// Workspace snapshot (child)
export interface WorkspaceSnapshot {
  id: string
  name: string
  description?: string
  workspaceId: string // Foreign key to workspace
  createdAt: string
  updatedAt: string

  // Services state
  runningServices: Array<{
    serviceId: string
    serviceName: string
  }>

  // Repository state
  repositories: Array<{
    path: string
    branch: string
    hasChanges: boolean
  }>

  // Docker state
  dockerContainers?: Array<{
    id: string
    name: string
    image: string
    state: string
    ports: Array<{
      privatePort: number
      publicPort?: number
    }>
  }>

  // Environment state
  activeEnvProfile?: string
  // Note: Environment variables now stored as profiles in DB (not in snapshot JSON)
  // Profiles linked to snapshot via source_id field

  // Service logs
  serviceLogs?: Record<string, string[]> // serviceId -> logs array

  // Wiki notes
  wikiNotes?: Array<{
    id: string
    title: string
    content: string
    tags?: string[]
  }>

  // Metadata
  tags?: string[]
  autoRestore?: boolean
  scannedPath?: string // The folder path that was scanned (deprecated, use workspace.folderPath)
}

// Docker types
export interface DockerImage {
  id: string
  repoTags: string[]
  size: number
  created: number
  containers: number
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: Array<{
    privatePort: number
    publicPort?: number
    type: string
  }>
  created: number
}

export interface DockerBuildProgress {
  stream?: string
  status?: string
  progress?: string
  error?: string
}

export interface DockerComposeService {
  serviceName: string
  image?: string
  build?: {
    context: string
    dockerfile: string
  }
  ports?: string[]
  environment?: Record<string, string>
  volumes?: string[]
  depends_on?: string[]
}

// Environment types
export interface EnvProfile {
  id: string
  workspaceId: string // Foreign key to workspace
  name: string
  description?: string
  sourceType?: 'auto-import' | 'snapshot-restore' | 'snapshot' | 'manual'
  sourceId?: string // Reference to source (snapshot_id or scan identifier)
  sourceName?: string // Human-readable source name for grouping (e.g., "Scan - 29/10/2025, 20:07:50" or "Quick Snapshot")
  createdAt: string
  updatedAt: string
}

export interface EnvVariable {
  id: string
  key: string
  value: string
  profileId: string
  serviceId?: string // Optional: for service-specific variables
  isSecret: boolean
  description?: string
  createdAt: string
  updatedAt: string
}

export interface EnvFileContent {
  variables: Record<string, string>
  comments: string[]
}

// Notes/Wiki types
export interface Note {
  id: string
  workspaceId: string // Foreign key to workspace
  title: string
  content: string
  category?: string
  tags?: string[]
  template?: string
  createdAt: string
  updatedAt: string
}

export interface NoteTemplate {
  id: string
  name: string
  description: string
  content: string
  category?: string
}

export interface NoteLink {
  fromNoteId: string
  toNoteId: string
  toNoteTitle: string
}

// v2.0 Orchestration Features

// Service Dependencies
export interface ServiceDependency {
  id: string
  serviceId: string
  dependsOnServiceId: string
  waitForHealth: boolean
  startupDelay: number
  createdAt: string
}

// Health Checks
export interface HealthCheck {
  id: string
  serviceId: string
  type: 'http' | 'tcp' | 'command'
  // HTTP check
  endpoint?: string
  expectedStatus?: number
  expectedBody?: string
  // TCP check
  port?: number
  // Command check
  command?: string
  // Common
  interval: number
  timeout: number
  retries: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// Log Persistence
export interface ServiceLogSession {
  id: string
  serviceId: string
  startedAt: string
  stoppedAt?: string
  exitCode?: number
  exitReason?: string
  logsCount: number
  createdAt: string
}

export interface ServiceLog {
  id: number
  sessionId: string
  serviceId: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}

// Service Templates
export interface ServiceTemplate {
  id: string
  name: string
  description?: string
  icon?: string
  language: 'nodejs' | 'python' | 'go' | 'ruby' | 'java' | 'rust' | 'php' | 'dotnet'
  framework?: string
  defaultCommand: string
  defaultPort?: number
  defaultEnvVars?: Record<string, string>
  healthCheckConfig?: Partial<HealthCheck>
  detectFiles: string[]
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
}

// Service Events (for timeline)
export interface ServiceEvent {
  id: number
  serviceId: string
  eventType: 'started' | 'stopped' | 'crashed' | 'restarted' | 'health_change'
  timestamp: string
  metadata?: Record<string, any>
}

// Service Groups
export interface ServiceGroup {
  id: string
  workspaceId: string
  name: string
  description?: string
  color: string
  icon: string
  createdAt: string
  updatedAt: string
  // Computed
  serviceIds?: string[]
}

export interface ServiceGroupMember {
  id: string
  groupId: string
  serviceId: string
  position: number
}
