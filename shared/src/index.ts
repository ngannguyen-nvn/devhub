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
}

export interface ScanResponse {
  success: boolean
  count: number
  repositories: Repository[]
  scannedPath: string
}

export interface Service {
  id: string
  name: string
  repoPath: string
  port?: number
  command: string
  status: 'running' | 'stopped' | 'error'
  pid?: number
}

export interface WorkspaceSnapshot {
  id: string
  name: string
  createdAt: string
  runningServices: string[]
  branches: Record<string, string>
  envProfile?: string
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
