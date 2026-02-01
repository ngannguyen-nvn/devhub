import fs from 'fs/promises'
import path from 'path'
import simpleGit from 'simple-git'

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
  hasDockerCompose: boolean
  dockerComposeFiles: string[] // List of docker-compose files found
  hasEnvFile: boolean // Deprecated: kept for backward compatibility
  envFiles: string[] // List of .env files found (.env, .env.development, etc.)
}

export class RepoScanner {
  /**
   * Scan a directory for git repositories
   */
  async scanDirectory(rootPath: string, maxDepth: number = 3): Promise<Repository[]> {
    const repositories: Repository[] = []

    try {
      await this.findGitRepos(rootPath, repositories, 0, maxDepth)
      return repositories
    } catch (error) {
      console.error('Error scanning directory:', error)
      throw new Error(`Failed to scan directory: ${rootPath}`)
    }
  }

  /**
   * Recursively find git repositories
   */
  private async findGitRepos(
    dirPath: string,
    repositories: Repository[],
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    if (currentDepth > maxDepth) return

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      // Check if this directory is a git repo
      const isGitRepo = entries.some(entry => entry.name === '.git' && entry.isDirectory())

      if (isGitRepo) {
        const repoInfo = await this.getRepoInfo(dirPath)
        if (repoInfo) {
          repositories.push(repoInfo)
        }
        // Don't scan subdirectories of a git repo
        return
      }

      // Scan subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subDirPath = path.join(dirPath, entry.name)
          await this.findGitRepos(subDirPath, repositories, currentDepth + 1, maxDepth)
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Skipping directory ${dirPath}:`, error)
    }
  }

  /**
   * Get detailed information about a git repository
   */
  private async getRepoInfo(repoPath: string): Promise<Repository | null> {
    try {
      const git = simpleGit(repoPath)

      // Get current branch
      const branch = await git.revparse(['--abbrev-ref', 'HEAD'])

      // Check for uncommitted changes
      const status = await git.status()
      const hasChanges = !status.isClean()

      // Get last commit
      let lastCommit = null
      try {
        const log = await git.log({ maxCount: 1 })
        if (log.latest) {
          lastCommit = {
            message: log.latest.message,
            date: log.latest.date,
            author: log.latest.author_name,
          }
        }
      } catch (error) {
        // Repository might not have any commits yet
        console.warn(`No commits found in ${repoPath}`)
      }

      // Check for Dockerfile
      const hasDockerfile = await this.checkFileExists(repoPath, 'Dockerfile')

      // Check for docker-compose files (multiple variants)
      const dockerComposeFiles = await this.findDockerComposeFiles(repoPath)
      const hasDockerCompose = dockerComposeFiles.length > 0

      // Check for .env files (multiple variants)
      const envFiles = await this.findEnvFiles(repoPath)
      const hasEnvFile = envFiles.length > 0 // Backward compatibility

      return {
        name: path.basename(repoPath),
        path: repoPath,
        branch: branch.trim(),
        hasChanges,
        lastCommit,
        hasDockerfile,
        hasDockerCompose,
        dockerComposeFiles,
        hasEnvFile,
        envFiles,
      }
    } catch (error) {
      console.error(`Error getting repo info for ${repoPath}:`, error)
      return null
    }
  }

  /**
   * Check if a file exists in the repository
   */
  private async checkFileExists(repoPath: string, fileName: string): Promise<boolean> {
    try {
      await fs.access(path.join(repoPath, fileName))
      return true
    } catch {
      return false
    }
  }

  /**
   * Find all .env files in the repository
   * Scans for any file starting with .env (e.g., .env, .env.local, .env.development, etc.)
   */
  private async findEnvFiles(repoPath: string): Promise<string[]> {
    const envFiles: string[] = []

    try {
      // Read all files in the repo root
      const entries = await fs.readdir(repoPath, { withFileTypes: true })

      // Check each file
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

      return envFiles
    } catch (error) {
      console.warn(`Error finding .env files in ${repoPath}:`, error)
      return []
    }
  }

  /**
   * Check if a filename is a docker-compose file
   * Matches: docker-compose.yml, docker-compose.yaml, compose.yml, compose.yaml
   * Also matches variants: docker-compose.staging.yml, docker-compose.prod.yml, etc.
   */
  private isDockerComposeFile(fileName: string): boolean {
    // Check for standard patterns
    const standardPatterns = [
      'docker-compose.yml',
      'docker-compose.yaml',
      'compose.yml',
      'compose.yaml',
    ]
    if (standardPatterns.includes(fileName)) return true
    
    // Check for variant patterns: docker-compose.*.yml or docker-compose.*.yaml
    if (fileName.startsWith('docker-compose.') && (fileName.endsWith('.yml') || fileName.endsWith('.yaml'))) {
      return true
    }
    
    // Check for variant patterns: compose.*.yml or compose.*.yaml
    if (fileName.startsWith('compose.') && (fileName.endsWith('.yml') || fileName.endsWith('.yaml'))) {
      return true
    }
    
    return false
  }

  /**
   * Find all docker-compose files in the repository
   * Scans for docker-compose.yml, docker-compose.yaml, and their variants
   * Recursively searches subdirectories up to depth 4
   * Also finds variant files like docker-compose.staging.yml
   */
  private async findDockerComposeFiles(repoPath: string): Promise<string[]> {
    const composeFiles: string[] = []
    const composePatterns = [
      'docker-compose.yml',
      'docker-compose.yaml',
      'compose.yml',
      'compose.yaml',
    ]

    // Directories to skip
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor']

    try {
      // Recursively search for compose files (up to 4 levels deep)
      await this.findComposeFilesRecursive(repoPath, repoPath, skipDirs, composeFiles, 0, 4)

      // Sort to ensure consistent order (docker-compose first, then compose, then by path depth)
      composeFiles.sort((a, b) => {
        // Extract just the filename for comparison
        const fileNameA = path.basename(a)
        const fileNameB = path.basename(b)
        
        const aIsDockerCompose = fileNameA.startsWith('docker-compose')
        const bIsDockerCompose = fileNameB.startsWith('docker-compose')
        if (aIsDockerCompose && !bIsDockerCompose) return -1
        if (!aIsDockerCompose && bIsDockerCompose) return 1
        
        // Sort by path depth (root level first)
        const depthA = a.split('/').length
        const depthB = b.split('/').length
        if (depthA !== depthB) return depthA - depthB
        
        return a.localeCompare(b)
      })

      return composeFiles
    } catch (error) {
      console.warn(`Error finding docker-compose files in ${repoPath}:`, error)
      return []
    }
  }

  /**
   * Recursively search for docker-compose files in subdirectories
   * @param repoPath - The root repository path (for calculating relative paths)
   * @param currentDir - The current directory being searched
   */
  private async findComposeFilesRecursive(
    repoPath: string,
    currentDir: string,
    skipDirs: string[],
    composeFiles: string[],
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    if (currentDepth > maxDepth) return

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        if (entry.isFile() && this.isDockerComposeFile(entry.name)) {
          // Calculate relative path from repo root
          const relativePath = fullPath.substring(repoPath.length).replace(/^[//\\]/, '')
          composeFiles.push(relativePath || entry.name)
        } else if (entry.isDirectory() && !skipDirs.includes(entry.name)) {
          // Recurse into subdirectories (but not skipped ones)
          await this.findComposeFilesRecursive(repoPath, fullPath, skipDirs, composeFiles, currentDepth + 1, maxDepth)
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Skipping directory ${currentDir}:`, error)
    }
  }
}
