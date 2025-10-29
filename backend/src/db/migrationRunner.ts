import Database from 'better-sqlite3'
import * as migration001 from './migrations/001_workspace_hierarchy'
import * as migration002 from './migrations/002_workspace_scoping'
import * as migration003 from './migrations/003_active_snapshot_tracking'
import migration004 from './migrations/004_profile_source_metadata'
import migration005 from './migrations/005_allow_duplicate_profile_names'

interface Migration {
  id: number
  name: string
  up: (db: Database.Database) => void
  down: (db: Database.Database) => void
}

const migrations: Migration[] = [
  {
    id: 1,
    name: 'workspace_hierarchy',
    up: migration001.up,
    down: migration001.down,
  },
  {
    id: 2,
    name: 'workspace_scoping',
    up: migration002.up,
    down: migration002.down,
  },
  {
    id: 3,
    name: 'active_snapshot_tracking',
    up: migration003.up,
    down: migration003.down,
  },
  {
    id: 4,
    name: 'profile_source_metadata',
    up: migration004.up,
    down: migration004.down,
  },
  {
    id: 5,
    name: 'allow_duplicate_profile_names',
    up: migration005.up,
    down: migration005.down,
  },
]

export class MigrationRunner {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * Initialize migrations table
   */
  private initMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  /**
   * Get list of executed migrations
   */
  private getExecutedMigrations(): number[] {
    const stmt = this.db.prepare('SELECT id FROM migrations ORDER BY id ASC')
    const rows = stmt.all() as Array<{ id: number }>
    return rows.map(row => row.id)
  }

  /**
   * Mark migration as executed
   */
  private markMigrationExecuted(migration: Migration): void {
    this.db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name)
  }

  /**
   * Remove migration record
   */
  private removeMigrationRecord(migrationId: number): void {
    this.db.prepare('DELETE FROM migrations WHERE id = ?').run(migrationId)
  }

  /**
   * Run all pending migrations
   */
  public runMigrations(): void {
    console.log('🚀 Starting database migrations...')

    this.initMigrationsTable()

    const executed = this.getExecutedMigrations()
    const pending = migrations.filter(m => !executed.includes(m.id))

    if (pending.length === 0) {
      console.log('✅ No pending migrations')
      return
    }

    console.log(`📋 Found ${pending.length} pending migration(s)`)

    for (const migration of pending) {
      try {
        console.log(`\n⚙️  Running migration ${migration.id}: ${migration.name}`)
        migration.up(this.db)
        this.markMigrationExecuted(migration)
        console.log(`✅ Migration ${migration.id} completed\n`)
      } catch (error) {
        console.error(`\n❌ Migration ${migration.id} failed:`, error)
        throw new Error(`Migration ${migration.id} (${migration.name}) failed. Database may be in an inconsistent state.`)
      }
    }

    console.log('✅ All migrations completed successfully\n')
  }

  /**
   * Rollback last migration
   */
  public rollbackLast(): void {
    console.log('🔄 Rolling back last migration...')

    this.initMigrationsTable()

    const executed = this.getExecutedMigrations()

    if (executed.length === 0) {
      console.log('⚠️  No migrations to rollback')
      return
    }

    const lastMigrationId = executed[executed.length - 1]
    const migration = migrations.find(m => m.id === lastMigrationId)

    if (!migration) {
      throw new Error(`Migration ${lastMigrationId} not found`)
    }

    try {
      console.log(`\n⚙️  Rolling back migration ${migration.id}: ${migration.name}`)
      migration.down(this.db)
      this.removeMigrationRecord(lastMigrationId)
      console.log(`✅ Migration ${migration.id} rolled back\n`)
    } catch (error) {
      console.error(`\n❌ Rollback failed:`, error)
      throw error
    }
  }

  /**
   * Get migration status
   */
  public getStatus(): { total: number; executed: number; pending: number } {
    this.initMigrationsTable()

    const executed = this.getExecutedMigrations()

    return {
      total: migrations.length,
      executed: executed.length,
      pending: migrations.length - executed.length,
    }
  }
}
