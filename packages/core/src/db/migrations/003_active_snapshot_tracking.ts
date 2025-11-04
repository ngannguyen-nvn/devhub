import Database from 'better-sqlite3'

/**
 * Migration 003: Active Snapshot Tracking
 *
 * Adds active_snapshot_id to workspaces table to track which snapshot is currently applied.
 * This allows users to see which snapshot state they're currently on.
 *
 * Changes:
 * - Adds active_snapshot_id column to workspaces table (nullable, foreign key)
 * - Adds index for performance
 */

export function up(db: Database.Database): void {
  console.log('🔄 Running migration 003: Active Snapshot Tracking')

  db.exec('BEGIN TRANSACTION')

  try {
    // ==================== STEP 1: ADD ACTIVE_SNAPSHOT_ID COLUMN ====================
    console.log('  → Adding active_snapshot_id column to workspaces table...')

    // Create new workspaces table with active_snapshot_id
    db.exec(`
      CREATE TABLE workspaces_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        folder_path TEXT,
        active INTEGER DEFAULT 0,
        active_snapshot_id TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (active_snapshot_id) REFERENCES workspace_snapshots(id) ON DELETE SET NULL
      )
    `)

    // Copy data from old table
    db.exec(`
      INSERT INTO workspaces_new (id, name, description, folder_path, active, tags, created_at, updated_at)
      SELECT id, name, description, folder_path, active, tags, created_at, updated_at
      FROM workspaces
    `)

    // Drop old table and rename new one
    db.exec('DROP TABLE workspaces')
    db.exec('ALTER TABLE workspaces_new RENAME TO workspaces')

    // Recreate existing indexes
    db.exec('CREATE INDEX idx_workspaces_active ON workspaces(active)')
    db.exec('CREATE INDEX idx_workspaces_folder_path ON workspaces(folder_path)')

    // Create new index for active_snapshot_id
    db.exec('CREATE INDEX idx_workspaces_active_snapshot ON workspaces(active_snapshot_id)')

    const workspaceCount = db.prepare('SELECT COUNT(*) as count FROM workspaces').get() as { count: number }
    console.log(`  ✓ Updated ${workspaceCount.count} workspaces with active_snapshot_id column`)

    // ==================== STEP 2: VERIFY MIGRATION ====================
    console.log('  → Verifying migration...')

    // Verify column exists
    const columns = db.pragma('table_info(workspaces)') as Array<{ name: string }>
    const hasColumn = columns.some((col) => col.name === 'active_snapshot_id')
    if (!hasColumn) {
      throw new Error('active_snapshot_id column not found in workspaces table')
    }

    console.log('  ✓ Migration verification passed')

    // Commit transaction
    db.exec('COMMIT')
    console.log('✅ Migration 003 completed successfully')
    console.log(`   → Workspaces updated: ${workspaceCount.count}`)
    console.log(`   → Active snapshot tracking enabled`)
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK')
    console.error('❌ Migration 003 failed:', error)
    throw error
  }
}

export function down(db: Database.Database): void {
  console.log('🔄 Rolling back migration 003: Active Snapshot Tracking')

  db.exec('BEGIN TRANSACTION')

  try {
    // Recreate workspaces table without active_snapshot_id
    db.exec(`
      CREATE TABLE workspaces_old (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        folder_path TEXT,
        active INTEGER DEFAULT 0,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Copy data from current table (excluding active_snapshot_id)
    db.exec(`
      INSERT INTO workspaces_old (id, name, description, folder_path, active, tags, created_at, updated_at)
      SELECT id, name, description, folder_path, active, tags, created_at, updated_at
      FROM workspaces
    `)

    // Drop current table and rename old one
    db.exec('DROP TABLE workspaces')
    db.exec('ALTER TABLE workspaces_old RENAME TO workspaces')

    // Recreate indexes
    db.exec('CREATE INDEX idx_workspaces_active ON workspaces(active)')
    db.exec('CREATE INDEX idx_workspaces_folder_path ON workspaces(folder_path)')

    db.exec('COMMIT')
    console.log('✅ Migration 003 rolled back successfully')
  } catch (error) {
    db.exec('ROLLBACK')
    console.error('❌ Rollback failed:', error)
    throw error
  }
}
