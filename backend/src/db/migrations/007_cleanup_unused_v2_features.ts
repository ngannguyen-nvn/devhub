import Database from 'better-sqlite3'

/**
 * Migration 007: Cleanup Unused v2.0 Features
 *
 * Removes unused features that were part of v2.0 simplification:
 * - Service dependencies (removed feature)
 * - Service templates (removed feature)
 * - Auto-restart configuration (removed feature)
 * - Port management tables (removed feature)
 * - Service events (never used)
 */

export default {
  name: '007_cleanup_unused_v2_features',

  up(db: Database.Database) {
    console.log('Running migration: 007_cleanup_unused_v2_features')

    // Drop unused tables
    console.log('  → Dropping service_dependencies table...')
    db.exec('DROP TABLE IF EXISTS service_dependencies')

    console.log('  → Dropping service_templates table...')
    db.exec('DROP TABLE IF EXISTS service_templates')

    console.log('  → Dropping service_events table...')
    db.exec('DROP TABLE IF EXISTS service_events')

    // Remove auto-restart columns from services table
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    console.log('  → Removing unused columns from services table...')

    // Get current services schema
    const services = db.prepare(`
      SELECT
        id, workspace_id, name, repo_path, command, port, env_vars,
        health_status, last_health_check, health_check_failures,
        created_at, updated_at
      FROM services
    `).all()

    // Create new services table without auto-restart columns
    db.exec(`
      CREATE TABLE services_new (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        repo_path TEXT NOT NULL,
        command TEXT NOT NULL,
        port INTEGER,
        env_vars TEXT,
        health_status TEXT DEFAULT 'unknown',
        last_health_check DATETIME,
        health_check_failures INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `)

    // Copy data
    const insertStmt = db.prepare(`
      INSERT INTO services_new (
        id, workspace_id, name, repo_path, command, port, env_vars,
        health_status, last_health_check, health_check_failures,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    db.transaction(() => {
      for (const service of services) {
        insertStmt.run(
          service.id,
          service.workspace_id,
          service.name,
          service.repo_path,
          service.command,
          service.port,
          service.env_vars,
          service.health_status,
          service.last_health_check,
          service.health_check_failures,
          service.created_at,
          service.updated_at
        )
      }
    })()

    // Drop old table and rename new one
    db.exec('DROP TABLE services')
    db.exec('ALTER TABLE services_new RENAME TO services')

    // Recreate indexes
    db.exec('CREATE INDEX idx_services_workspace ON services(workspace_id)')

    console.log('  ✅ Migration complete - removed unused v2.0 features')
  },

  down(db: Database.Database) {
    console.log('Rolling back migration: 007_cleanup_unused_v2_features')
    console.log('  ⚠️  Warning: This migration is not reversible')
    console.log('  ⚠️  Dropped tables and columns cannot be restored')
  }
}
