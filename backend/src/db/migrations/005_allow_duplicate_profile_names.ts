import Database from 'better-sqlite3'

export default {
  name: '005_allow_duplicate_profile_names',

  up(db: Database.Database) {
    console.log('Running migration: 005_allow_duplicate_profile_names')

    // Remove UNIQUE constraint on (workspace_id, name)
    // Allow multiple profiles with same name (differentiated by source_id)
    // This enables clean profile names across snapshots

    console.log('  → Removing UNIQUE(workspace_id, name) constraint...')

    // Create new table without the unique constraint
    db.exec(`
      CREATE TABLE env_profiles_new (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        source_type TEXT DEFAULT 'manual',
        source_id TEXT,
        source_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `)

    // Copy all data
    db.exec(`
      INSERT INTO env_profiles_new
      SELECT * FROM env_profiles
    `)

    // Drop old table
    db.exec('DROP TABLE env_profiles')

    // Rename new table
    db.exec('ALTER TABLE env_profiles_new RENAME TO env_profiles')

    // Create indexes
    db.exec('CREATE INDEX idx_env_profiles_workspace ON env_profiles(workspace_id)')
    db.exec('CREATE INDEX idx_env_profiles_source ON env_profiles(source_type, source_id)')

    console.log('  ✓ Removed UNIQUE constraint, profiles can now have duplicate names per workspace')
    console.log('  ✓ Profiles are differentiated by source_id')
  },

  down(db: Database.Database) {
    // Rollback: Recreate table with UNIQUE constraint
    // Note: This may fail if duplicate names exist
    db.exec(`
      CREATE TABLE env_profiles_new (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        source_type TEXT DEFAULT 'manual',
        source_id TEXT,
        source_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, name)
      )
    `)

    db.exec(`INSERT INTO env_profiles_new SELECT * FROM env_profiles`)
    db.exec('DROP TABLE env_profiles')
    db.exec('ALTER TABLE env_profiles_new RENAME TO env_profiles')
    db.exec('CREATE INDEX idx_env_profiles_workspace ON env_profiles(workspace_id)')
  }
}
