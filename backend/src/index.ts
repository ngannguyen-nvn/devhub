import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import repoRoutes from './routes/repos'
import serviceRoutes from './routes/services'
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 DevHub API running on http://localhost:${PORT}`)
})
