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
