import { Router } from 'express'
import { RepoScanner } from '@devhub/core'
import * as fs from 'fs'
import * as path from 'path'

const router = Router()
const scanner = new RepoScanner()

/**
 * GET /api/repos/scan
 * Scan a directory for git repositories
 */
router.get('/scan', async (req, res) => {
  try {
    const { path = '/home/user', depth = '3' } = req.query

    if (typeof path !== 'string') {
      return res.status(400).json({ error: 'Path must be a string' })
    }

    const maxDepth = parseInt(depth as string, 10)
    if (isNaN(maxDepth) || maxDepth < 0 || maxDepth > 5) {
      return res.status(400).json({ error: 'Depth must be a number between 0 and 5' })
    }

    console.log(`Scanning ${path} for repositories (max depth: ${maxDepth})...`)

    const repositories = await scanner.scanDirectory(path, maxDepth)

    res.json({
      success: true,
      count: repositories.length,
      repositories,
      scannedPath: path,
    })
  } catch (error) {
    console.error('Error scanning repositories:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/repos/analyze
 * Analyze a repository to extract package.json scripts and .env PORT
 */
router.post('/analyze', async (req, res) => {
  try {
    const { repoPath } = req.body

    if (!repoPath || typeof repoPath !== 'string') {
      return res.status(400).json({ error: 'Repository path is required' })
    }

    // Check if directory exists
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository path does not exist' })
    }

    const result: {
      name: string
      command: string | null
      port: number | null
      packageJsonFound: boolean
      envFound: boolean
    } = {
      name: path.basename(repoPath),
      command: null,
      port: null,
      packageJsonFound: false,
      envFound: false,
    }

    // Read package.json
    const packageJsonPath = path.join(repoPath, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageJsonContent)
        result.packageJsonFound = true

        // Try to find start command: npm start, npm run dev, npm run start
        if (packageJson.scripts) {
          if (packageJson.scripts.start) {
            result.command = 'npm start'
          } else if (packageJson.scripts.dev) {
            result.command = 'npm run dev'
          } else if (packageJson.scripts.serve) {
            result.command = 'npm run serve'
          } else {
            // Get first available script
            const scripts = Object.keys(packageJson.scripts)
            if (scripts.length > 0) {
              result.command = `npm run ${scripts[0]}`
            }
          }
        }
      } catch (error) {
        console.error('Error parsing package.json:', error)
      }
    }

    // Read .env file
    const envPath = path.join(repoPath, '.env')
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8')
        result.envFound = true

        // Parse PORT from .env (simple regex, doesn't handle complex cases)
        const portMatch = envContent.match(/^PORT\s*=\s*(\d+)/m)
        if (portMatch && portMatch[1]) {
          result.port = parseInt(portMatch[1], 10)
        }
      } catch (error) {
        console.error('Error reading .env file:', error)
      }
    }

    res.json({
      success: true,
      analysis: result,
    })
  } catch (error) {
    console.error('Error analyzing repository:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/repos/analyze-batch
 * Analyze multiple repositories in a single request
 */
router.post('/analyze-batch', async (req, res) => {
  try {
    const { repoPaths } = req.body

    if (!Array.isArray(repoPaths)) {
      return res.status(400).json({ error: 'repoPaths must be an array' })
    }

    if (repoPaths.length === 0) {
      return res.status(400).json({ error: 'repoPaths array cannot be empty' })
    }

    // Analyze all repos
    const results = await Promise.all(
      repoPaths.map(async (repoPath) => {
        try {
          // Validate input
          if (!repoPath || typeof repoPath !== 'string') {
            return {
              repoPath,
              success: false,
              error: 'Invalid repository path',
            }
          }

          // Check if directory exists
          if (!fs.existsSync(repoPath)) {
            return {
              repoPath,
              success: false,
              error: 'Repository path does not exist',
            }
          }

          const analysis: {
            name: string
            command: string | null
            port: number | null
            packageJsonFound: boolean
            envFound: boolean
          } = {
            name: path.basename(repoPath),
            command: null,
            port: null,
            packageJsonFound: false,
            envFound: false,
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
                  // Get first available script
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

          // Read .env file
          const envPath = path.join(repoPath, '.env')
          if (fs.existsSync(envPath)) {
            try {
              const envContent = fs.readFileSync(envPath, 'utf-8')
              analysis.envFound = true

              // Parse PORT from .env
              const portMatch = envContent.match(/^PORT\s*=\s*(\d+)/m)
              if (portMatch && portMatch[1]) {
                analysis.port = parseInt(portMatch[1], 10)
              }
            } catch (error) {
              console.error(`Error reading .env file for ${repoPath}:`, error)
            }
          }

          return {
            repoPath,
            success: true,
            analysis,
          }
        } catch (error) {
          return {
            repoPath,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })
    )

    // Split into successful and failed
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    res.json({
      success: true,
      results,
      summary: {
        total: repoPaths.length,
        successful: successful.length,
        failed: failed.length,
      },
    })
  } catch (error) {
    console.error('Error in batch analyze:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
