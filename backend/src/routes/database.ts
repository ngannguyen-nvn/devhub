import express, { Request, Response } from 'express'
import db from '../db'
import fs from 'fs'
import path from 'path'
import multer from 'multer'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.db')) {
      cb(null, true)
    } else {
      cb(new Error('Only .db files are allowed'))
    }
  },
})

/**
 * GET /api/database/stats
 * Get database statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const dbPath = path.join(__dirname, '../../devhub.db')
    const stats = fs.statSync(dbPath)
    const sizeInBytes = stats.size
    const sizeFormatted = formatBytes(sizeInBytes)

    // Get counts
    const services = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number }
    const workspaces = db.prepare('SELECT COUNT(*) as count FROM workspaces').get() as { count: number }
    const envProfiles = db.prepare('SELECT COUNT(*) as count FROM env_profiles').get() as { count: number }
    const notes = db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number }
    const groups = db.prepare('SELECT COUNT(*) as count FROM service_groups').get() as { count: number }
    const logs = db.prepare('SELECT COUNT(*) as count FROM service_logs').get() as { count: number }

    res.json({
      success: true,
      stats: {
        size: sizeInBytes,
        sizeFormatted,
        services: services.count,
        workspaces: workspaces.count,
        envProfiles: envProfiles.count,
        notes: notes.count,
        groups: groups.count,
        logs: logs.count,
        lastBackup: null, // TODO: Track last backup time
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/database/backup
 * Download database backup
 */
router.get('/backup', (req: Request, res: Response) => {
  try {
    const dbPath = path.join(__dirname, '../../devhub.db')

    // Check if file exists
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, error: 'Database file not found' })
    }

    // Set headers for download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename=devhub-backup-${timestamp}.db`)

    // Stream the file
    const fileStream = fs.createReadStream(dbPath)
    fileStream.pipe(res)
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/database/restore
 * Restore database from backup
 */
router.post('/restore', upload.single('database'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const uploadedFilePath = req.file.path
    const dbPath = path.join(__dirname, '../../devhub.db')

    // Validate it's a SQLite database
    try {
      const testDb = require('better-sqlite3')(uploadedFilePath, { readonly: true })
      testDb.close()
    } catch (error) {
      fs.unlinkSync(uploadedFilePath) // Clean up invalid file
      return res.status(400).json({ success: false, error: 'Invalid SQLite database file' })
    }

    // Create backup of current database before replacing
    const backupPath = path.join(__dirname, '../../devhub-pre-restore-backup.db')
    fs.copyFileSync(dbPath, backupPath)

    // Close current database connection
    db.close()

    // Replace database file
    fs.copyFileSync(uploadedFilePath, dbPath)

    // Clean up uploaded file
    fs.unlinkSync(uploadedFilePath)

    res.json({
      success: true,
      message: 'Database restored successfully. Please refresh the page.',
      backup: backupPath,
    })

    // Exit process to force restart (tsx watch will restart automatically)
    setTimeout(() => {
      process.exit(0)
    }, 1000)
  } catch (error: any) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/database/clear-logs
 * Clear old service logs
 */
router.post('/clear-logs', (req: Request, res: Response) => {
  try {
    const daysAgo = 7
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

    const result = db.prepare(`
      DELETE FROM service_logs
      WHERE timestamp < ?
    `).run(cutoffDate.toISOString())

    res.json({
      success: true,
      deleted: result.changes,
      message: `Deleted ${result.changes} log entries older than ${daysAgo} days`,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/database/vacuum
 * Optimize database and reclaim space
 */
router.post('/vacuum', (req: Request, res: Response) => {
  try {
    const dbPath = path.join(__dirname, '../../devhub.db')
    const statsBefore = fs.statSync(dbPath)
    const sizeBefore = statsBefore.size

    // Run VACUUM
    db.prepare('VACUUM').run()

    const statsAfter = fs.statSync(dbPath)
    const sizeAfter = statsAfter.size
    const savedBytes = sizeBefore - sizeAfter
    const savedFormatted = formatBytes(savedBytes)

    res.json({
      success: true,
      sizeBefore: formatBytes(sizeBefore),
      sizeAfter: formatBytes(sizeAfter),
      savedSpace: savedFormatted,
      message: 'Database optimized successfully',
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export default router
