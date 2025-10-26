import Database from 'better-sqlite3'

/**
 * Migration 001: Workspace Hierarchy
 *
 * Transforms flat snapshot list into hierarchical workspace → snapshots structure.
 *
 * Changes:
 * - Renames `workspaces` table to `workspace_snapshots`
 * - Creates new `workspaces` table for parent entities
 * - Links snapshots to workspaces via `workspace_id` foreign key
 * - Migrates existing data by grouping snapshots by scannedPath
 */

export function up(db: Database.Database): void {
  console.log('🔄 Running migration 001: Workspace Hierarchy')

  // Start transaction
  db.exec('BEGIN TRANSACTION')

  try {
    // Step 1: Rename old workspaces table to workspace_snapshots
    console.log('  → Renaming workspaces table to workspace_snapshots...')
    db.exec(`ALTER TABLE workspaces RENAME TO workspace_snapshots`)

    // Step 2: Create new workspaces table (parent entity)
    console.log('  → Creating new workspaces table...')
    db.exec(`
      CREATE TABLE workspaces (
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

    // Step 3: Add workspace_id and updated_at columns to workspace_snapshots
    console.log('  → Adding workspace_id column to workspace_snapshots...')
    db.exec(`ALTER TABLE workspace_snapshots ADD COLUMN workspace_id TEXT`)
    db.exec(`ALTER TABLE workspace_snapshots ADD COLUMN updated_at DATETIME`)

    // Step 4: Create indexes
    console.log('  → Creating indexes...')
    db.exec(`CREATE INDEX idx_snapshots_workspace_id ON workspace_snapshots(workspace_id)`)
    db.exec(`CREATE INDEX idx_workspaces_active ON workspaces(active)`)
    db.exec(`CREATE INDEX idx_workspaces_folder_path ON workspaces(folder_path)`)

    // Step 5: Migrate data - Group snapshots by scannedPath and create workspaces
    console.log('  → Migrating existing data...')

    // Get all existing snapshots
    const snapshots = db.prepare('SELECT id, name, config, created_at FROM workspace_snapshots').all() as Array<{
      id: string
      name: string
      config: string
      created_at: string
    }>

    // Track which workspaces we've created
    const workspaceMap = new Map<string, string>() // scannedPath -> workspace_id
    let workspaceCount = 0

    for (const snapshot of snapshots) {
      let config: any
      try {
        config = JSON.parse(snapshot.config)
      } catch (error) {
        console.warn(`  ⚠️ Failed to parse config for snapshot ${snapshot.id}, skipping...`)
        continue
      }

      // Determine workspace key (scannedPath or "Default")
      const workspaceKey = config.scannedPath || 'DEFAULT_WORKSPACE'

      // Create workspace if it doesn't exist
      if (!workspaceMap.has(workspaceKey)) {
        const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Determine workspace name
        let workspaceName: string
        if (workspaceKey === 'DEFAULT_WORKSPACE') {
          workspaceName = 'Default Workspace'
        } else {
          // Use folder name as workspace name
          const folderName = workspaceKey.split('/').filter(Boolean).pop() || 'Unnamed Workspace'
          workspaceName = folderName
        }

        // Extract tags from first snapshot (if any)
        const tags = config.tags ? JSON.stringify(config.tags) : null

        // Create workspace
        db.prepare(`
          INSERT INTO workspaces (id, name, description, folder_path, tags, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          workspaceId,
          workspaceName,
          `Auto-created from existing snapshots`,
          workspaceKey === 'DEFAULT_WORKSPACE' ? null : workspaceKey,
          tags,
          snapshot.created_at,
          snapshot.created_at
        )

        workspaceMap.set(workspaceKey, workspaceId)
        workspaceCount++
      }

      // Link snapshot to workspace
      const workspaceId = workspaceMap.get(workspaceKey)!
      db.prepare(`
        UPDATE workspace_snapshots
        SET workspace_id = ?, updated_at = created_at
        WHERE id = ?
      `).run(workspaceId, snapshot.id)
    }

    console.log(`  ✓ Created ${workspaceCount} workspaces from ${snapshots.length} snapshots`)

    // Set first workspace as active (if any exist)
    if (workspaceCount > 0) {
      const firstWorkspace = db.prepare('SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1').get() as { id: string } | undefined
      if (firstWorkspace) {
        db.prepare('UPDATE workspaces SET active = 1 WHERE id = ?').run(firstWorkspace.id)
        console.log(`  ✓ Set workspace ${firstWorkspace.id} as active`)
      }
    }

    // Commit transaction
    db.exec('COMMIT')
    console.log('✅ Migration 001 completed successfully')
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK')
    console.error('❌ Migration 001 failed:', error)
    throw error
  }
}

export function down(db: Database.Database): void {
  console.log('🔄 Rolling back migration 001: Workspace Hierarchy')

  db.exec('BEGIN TRANSACTION')

  try {
    // Remove indexes
    db.exec(`DROP INDEX IF EXISTS idx_snapshots_workspace_id`)
    db.exec(`DROP INDEX IF EXISTS idx_workspaces_active`)
    db.exec(`DROP INDEX IF EXISTS idx_workspaces_folder_path`)

    // Drop new workspaces table
    db.exec(`DROP TABLE IF EXISTS workspaces`)

    // Rename workspace_snapshots back to workspaces
    // Note: SQLite doesn't support removing columns, so we'll recreate the table
    db.exec(`
      CREATE TABLE workspaces_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.exec(`
      INSERT INTO workspaces_new (id, name, config, created_at)
      SELECT id, name, config, created_at FROM workspace_snapshots
    `)

    db.exec(`DROP TABLE workspace_snapshots`)
    db.exec(`ALTER TABLE workspaces_new RENAME TO workspaces`)

    db.exec('COMMIT')
    console.log('✅ Migration 001 rolled back successfully')
  } catch (error) {
    db.exec('ROLLBACK')
    console.error('❌ Rollback failed:', error)
    throw error
  }
}
