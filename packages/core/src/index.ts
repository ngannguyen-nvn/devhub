/**
 * @devhub/core - Shared backend logic for DevHub
 *
 * This package contains all business logic that is shared between:
 * - Web application (Express backend)
 * - VSCode extension
 *
 * All service managers, database operations, and core utilities
 * live here to ensure DRY principle.
 */

// Service Managers (classes and singleton instances)
export { ServiceManager, serviceManager } from './services/serviceManager'
export { DockerManager } from './services/dockerManager'
export { EnvManager } from './services/envManager'
export { WorkspaceManager } from './services/workspaceManager'
export { NotesManager } from './services/notesManager'
export { HealthCheckManager, healthCheckManager } from './services/healthCheckManager'
export { LogManager, logManager } from './services/logManager'
export { GroupManager, groupManager } from './services/groupManager'
export { RepoScanner } from './services/repoScanner'

// Database
export { default as Database, DatabaseInstance } from './db/index'
export * from './db/migrationRunner'

// Re-export migrations for direct access if needed
export * as migration001 from './db/migrations/001_workspace_hierarchy'
export * as migration002 from './db/migrations/002_workspace_scoping'
export * as migration003 from './db/migrations/003_active_snapshot_tracking'
export * as migration004 from './db/migrations/004_profile_source_metadata'
export * as migration005 from './db/migrations/005_allow_duplicate_profile_names'
export * as migration006 from './db/migrations/006_v2_orchestration_features'
export * as migration007 from './db/migrations/007_cleanup_unused_v2_features'
