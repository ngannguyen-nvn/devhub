# DevHub - Developer Mission Control for VSCode

**Manage microservices, Docker containers, environment variables, and documentation directly from VSCode.**

DevHub brings powerful developer productivity tools into your VSCode workspace, helping you manage complex microservices ecosystems without leaving your editor.

## ⚠️ Important: Native Dependencies

DevHub uses `better-sqlite3`, which requires native binaries compiled for specific platforms and Node.js/Electron versions.

### Packaging Commands

**For local development/testing:**
```bash
npm run package      # Universal package (current platform)
npm run reinstall    # Package and reinstall extension
```

**For distribution (platform-specific):**
```bash
npm run package:linux-x64      # Linux x64
npm run package:darwin-x64     # macOS Intel
npm run package:darwin-arm64   # macOS Apple Silicon
npm run package:win32-x64      # Windows x64
npm run package:win32-arm64    # Windows ARM64
npm run package:all            # All platforms
```

📖 **See [PACKAGING.md](./PACKAGING.md) for detailed instructions and troubleshooting.**

## ✨ Features

### 🚀 Service Management
- **Start/Stop services** with one click from the tree view
- **Real-time logs** viewer with auto-refresh
- **Auto-refresh** status indicators (running/stopped)
- **Service groups** for organization and batch operations
- **Edit services** inline with pencil button
- **Import from workspace** - scan repos and auto-create services

### 🐳 Docker Integration
- Build Docker images from Dockerfiles
- Manage containers (start, stop, remove)
- View container logs
- Generate docker-compose.yml files
- Full Docker daemon integration

### 🌍 Environment Management
- **Environment profiles** (dev, staging, prod)
- **Secure storage** with AES-256-GCM encryption
- Import/export .env files
- Per-service variable management
- Secret masking in UI

### 💾 Workspace Snapshots
- **Capture workspace state** (running services, git branches)
- **Restore snapshots** to recreate environment
- **Auto-create workspace** option when scanning repositories
- Hierarchical workspace organization
- Quick snapshot creation from command palette

### 📚 Wiki & Notes
- **Markdown documentation** with live preview
- **Full-text search** powered by SQLite FTS5
- **Bidirectional linking** with [[note-name]] syntax
- Built-in templates (Architecture, API, Runbook, etc.)
- Category and tag organization

### 📊 Tree Views
- **Dashboard** - Quick overview and stats
- **Services tree** with inline start/stop buttons
- **Docker** - Images and containers
- **Environment** - Profiles and variables
- **Workspaces tree** showing snapshots hierarchy
- **Notes** - Documentation browser
- Context menus for quick actions
- Status indicators and tooltips

## 🎯 Use Cases

- **Microservices Development:** Manage multiple services running locally
- **Docker Workflows:** Build and manage containers without leaving VSCode
- **Team Documentation:** Share knowledge with wiki-style notes
- **Environment Configuration:** Manage configs across dev/staging/prod
- **State Management:** Save and restore your complete development environment

## 📦 Installation

### From Marketplace (Future)
Search for "DevHub" in the VSCode Extensions marketplace.

### From VSIX (Development)
1. Download `devhub-2.0.0.vsix`
2. Open VSCode
3. Go to Extensions (Ctrl+Shift+X)
4. Click `...` → Install from VSIX
5. Select the downloaded file

Or via command line:
```bash
code --install-extension devhub-2.0.0.vsix --force
```

## 🚀 Quick Start

1. **Open DevHub Dashboard:**
   - Press `Cmd/Ctrl + Shift + P`
   - Type "DevHub: Open Dashboard"

2. **View Services:**
   - Click DevHub icon in Activity Bar (left sidebar)
   - Explore Services and Workspaces tree views

3. **Scan & Import Repositories:**
   - Open Dashboard
   - Click "Scan Workspace" to find git repositories
   - Select repositories and click "Import Selected"
   - Services are automatically created with detected settings

4. **Create a Service Manually:**
   - Open Dashboard → Services tab
   - Click "Add Service"
   - Fill in details (name, repo path, command, port)

## ⌨️ Commands

All commands available via Command Palette (`Cmd/Ctrl + Shift + P`):

