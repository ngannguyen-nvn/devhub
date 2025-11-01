import Database from 'better-sqlite3'

/**
 * Migration 004: Add source metadata to env_profiles for hierarchical grouping
 *
 * Adds columns to track where profiles came from:
 * - source_type: 'auto-import' | 'snapshot-restore' | 'manual'
 * - source_id: Reference to source (snapshot_id or scan identifier)
 * - source_name: Human-readable source name for grouping
 */

export default {
  name: '004_profile_source_metadata',

  up(db: Database.Database) {
    console.log('Running migration: 004_profile_source_metadata')

    // Add source metadata columns to env_profiles
    db.exec(`
      ALTER TABLE env_profiles ADD COLUMN source_type TEXT DEFAULT 'manual';
    `)

    db.exec(`
      ALTER TABLE env_profiles ADD COLUMN source_id TEXT;
    `)

    db.exec(`
      ALTER TABLE env_profiles ADD COLUMN source_name TEXT;
    `)

    // Create index for faster filtering by source
    db.exec(`
      CREATE INDEX idx_env_profiles_source ON env_profiles(workspace_id, source_type, source_id);
    `)

    console.log('✓ Added source metadata columns to env_profiles')
    console.log('✓ Created index on source fields')

    // Migrate existing profiles: Parse description to infer source
    const profiles = db.prepare('SELECT id, description FROM env_profiles').all() as Array<{
      id: string
      description: string | null
    }>

    for (const profile of profiles) {
      if (!profile.description) continue

      let sourceType = 'manual'
      let sourceName = null

      if (profile.description.includes('Auto-imported from')) {
        sourceType = 'auto-import'
        // Extract scan name from "Auto-imported from ... (Scan - timestamp)"
        const match = profile.description.match(/\(([^)]+)\)$/)
        if (match) {
          sourceName = match[1] // e.g., "Scan - 29/10/2025, 20:07:50"
        }
      } else if (profile.description.includes('restored from snapshot')) {
        sourceType = 'snapshot-restore'
        // Extract snapshot name from "... snapshot "name""
        const match = profile.description.match(/snapshot "([^"]+)"/)
        if (match) {
          sourceName = match[1] // e.g., "Quick Snapshot"
        }
      }

      db.prepare(`
        UPDATE env_profiles
        SET source_type = ?, source_name = ?
        WHERE id = ?
      `).run(sourceType, sourceName, profile.id)
    }

    console.log(`✓ Migrated ${profiles.length} existing profiles with source metadata`)
  },

  down(db: Database.Database) {
    console.log('Rolling back migration: 004_profile_source_metadata')

    // Drop index
    db.exec('DROP INDEX IF EXISTS idx_env_profiles_source')

    // Remove columns (SQLite doesn't support DROP COLUMN directly, need to recreate table)
    db.exec(`
      CREATE TABLE env_profiles_backup (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, name)
      )
    `)

    db.exec(`
      INSERT INTO env_profiles_backup (id, workspace_id, name, description, created_at, updated_at)
      SELECT id, workspace_id, name, description, created_at, updated_at
      FROM env_profiles
    `)

    db.exec('DROP TABLE env_profiles')
    db.exec('ALTER TABLE env_profiles_backup RENAME TO env_profiles')

    console.log('✓ Removed source metadata columns from env_profiles')
  },
}
