# @devhub/core

**Shared backend logic for DevHub**

This package contains all business logic that is shared between:
- DevHub Web Application (Express backend)
- DevHub VSCode Extension

## What's Inside

### Service Managers
- `ServiceManager` - Process lifecycle, start/stop, logs
- `DockerManager` - Docker image/container operations
- `EnvManager` - Environment variables with AES-256 encryption
- `WorkspaceManager` - Workspace and snapshot management
- `NotesManager` - Wiki/notes with full-text search
- `HealthCheckManager` - HTTP/TCP/Command health monitoring
- `LogManager` - Persistent log storage and sessions
- `GroupManager` - Service group organization
- `repoScanner` - Git repository scanning

### Database
- SQLite database initialization
- Migration system (7 migrations)
- Schema management

## Usage

```typescript
import { ServiceManager, DatabaseInstance } from '@devhub/core'

// Initialize database
const db = DatabaseInstance.getInstance()

// Use service manager
const serviceManager = new ServiceManager()
const services = serviceManager.getAllServices('workspace-id')
```

## Philosophy

**DRY Principle:** Write business logic once, use it everywhere.

This core package ensures that bug fixes and features automatically propagate to both the web app and VSCode extension.