| Command | Description |
|---------|-------------|
| `DevHub: Open Dashboard` | Open main webview panel |
| `DevHub: Scan Workspace for Repositories` | Scan for git repos |
| `DevHub: Create Quick Snapshot` | Capture current workspace state |
| `DevHub: Start Service` | Start a service |
| `DevHub: Stop Service` | Stop a service |
| `DevHub: Show Dashboard` | Switch to Dashboard tab |
| `DevHub: Show Docker` | Switch to Docker tab |
| `DevHub: Show Environment` | Switch to Environment tab |
| `DevHub: Show Notes` | Switch to Notes tab |

**Tree View Actions:**
- `Activate Workspace` - Set workspace as active
- `Restore Snapshot Options` - Restore a saved snapshot
- `Copy Variable` / `Edit Variable` / `Delete Variable` - Environment variable actions

## 🔧 Requirements

- **VSCode:** 1.85.0 or higher (tested up to 1.108)
- **Node.js:** 16+ (for running services)
- **Docker:** Optional (for Docker features)
- **Git:** Optional (for repository scanning)

## ⚙️ Extension Settings

This extension contributes the following settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `devhub.autoStartServices` | `false` | Automatically start services when workspace opens |
| `devhub.scanDepth` | `3` | Maximum depth for repository scanning (0-5) |
| `devhub.logRetentionDays` | `7` | Number of days to keep service logs |

## 🏗️ Architecture

DevHub uses a shared core architecture:
- **@devhub/core** - Business logic, database operations, service managers
- **SQLite database** - Local data storage with migrations
- **React webview** - Modern UI with VSCode theming
- **Message passing** - Secure extension ↔ webview communication (40+ message types)
- **esbuild** - Fast bundling for extension code

## 🤝 Contributing

Contributions are welcome! See the [main repository](https://github.com/ngannguyen-nvn/devhub) for:
- Development setup
- Architecture documentation (CLAUDE.md)
- Contribution guidelines

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🛠️ Development

### Building from Source

```bash
# Install dependencies (from repo root)
npm install

# Build webview UI
cd packages/vscode-extension
npm run build:webview

# Build extension
npm run build:extension

# Package extension
npm run package

# Package and reinstall (for testing)
npm run reinstall
```

### Testing

**Method 1: Extension Development Host**
1. Open this folder in VSCode
2. Press F5 to launch Extension Development Host
3. Test in the new window

**Method 2: Install VSIX**
```bash
code --install-extension devhub-2.0.0.vsix --force
```

### Database Location

**macOS/Linux:**
```
~/.vscode/extensions/devhub.devhub-2.0.0/devhub.db
```

**VSCode Server (Remote):**
```
~/.vscode-server/data/User/globalStorage/devhub.devhub/devhub.db
```

Access with sqlite3:
```bash
sqlite3 ~/.vscode/extensions/devhub.devhub-2.0.0/devhub.db
```

## 🐛 Issues & Support

- **Report bugs:** [GitHub Issues](https://github.com/ngannguyen-nvn/devhub/issues)
- **Main Project:** [DevHub Repository](https://github.com/ngannguyen-nvn/devhub)

## 📊 Stats

| Metric | Value |
|--------|-------|
| Extension size | ~16 MB (includes native dependencies) |
| Bundled code | ~700 KB (extension.js) |
| Webview UI | ~290 KB |
| Commands | 24 |
| Tree views | 6 (Dashboard, Services, Docker, Environment, Workspaces, Notes) |
| Webview tabs | 6 (Dashboard, Services, Docker, Environment, Workspaces, Notes) |
| Message types | 40+ |

## 🎉 What's New in v2.0.0

- ✅ Complete VSCode extension implementation
- ✅ 6 tree views with inline actions
- ✅ Context menus for quick operations
- ✅ esbuild bundling for fast loading
- ✅ Full feature parity with web version
- ✅ Service groups for organization and filtering
- ✅ Edit service functionality
- ✅ Auto-create workspace on repository scan
- ✅ Import services from scanned repositories
- ✅ VSCode 1.108 (Electron 35) support

---

**Made with ❤️ for developers who manage complex microservices ecosystems.**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
