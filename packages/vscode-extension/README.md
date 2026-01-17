# DevHub - Microservices Mission Control

> **Manage microservices, Docker, environment variables, and documentation - all from VSCode.**

DevHub transforms VSCode into a complete developer control center for microservices development. Stop context-switching between terminals, Docker Desktop, and documentation tools.

![DevHub Dashboard](https://raw.githubusercontent.com/ngannguyen-nvn/devhub/main/docs/images/dashboard-preview.png)

---

## Features

### Service Management

Start, stop, and monitor all your microservices from a single interface.

- **One-click start/stop** from the sidebar tree view
- **Real-time logs** with auto-refresh
- **Service groups** for batch operations (start/stop all)
- **Import from workspace** - auto-detect and create services from your repos
- **Status indicators** showing running/stopped state

### Docker Integration

Full Docker workflow without leaving your editor.

- Build images from Dockerfiles
- Start, stop, and remove containers
- View container logs in real-time
- Generate `docker-compose.yml` files
- Monitor Docker daemon status

### Environment Variables

Secure, organized environment management across all your services.

- **Multiple profiles** (development, staging, production)
- **AES-256 encryption** for sensitive values
- **Import/export** `.env` files
- **Per-service variables** with inheritance
- **Secret masking** in the UI

### Workspace Snapshots

Save and restore your entire development environment state.

- Capture running services and git branches
- Restore workspace to exact previous state
- Quick snapshots via Command Palette
- Hierarchical organization with workspaces

### Wiki & Documentation

Built-in documentation system that lives with your code.

- **Markdown editor** with live preview
- **Full-text search** across all notes
- **Wiki-style linking** with `[[note-name]]` syntax
- **Templates** for common doc types (API, Architecture, Runbook)
- **Categories and tags** for organization

---

## Quick Start

1. **Install the extension** from the marketplace

2. **Open DevHub Dashboard**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "DevHub: Open Dashboard"

3. **Scan your workspace**
   - Click "Scan Workspace" to find repositories
   - Select repos and click "Import Selected"
   - Services are auto-created with detected settings

4. **Start developing**
   - Use the sidebar tree views for quick actions
   - Click play/stop buttons to manage services
   - View logs, Docker containers, and more

---

## Commands

| Command | Description |
|---------|-------------|
| `DevHub: Open Dashboard` | Open the main control panel |
| `DevHub: Scan Workspace` | Find git repositories |
| `DevHub: Create Quick Snapshot` | Save current workspace state |
| `DevHub: Start Service` | Start a selected service |
| `DevHub: Stop Service` | Stop a selected service |
| `DevHub: Show Docker` | Jump to Docker management |
| `DevHub: Show Environment` | Jump to environment variables |
| `DevHub: Show Notes` | Jump to documentation |

---

## Sidebar Views

DevHub adds these views to your VSCode sidebar:

| View | Purpose |
|------|---------|
| **Dashboard** | Quick stats and overview |
| **Services** | Manage microservices with inline controls |
| **Docker** | Images and containers |
| **Environment** | Profiles and variables |
| **Workspaces** | Snapshots and state management |
| **Notes** | Documentation browser |

---

## Requirements

- **VSCode** 1.85.0 or higher
- **Node.js** 16+ (for running services)
- **Docker** (optional, for Docker features)
- **Git** (optional, for repository scanning)

---

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `devhub.autoStartServices` | `false` | Auto-start services on workspace open |
| `devhub.scanDepth` | `3` | Repository scan depth (0-5) |
| `devhub.logRetentionDays` | `7` | Days to keep service logs |

---

## Platform Support

DevHub includes pre-built native binaries for:

- **macOS** (Intel & Apple Silicon)
- **Windows** (x64 & ARM64)
- **Linux** (x64 & ARM64)

Works with VSCode 1.85 through the latest version (1.108+).

---

## Privacy & Security

- **All data stored locally** - no cloud sync or telemetry
- **Encrypted secrets** using AES-256-GCM
- **No network requests** except for Docker operations
- Database stored in VSCode's extension directory

---

## Known Issues

- Docker features require Docker Desktop or Docker daemon running
- Some Linux distributions may need additional SQLite dependencies

---

## Feedback & Support

- **Report issues:** [GitHub Issues](https://github.com/ngannguyen-nvn/devhub/issues)
- **Source code:** [GitHub Repository](https://github.com/ngannguyen-nvn/devhub)

---

## Release Notes

### 2.0.2

- Fixed native module compatibility for VSCode 1.107-1.108 (Electron 39)
- Added support for future Electron versions
- Improved prebuild loading reliability

### 2.0.0

- Initial marketplace release
- Full feature parity with DevHub web version
- 6 tree views with inline actions
- Service groups and batch operations
- Workspace snapshots and state management
- Wiki system with full-text search

---

**Made for developers who manage complex microservices ecosystems.**

[GitHub](https://github.com/ngannguyen-nvn/devhub) · [Report Issue](https://github.com/ngannguyen-nvn/devhub/issues) · [Changelog](https://github.com/ngannguyen-nvn/devhub/releases)
