import type Database from 'better-sqlite3'
import path from 'path'
import { MigrationRunner } from './migrationRunner'

let db: Database.Database | null = null

/**
 * Initialize database connection
 * This MUST be called after nativeLoader sets up better-sqlite3 in VSCode extension
 */
function initDb(): Database.Database {
  if (db) {
    return db
  }

  // Lazy import better-sqlite3 to allow nativeLoader to run first
  const DatabaseConstructor = require('better-sqlite3')

  // Allow database path to be configured via environment variable
  // Default to process.cwd() for backward compatibility
  const dbPath = process.env.DEVHUB_DB_PATH || path.join(process.cwd(), 'devhub.db')
  const dbInstance: Database.Database = new DatabaseConstructor(dbPath)

  // Create initial tables (before migrations)
  dbInstance.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    repo_path TEXT NOT NULL,
    command TEXT NOT NULL,
    port INTEGER,
    env_vars TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS env_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS env_variables (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    service_id TEXT,
    is_secret INTEGER DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES env_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_env_variables_profile ON env_variables(profile_id);
  CREATE INDEX IF NOT EXISTS idx_env_variables_service ON env_variables(service_id);

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT,
    template TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
  CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
  CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(title, content, content='notes', content_rowid='rowid');
  `)

  console.log('✅ Database initialized at', dbPath)

  // Run migrations
  const migrationRunner = new MigrationRunner(dbInstance)
  migrationRunner.runMigrations()

  db = dbInstance
  return dbInstance
}

function getDb(): Database.Database {
  if (!db) {
    return initDb()
  }
  return db
}

// Singleton accessor for database
export class DatabaseInstance {
  private static instance: Database.Database

  static getInstance(): Database.Database {
    if (!DatabaseInstance.instance) {
      DatabaseInstance.instance = getDb()
    }
    return DatabaseInstance.instance
  }
}

// Create a Proxy that lazily initializes the database on first access
// This allows existing code to use `db.prepare()` etc without changes
const dbProxy: any = new Proxy({} as Database.Database, {
  get(target, prop) {
    const db = getDb()
    const value = (db as any)[prop]
    return typeof value === 'function' ? value.bind(db) : value
  }
})

export { getDb, initDb }
export default dbProxy as Database.Database
