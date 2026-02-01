import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import path from 'path'
import repoRoutes from './routes/repos'
import serviceRoutes from './routes/services'
import dockerRoutes from './routes/docker'
import envRoutes from './routes/env'
import workspaceRoutes from './routes/workspaces'
import notesRoutes from './routes/notes'
import groupRoutes from './routes/groups'
import databaseRoutes from './routes/database'
import { serviceManager, healthCheckManager } from '@devhub/core'
import '@devhub/core'

dotenv.config()

// Security: Ensure ENCRYPTION_KEY is set
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in environment variables')
  console.warn('⚠️  Using default key (not secure for production)')
  console.warn('⚠️  Add ENCRYPTION_KEY to your .env file:')
  console.warn('⚠️  Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
} else if (ENCRYPTION_KEY.length < 32) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY is too short (should be at least 32 characters)')
}

const app = express()
const PORT = process.env.PORT || 5000

// Security: Path traversal protection
export function validatePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return !normalized.includes('../') && !normalized.includes('..\\')
}

// Security: Validate port numbers
export function isValidPort(port: any): boolean {
  const num = parseInt(port, 10)
  return !isNaN(num) && num > 0 && num <= 65535
}

// Security: Sanitize string input
export function sanitizeString(input: any, maxLength = 1000): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, maxLength).trim()
}

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' })) // Add size limit
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Routes
app.use('/api/repos', repoRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/docker', dockerRoutes)
app.use('/api/env', envRoutes)
app.use('/api/workspaces', workspaceRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/database', databaseRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const server = app.listen(PORT, () => {
  console.log(`🚀 DevHub API running on http://localhost:${PORT}`)
})

/**
 * Graceful shutdown handler
 * Ensures all child processes are stopped before exiting
 */
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`)

  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timeout reached (10s). Forcing exit...')
    process.exit(1)
  }, 10000)

  // Stop accepting new connections
  server.close(() => {
    console.log('✓ HTTP server closed')
  })

  // Stop all running services
  try {
    serviceManager.stopAll()
    console.log('✓ All services stopped')
  } catch (error) {
    console.error('Error stopping services:', error)
  }

  // Cleanup health check intervals
  try {
    healthCheckManager.cleanup()
    console.log('✓ Health checks cleaned up')
  } catch (error) {
    console.error('Error cleaning up health checks:', error)
  }

  // Dispose service manager (cleanup intervals)
  try {
    serviceManager.dispose()
    console.log('✓ Service manager disposed')
  } catch (error) {
    console.error('Error disposing service manager:', error)
  }

  clearTimeout(forceExitTimeout)
  console.log('Graceful shutdown complete. Exiting...')
  process.exit(0)
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  gracefulShutdown('uncaughtException')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})
