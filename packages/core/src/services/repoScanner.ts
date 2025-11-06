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
   * Checks for common patterns: .env, .env.local, .env.development, .env.production, etc.
   */
  private async findEnvFiles(repoPath: string): Promise<string[]> {
    const envFiles: string[] = []
    const commonEnvFiles = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.dev',
      '.env.staging',
      '.env.production',
      '.env.prod',
      '.env.test',
      '.env.example',
    ]

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
}
