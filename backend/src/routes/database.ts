import express, { Request, Response } from 'express'
import db from '@devhub/core'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { Client as PgClient } from 'pg'
import mysql from 'mysql2/promise'
import { MongoClient } from 'mongodb'
import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow .db files for DevHub database and .sql/.dump for service databases
    if (file.originalname.endsWith('.db') ||
        file.originalname.endsWith('.sql') ||
        file.originalname.endsWith('.dump') ||
        file.originalname.endsWith('.gz')) {
      cb(null, true)
    } else {
      cb(new Error('Only .db, .sql, .dump, or .gz files are allowed'))
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

/**
 * POST /api/database/service/test
 * Test service database connection
 */
router.post('/service/test', async (req: Request, res: Response) => {
  try {
    const { varId } = req.body

    if (!varId) {
      return res.status(400).json({ success: false, error: 'Variable ID required' })
    }

    // Get environment variable
    const envVar = db.prepare(`
      SELECT id, key, value, is_secret
      FROM env_variables
      WHERE id = ?
    `).get(varId) as any

    if (!envVar) {
      return res.status(404).json({ success: false, error: 'Environment variable not found' })
    }

    // Decrypt value if it's a secret
    let connectionString = envVar.value
    if (envVar.is_secret) {
      connectionString = decrypt(connectionString)
    }

    // Test connection based on database type
    const dbInfo = await testDatabaseConnection(connectionString)

    res.json({
      success: true,
      info: dbInfo,
    })
  } catch (error: any) {
    console.error('Error testing service database:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/database/service/backup
 * Backup service database
 */
router.post('/service/backup', async (req: Request, res: Response) => {
  try {
    const { varId } = req.body

    if (!varId) {
      return res.status(400).json({ success: false, error: 'Variable ID required' })
    }

    // Get environment variable
    const envVar = db.prepare(`
      SELECT id, key, value, is_secret
      FROM env_variables
      WHERE id = ?
    `).get(varId) as any

    if (!envVar) {
      return res.status(404).json({ success: false, error: 'Environment variable not found' })
    }

    // Decrypt value if it's a secret
    let connectionString = envVar.value
    if (envVar.is_secret) {
      connectionString = decrypt(connectionString)
    }

    // Perform backup
    const backupResult = await backupDatabase(connectionString)

    if (!backupResult.success) {
      return res.status(500).json({ success: false, error: backupResult.error })
    }

    // Send file for download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `${backupResult.dbName}-backup-${timestamp}.${backupResult.extension}`

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)

    const fileStream = fs.createReadStream(backupResult.filePath)
    fileStream.pipe(res)

    // Clean up temp file after sending
    fileStream.on('end', () => {
      try {
        fs.unlinkSync(backupResult.filePath)
      } catch (err) {
        console.error('Error cleaning up backup file:', err)
      }
    })
  } catch (error: any) {
    console.error('Error backing up service database:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/database/service/restore
 * Restore service database from backup file
 */
router.post('/service/restore', upload.single('backup'), async (req: Request, res: Response) => {
  try {
    const { varId } = req.body

    if (!varId) {
      return res.status(400).json({ success: false, error: 'Variable ID required' })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No backup file uploaded' })
    }

    // Get environment variable
    const envVar = db.prepare(`
      SELECT id, key, value, is_secret
      FROM env_variables
      WHERE id = ?
    `).get(varId) as any

    if (!envVar) {
      return res.status(404).json({ success: false, error: 'Environment variable not found' })
    }

    // Decrypt value if it's a secret
    let connectionString = envVar.value
    if (envVar.is_secret) {
      connectionString = decrypt(connectionString)
    }

    // Perform restore
    const restoreResult = await restoreDatabase(connectionString, req.file.path)

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path)
    } catch (err) {
      console.error('Error cleaning up uploaded file:', err)
    }

    if (!restoreResult.success) {
      return res.status(500).json({ success: false, error: restoreResult.error })
    }

    res.json({
      success: true,
      message: 'Database restored successfully',
    })
  } catch (error: any) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    console.error('Error restoring service database:', error)
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

// Helper function to decrypt values (same as envManager)
function decrypt(encryptedValue: string): string {
  try {
    const parts = encryptedValue.split(':')
    if (parts.length !== 3) {
      return encryptedValue // Not encrypted
    }

    const [ivHex, authTagHex, encryptedHex] = parts
    const key = getEncryptionKey()

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex')
    )
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return encryptedValue
  }
}

function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY || 'devhub-default-key-change-in-production-32bytes'
  return crypto.scryptSync(keyString, 'salt', 32)
}

// Helper function to test database connections
async function testDatabaseConnection(connectionString: string): Promise<any> {
  // Detect database type from connection string
  let type: string
  let client: any

  if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
    type = 'PostgreSQL'
    const pgClient = new PgClient({ connectionString })

    try {
      await pgClient.connect()

      // Get database info
      const dbName = pgClient.database
      const hostResult = await pgClient.query('SELECT inet_server_addr() as host, inet_server_port() as port')
      const host = hostResult.rows[0]?.host || 'localhost'

      // Get tables
      const tablesResult = await pgClient.query(`
        SELECT tablename FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `)
      const tables = tablesResult.rows.map((row: any) => row.tablename)

      await pgClient.end()

      return {
        connected: true,
        type,
        host,
        database: dbName,
        tableCount: tables.length,
        tables: tables.slice(0, 50), // Limit to 50 tables
      }
    } catch (error: any) {
      try { await pgClient.end() } catch {}
      return {
        connected: false,
        error: error.message,
      }
    }

  } else if (connectionString.startsWith('mysql://')) {
    type = 'MySQL'

    try {
      const connection = await mysql.createConnection(connectionString)

      // Get database info
      const [rows]: any = await connection.query('SELECT DATABASE() as db')
      const dbName = rows[0]?.db || 'unknown'

      // Get host
      const [hostRows]: any = await connection.query('SELECT @@hostname as host, @@port as port')
      const host = hostRows[0]?.host || 'localhost'

      // Get tables
      const [tablesRows]: any = await connection.query('SHOW TABLES')
      const tableKey = Object.keys(tablesRows[0] || {})[0]
      const tables = tablesRows.map((row: any) => row[tableKey])

      await connection.end()

      return {
        connected: true,
        type,
        host,
        database: dbName,
        tableCount: tables.length,
        tables: tables.slice(0, 50),
      }
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      }
    }

  } else if (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://')) {
    type = 'MongoDB'

    try {
      const client = new MongoClient(connectionString)
      await client.connect()

      // Get database name from connection string
      const url = new URL(connectionString)
      const dbName = url.pathname.substring(1).split('?')[0] || 'admin'

      const db = client.db(dbName)
      const collections = await db.listCollections().toArray()
      const collectionNames = collections.map(c => c.name)

      await client.close()

      return {
        connected: true,
        type,
        host: url.hostname,
        database: dbName,
        tableCount: collectionNames.length,
        tables: collectionNames.slice(0, 50),
      }
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      }
    }

  } else {
    return {
      connected: false,
      error: 'Unsupported database type. Supported: PostgreSQL, MySQL, MongoDB',
    }
  }
}

// Helper function to check if a command exists
async function commandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`)
    return true
  } catch {
    return false
  }
}

// Helper function to backup database
async function backupDatabase(connectionString: string): Promise<any> {
  const timestamp = Date.now()

  if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
    // PostgreSQL backup using pg_dump
    const url = new URL(connectionString)
    const dbName = url.pathname.substring(1)
    const filePath = `/tmp/pg_backup_${timestamp}.sql`

    // Try native pg_dump first, fallback to Docker
    const hasPgDump = await commandExists('pg_dump')

    try {
      if (hasPgDump) {
        await execAsync(`pg_dump "${connectionString}" > "${filePath}"`)
      } else {
        // Fallback to Docker
        await execAsync(`docker run --rm --network host postgres:alpine pg_dump "${connectionString}" > "${filePath}"`)
      }
      return {
        success: true,
        filePath,
        dbName,
        extension: 'sql',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'PostgreSQL backup failed. Ensure PostgreSQL client or Docker is installed.',
      }
    }

  } else if (connectionString.startsWith('mysql://')) {
    // MySQL backup using mysqldump
    const url = new URL(connectionString)
    const dbName = url.pathname.substring(1)
    const host = url.hostname
    const port = url.port || '3306'
    const user = url.username
    const password = url.password
    const filePath = `/tmp/mysql_backup_${timestamp}.sql`

    // Try native mysqldump first, fallback to Docker
    const hasMysqlDump = await commandExists('mysqldump')

    try {
      if (hasMysqlDump) {
        await execAsync(`mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${dbName} > "${filePath}"`)
      } else {
        // Fallback to Docker
        await execAsync(`docker run --rm --network host mysql:latest mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${dbName} > "${filePath}"`)
      }
      return {
        success: true,
        filePath,
        dbName,
        extension: 'sql',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'MySQL backup failed. Ensure MySQL client or Docker is installed.',
      }
    }

  } else if (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://')) {
    // MongoDB backup using mongodump
    const url = new URL(connectionString)
    const dbName = url.pathname.substring(1).split('?')[0] || 'admin'
    const filePath = `/tmp/mongo_backup_${timestamp}`

    // Try native mongodump first, fallback to Docker
    const hasMongoDump = await commandExists('mongodump')

    try {
      if (hasMongoDump) {
        await execAsync(`mongodump --uri="${connectionString}" --out="${filePath}"`)
      } else {
        // Fallback to Docker (mount /tmp to access output)
        await execAsync(`docker run --rm --network host -v /tmp:/tmp mongo:latest mongodump --uri="${connectionString}" --out="${filePath}"`)
      }

      // Create tar.gz archive
      const archivePath = `${filePath}.tar.gz`
      await execAsync(`tar -czf "${archivePath}" -C "${filePath}" .`)
      // Clean up the dump directory
      await execAsync(`rm -rf "${filePath}"`)

      return {
        success: true,
        filePath: archivePath,
        dbName,
        extension: 'tar.gz',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'MongoDB backup failed. Ensure MongoDB tools or Docker is installed.',
      }
    }

  } else {
    return {
      success: false,
      error: 'Unsupported database type for backup',
    }
  }
}

// Helper function to restore database
async function restoreDatabase(connectionString: string, backupFilePath: string): Promise<any> {
  if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
    // PostgreSQL restore using psql
    const hasPsql = await commandExists('psql')

    try {
      if (hasPsql) {
        await execAsync(`psql "${connectionString}" < "${backupFilePath}"`)
      } else {
        // Fallback to Docker (mount backup file)
        await execAsync(`docker run --rm --network host -v "${backupFilePath}:${backupFilePath}:ro" postgres:alpine psql "${connectionString}" < "${backupFilePath}"`)
      }
      return {
        success: true,
        message: 'PostgreSQL database restored successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'PostgreSQL restore failed. Ensure PostgreSQL client or Docker is installed.',
      }
    }

  } else if (connectionString.startsWith('mysql://')) {
    // MySQL restore using mysql
    const url = new URL(connectionString)
    const dbName = url.pathname.substring(1)
    const host = url.hostname
    const port = url.port || '3306'
    const user = url.username
    const password = url.password

    const hasMysql = await commandExists('mysql')

    try {
      if (hasMysql) {
        await execAsync(`mysql -h ${host} -P ${port} -u ${user} -p${password} ${dbName} < "${backupFilePath}"`)
      } else {
        // Fallback to Docker
        await execAsync(`docker run --rm --network host -v "${backupFilePath}:${backupFilePath}:ro" mysql:latest mysql -h ${host} -P ${port} -u ${user} -p${password} ${dbName} < "${backupFilePath}"`)
      }
      return {
        success: true,
        message: 'MySQL database restored successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'MySQL restore failed. Ensure MySQL client or Docker is installed.',
      }
    }

  } else if (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://')) {
    // MongoDB restore using mongorestore
    const url = new URL(connectionString)
    const dbName = url.pathname.substring(1).split('?')[0] || 'admin'
    const timestamp = Date.now()
    const extractPath = `/tmp/mongo_extract_${timestamp}`

    const hasMongoRestore = await commandExists('mongorestore')

    try {
      // Extract tar.gz if needed
      if (backupFilePath.endsWith('.tar.gz') || backupFilePath.endsWith('.gz')) {
        await execAsync(`mkdir -p "${extractPath}" && tar -xzf "${backupFilePath}" -C "${extractPath}"`)

        if (hasMongoRestore) {
          await execAsync(`mongorestore --uri="${connectionString}" --db="${dbName}" "${extractPath}/${dbName}"`)
        } else {
          // Fallback to Docker
          await execAsync(`docker run --rm --network host -v /tmp:/tmp mongo:latest mongorestore --uri="${connectionString}" --db="${dbName}" "${extractPath}/${dbName}"`)
        }

        await execAsync(`rm -rf "${extractPath}"`)
      } else {
        if (hasMongoRestore) {
          await execAsync(`mongorestore --uri="${connectionString}" --db="${dbName}" "${backupFilePath}"`)
        } else {
          // Fallback to Docker
          await execAsync(`docker run --rm --network host -v "${backupFilePath}:${backupFilePath}:ro" mongo:latest mongorestore --uri="${connectionString}" --db="${dbName}" "${backupFilePath}"`)
        }
      }

      return {
        success: true,
        message: 'MongoDB database restored successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'MongoDB restore failed. Ensure MongoDB tools or Docker is installed.',
      }
    }

  } else {
    return {
      success: false,
      error: 'Unsupported database type for restore',
    }
  }
}

export default router
