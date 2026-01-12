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

app.listen(PORT, () => {
  console.log(`🚀 DevHub API running on http://localhost:${PORT}`)
})
