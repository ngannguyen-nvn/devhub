import Database from 'better-sqlite3'

/**
 * Migration 006: v2.0 Orchestration Features
 *
 * Adds support for:
 * - Service dependencies and startup order
 * - Service health checks
 * - Log persistence and sessions
 * - Service templates
 * - Port conflict management
 */

export default {
  name: '006_v2_orchestration_features',

  up(db: Database.Database) {
    console.log('Running migration: 006_v2_orchestration_features')

    // 1. Service Dependencies
    console.log('  → Creating service_dependencies table...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_dependencies (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        depends_on_service_id TEXT NOT NULL,
        wait_for_health INTEGER DEFAULT 1,
        startup_delay INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_service_id) REFERENCES services(id) ON DELETE CASCADE,
        UNIQUE(service_id, depends_on_service_id)
      )
    `)

    db.exec(`CREATE INDEX idx_dependencies_service ON service_dependencies(service_id)`)
    db.exec(`CREATE INDEX idx_dependencies_depends_on ON service_dependencies(depends_on_service_id)`)

    // 2. Service Health Checks
    console.log('  → Creating service_health_checks table...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_health_checks (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('http', 'tcp', 'command')),
        endpoint TEXT,
        expected_status INTEGER DEFAULT 200,
        expected_body TEXT,
        port INTEGER,
        command TEXT,
        interval INTEGER DEFAULT 30,
        timeout INTEGER DEFAULT 5000,
        retries INTEGER DEFAULT 3,
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )
    `)

    db.exec(`CREATE INDEX idx_health_checks_service ON service_health_checks(service_id)`)

    // 3. Add health status to services table
    console.log('  → Adding health_status column to services...')
    db.exec(`ALTER TABLE services ADD COLUMN health_status TEXT DEFAULT 'unknown'`)
    db.exec(`ALTER TABLE services ADD COLUMN last_health_check DATETIME`)
    db.exec(`ALTER TABLE services ADD COLUMN health_check_failures INTEGER DEFAULT 0`)

    // 4. Add auto-restart configuration to services
    console.log('  → Adding auto_restart columns to services...')
    db.exec(`ALTER TABLE services ADD COLUMN auto_restart INTEGER DEFAULT 0`)
    db.exec(`ALTER TABLE services ADD COLUMN max_restarts INTEGER DEFAULT 3`)
    db.exec(`ALTER TABLE services ADD COLUMN restart_count INTEGER DEFAULT 0`)
    db.exec(`ALTER TABLE services ADD COLUMN backoff_strategy TEXT DEFAULT 'exponential'`)

    // 5. Service Log Sessions
    console.log('  → Creating service_log_sessions table...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_log_sessions (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        started_at DATETIME NOT NULL,
        stopped_at DATETIME,
        exit_code INTEGER,
        exit_reason TEXT,
        logs_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )
    `)

    db.exec(`CREATE INDEX idx_log_sessions_service ON service_log_sessions(service_id)`)
    db.exec(`CREATE INDEX idx_log_sessions_started ON service_log_sessions(started_at DESC)`)

    // 6. Service Logs
    console.log('  → Creating service_logs table...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        level TEXT DEFAULT 'info',
        message TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES service_log_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )
    `)

    db.exec(`CREATE INDEX idx_logs_session ON service_logs(session_id)`)
    db.exec(`CREATE INDEX idx_logs_service ON service_logs(service_id)`)
    db.exec(`CREATE INDEX idx_logs_timestamp ON service_logs(timestamp DESC)`)

    // 7. Service Templates
    console.log('  → Creating service_templates table...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        language TEXT NOT NULL,
        framework TEXT,
        default_command TEXT NOT NULL,
        default_port INTEGER,
        default_env_vars TEXT,
        health_check_config TEXT,
        detect_files TEXT NOT NULL,
        is_builtin INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.exec(`CREATE INDEX idx_templates_language ON service_templates(language)`)
    db.exec(`CREATE INDEX idx_templates_framework ON service_templates(framework)`)

    // 8. Service Events (for timeline)
    console.log('  → Creating service_events table...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        metadata TEXT,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )
    `)

    db.exec(`CREATE INDEX idx_events_service ON service_events(service_id)`)
    db.exec(`CREATE INDEX idx_events_timestamp ON service_events(timestamp DESC)`)

    // 9. Service Groups
    console.log('  → Creating service_groups table...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_groups (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT DEFAULT 'folder',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS service_group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        FOREIGN KEY (group_id) REFERENCES service_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        UNIQUE(group_id, service_id)
      )
    `)

    db.exec(`CREATE INDEX idx_group_members_group ON service_group_members(group_id)`)
    db.exec(`CREATE INDEX idx_group_members_service ON service_group_members(service_id)`)

    console.log('  ✓ All v2.0 tables created successfully')
  },

  down(db: Database.Database) {
    console.log('Rolling back migration: 006_v2_orchestration_features')

    db.exec('DROP TABLE IF EXISTS service_group_members')
    db.exec('DROP TABLE IF EXISTS service_groups')
    db.exec('DROP TABLE IF EXISTS service_events')
    db.exec('DROP TABLE IF EXISTS service_templates')
    db.exec('DROP TABLE IF EXISTS service_logs')
    db.exec('DROP TABLE IF EXISTS service_log_sessions')
    db.exec('DROP TABLE IF EXISTS service_health_checks')
    db.exec('DROP TABLE IF EXISTS service_dependencies')

    // Note: Cannot DROP COLUMN in SQLite, would need to recreate services table
    console.log('  ✓ Rolled back v2.0 tables')
  },
}
