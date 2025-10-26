import { Router } from 'express'
import { RepoScanner } from '../services/repoScanner'

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

export default router
