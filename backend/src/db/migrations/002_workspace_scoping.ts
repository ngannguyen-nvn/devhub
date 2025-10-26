import Database from 'better-sqlite3'

/**
 * Migration 002: Workspace Scoping
 *
 * Adds workspace_id foreign keys to services, env_profiles, and notes tables.
 * This makes resources belong TO workspaces instead of being global.
 *
 * Changes:
 * - Adds workspace_id column to services table
 * - Adds workspace_id column to env_profiles table
 * - Adds workspace_id column to notes table
 * - Migrates existing data to default workspace
 * - Adds indexes for performance
 * - Recreates tables with proper foreign key constraints
 */

export function up(db: Database.Database): void {
  console.log('🔄 Running migration 002: Workspace Scoping')

  db.exec('BEGIN TRANSACTION')

  try {
    // ==================== STEP 1: ENSURE DEFAULT WORKSPACE EXISTS ====================
    console.log('  → Ensuring default workspace exists...')

    // Check if there's an active workspace
    const activeWorkspace = db.prepare('SELECT id FROM workspaces WHERE active = 1 LIMIT 1').get() as
      | { id: string }
      | undefined

    let defaultWorkspaceId: string

    if (activeWorkspace) {
      defaultWorkspaceId = activeWorkspace.id
      console.log(`  ✓ Using existing active workspace: ${defaultWorkspaceId}`)
    } else {
      // Check if any workspaces exist
      const anyWorkspace = db.prepare('SELECT id FROM workspaces LIMIT 1').get() as { id: string } | undefined

      if (anyWorkspace) {
        defaultWorkspaceId = anyWorkspace.id
        // Set it as active
        db.prepare('UPDATE workspaces SET active = 1 WHERE id = ?').run(defaultWorkspaceId)
        console.log(`  ✓ Using existing workspace as default: ${defaultWorkspaceId}`)
      } else {
        // Create default workspace
        defaultWorkspaceId = `workspace_${Date.now()}_default`
        const now = new Date().toISOString()

        db.prepare(`
          INSERT INTO workspaces (id, name, description, active, created_at, updated_at)
          VALUES (?, ?, ?, 1, ?, ?)
        `).run(
          defaultWorkspaceId,
          'Default Workspace',
          'Auto-created to migrate existing resources',
          now,
          now
        )
        console.log(`  ✓ Created new default workspace: ${defaultWorkspaceId}`)
      }
    }

    // ==================== STEP 2: MIGRATE SERVICES TABLE ====================
    console.log('  → Migrating services table...')

    // Create new services table with workspace_id
    db.exec(`
      CREATE TABLE services_new (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        repo_path TEXT NOT NULL,
        command TEXT NOT NULL,
        port INTEGER,
        env_vars TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `)

    // Copy data from old table, adding default workspace_id
    db.exec(`
      INSERT INTO services_new (id, workspace_id, name, repo_path, command, port, env_vars, created_at, updated_at)
      SELECT id, '${defaultWorkspaceId}', name, repo_path, command, port, env_vars, created_at, updated_at
      FROM services
    `)

    // Drop old table and rename new one
    db.exec('DROP TABLE services')
    db.exec('ALTER TABLE services_new RENAME TO services')

    // Create indexes
    db.exec('CREATE INDEX idx_services_workspace ON services(workspace_id)')

    const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number }
    console.log(`  ✓ Migrated ${serviceCount.count} services to workspace ${defaultWorkspaceId}`)

    // ==================== STEP 3: MIGRATE ENV_PROFILES TABLE ====================
    console.log('  → Migrating env_profiles table...')

    // Create new env_profiles table with workspace_id
    db.exec(`
      CREATE TABLE env_profiles_new (
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

    // Copy data from old table, adding default workspace_id
    db.exec(`
      INSERT INTO env_profiles_new (id, workspace_id, name, description, created_at, updated_at)
      SELECT id, '${defaultWorkspaceId}', name, description, created_at, updated_at
      FROM env_profiles
    `)

    // Drop old table and rename new one
    db.exec('DROP TABLE env_profiles')
    db.exec('ALTER TABLE env_profiles_new RENAME TO env_profiles')

    // Create indexes
    db.exec('CREATE INDEX idx_env_profiles_workspace ON env_profiles(workspace_id)')

    const profileCount = db.prepare('SELECT COUNT(*) as count FROM env_profiles').get() as { count: number }
    console.log(`  ✓ Migrated ${profileCount.count} env profiles to workspace ${defaultWorkspaceId}`)

    // ==================== STEP 4: MIGRATE NOTES TABLE ====================
    console.log('  → Migrating notes table...')

    // Create new notes table with workspace_id
    db.exec(`
      CREATE TABLE notes_new (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        template TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `)

    // Copy data from old table, adding default workspace_id
    db.exec(`
      INSERT INTO notes_new (id, workspace_id, title, content, category, tags, template, created_at, updated_at)
      SELECT id, '${defaultWorkspaceId}', title, content, category, tags, template, created_at, updated_at
      FROM notes
    `)

    // Drop old table and rename new one
    db.exec('DROP TABLE notes')
    db.exec('ALTER TABLE notes_new RENAME TO notes')

    // Create indexes
    db.exec('CREATE INDEX idx_notes_workspace ON notes(workspace_id)')
    db.exec('CREATE INDEX idx_notes_category ON notes(category)')
    db.exec('CREATE INDEX idx_notes_title ON notes(title)')

    // Recreate FTS table
    db.exec('DROP TABLE IF EXISTS notes_fts')
    db.exec(`
      CREATE VIRTUAL TABLE notes_fts USING fts5(
        title,
        content,
        content='notes',
        content_rowid='rowid'
      )
    `)

    // Populate FTS table
    db.exec(`
      INSERT INTO notes_fts(rowid, title, content)
      SELECT rowid, title, content FROM notes
    `)

    const noteCount = db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number }
    console.log(`  ✓ Migrated ${noteCount.count} notes to workspace ${defaultWorkspaceId}`)

    // ==================== STEP 5: VERIFY MIGRATION ====================
    console.log('  → Verifying migration...')

    // Verify all services have workspace_id
    const servicesWithoutWorkspace = db
      .prepare('SELECT COUNT(*) as count FROM services WHERE workspace_id IS NULL')
      .get() as { count: number }
    if (servicesWithoutWorkspace.count > 0) {
      throw new Error(`Found ${servicesWithoutWorkspace.count} services without workspace_id`)
    }

    // Verify all env_profiles have workspace_id
    const profilesWithoutWorkspace = db
      .prepare('SELECT COUNT(*) as count FROM env_profiles WHERE workspace_id IS NULL')
      .get() as { count: number }
    if (profilesWithoutWorkspace.count > 0) {
      throw new Error(`Found ${profilesWithoutWorkspace.count} env profiles without workspace_id`)
    }

    // Verify all notes have workspace_id
    const notesWithoutWorkspace = db
      .prepare('SELECT COUNT(*) as count FROM notes WHERE workspace_id IS NULL')
      .get() as { count: number }
    if (notesWithoutWorkspace.count > 0) {
      throw new Error(`Found ${notesWithoutWorkspace.count} notes without workspace_id`)
    }

    console.log('  ✓ Migration verification passed')

    // Commit transaction
    db.exec('COMMIT')
    console.log('✅ Migration 002 completed successfully')
    console.log(`   → Default workspace: ${defaultWorkspaceId}`)
    console.log(`   → Services migrated: ${serviceCount.count}`)
    console.log(`   → Env profiles migrated: ${profileCount.count}`)
    console.log(`   → Notes migrated: ${noteCount.count}`)
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK')
    console.error('❌ Migration 002 failed:', error)
    throw error
  }
}

export function down(db: Database.Database): void {
  console.log('🔄 Rolling back migration 002: Workspace Scoping')

  db.exec('BEGIN TRANSACTION')

  try {
    // Recreate services table without workspace_id
    db.exec(`
      CREATE TABLE services_old (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        repo_path TEXT NOT NULL,
        command TEXT NOT NULL,
        port INTEGER,
        env_vars TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.exec(`
      INSERT INTO services_old (id, name, repo_path, command, port, env_vars, created_at, updated_at)
      SELECT id, name, repo_path, command, port, env_vars, created_at, updated_at
      FROM services
    `)

    db.exec('DROP TABLE services')
    db.exec('ALTER TABLE services_old RENAME TO services')

    // Recreate env_profiles table without workspace_id
    db.exec(`
      CREATE TABLE env_profiles_old (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.exec(`
      INSERT INTO env_profiles_old (id, name, description, created_at, updated_at)
      SELECT id, name, description, created_at, updated_at
      FROM env_profiles
    `)

    db.exec('DROP TABLE env_profiles')
    db.exec('ALTER TABLE env_profiles_old RENAME TO env_profiles')

    // Recreate notes table without workspace_id
    db.exec(`
      CREATE TABLE notes_old (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        template TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.exec(`
      INSERT INTO notes_old (id, title, content, category, tags, template, created_at, updated_at)
      SELECT id, title, content, category, tags, template, created_at, updated_at
      FROM notes
    `)

    db.exec('DROP TABLE notes')
    db.exec('ALTER TABLE notes_old RENAME TO notes')

    // Recreate indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)')

    // Recreate FTS table
    db.exec('DROP TABLE IF EXISTS notes_fts')
    db.exec(`
      CREATE VIRTUAL TABLE notes_fts USING fts5(
        title,
        content,
        content='notes',
        content_rowid='rowid'
      )
    `)

    db.exec('COMMIT')
    console.log('✅ Migration 002 rolled back successfully')
  } catch (error) {
    db.exec('ROLLBACK')
    console.error('❌ Rollback failed:', error)
    throw error
  }
}
