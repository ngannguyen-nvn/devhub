import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import repoRoutes from './routes/repos'
import serviceRoutes from './routes/services'
import dockerRoutes from './routes/docker'
import envRoutes from './routes/env'
import workspaceRoutes from './routes/workspaces'
import notesRoutes from './routes/notes'
import healthCheckRoutes from './routes/healthChecks'
import logRoutes from './routes/logs'
import groupRoutes from './routes/groups'
import databaseRoutes from './routes/database'
import './db' // Initialize database

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/repos', repoRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/docker', dockerRoutes)
app.use('/api/env', envRoutes)
app.use('/api/workspaces', workspaceRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/health-checks', healthCheckRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/database', databaseRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 DevHub API running on http://localhost:${PORT}`)
})
