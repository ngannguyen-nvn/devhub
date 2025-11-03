# DevHub - Developer Mission Control for VSCode

**Manage microservices, Docker containers, environment variables, and documentation directly from VSCode.**

DevHub brings powerful developer productivity tools into your VSCode workspace, helping you manage complex microservices ecosystems without leaving your editor.

## ✨ Features

### 🚀 Service Management
- **Start/Stop services** with one click from the tree view
- **Real-time logs** viewer with filtering
- **Auto-refresh** status indicators (running/stopped)
- **Service groups** for batch operations
- **Health checks** with HTTP/TCP/Command monitoring

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
- Hierarchical workspace organization
- Quick snapshot creation from command palette

### 📚 Wiki & Notes
- **Markdown documentation** with live preview
- **Full-text search** powered by SQLite FTS5
- **Bidirectional linking** with [[note-name]] syntax
- Built-in templates (Architecture, API, Runbook, etc.)
- Category and tag organization

### 📊 Tree Views
- **Services tree** with inline start/stop buttons
- **Workspaces tree** showing snapshots hierarchy
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

## 🚀 Quick Start

1. **Open DevHub Dashboard:**
   - Press `Cmd/Ctrl + Shift + P`
   - Type "DevHub: Open Dashboard"

2. **View Services:**
   - Click DevHub icon in Activity Bar (left sidebar)
   - Explore Services and Workspaces tree views

3. **Create a Service:**
   - Open Dashboard
   - Go to Services tab
   - Click "Add Service"
   - Fill in details (name, repo path, command)

## ⌨️ Commands

All commands available via Command Palette (`Cmd/Ctrl + Shift + P`):

- `DevHub: Open Dashboard` - Open main webview panel
- `DevHub: Scan Workspace for Repositories` - Scan for git repos
- `DevHub: Create Quick Snapshot` - Capture current state
- `DevHub: Start Service` - Start a service
- `DevHub: Stop Service` - Stop a service

## 🔧 Requirements

- **VSCode:** 1.85.0 or higher
- **Node.js:** 16+ (for running services)
- **Docker:** Optional (for Docker features)
- **Git:** Optional (for repository scanning)

## ⚙️ Extension Settings

This extension contributes the following settings:

- `devhub.autoStartServices` - Automatically start services when workspace opens
- `devhub.scanDepth` - Maximum depth for repository scanning (0-5)
- `devhub.logRetentionDays` - Number of days to keep service logs

## 🏗️ Architecture

DevHub uses a shared core architecture:
- **@devhub/core** - Business logic (bundled in extension)
- **SQLite database** - Local data storage
- **React webview** - Modern UI with VSCode theming
- **Message passing** - Secure extension ↔ webview communication

## 🤝 Contributing

Contributions are welcome! See the [main repository](https://github.com/ngannguyen-nvn/devhub) for:
- Development setup
- Architecture documentation
- Contribution guidelines

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🛠️ Development

### Building from Source

```bash
# Install dependencies
npm install

# Build webview UI
npm run build:webview

# Build extension
npm run build:extension

# Package extension
npx vsce package
```

### Testing

**Method 1: Extension Development Host**
1. Open this folder in VSCode
2. Press F5 to launch Extension Development Host
3. Test in the new window

**Method 2: Install VSIX**
```bash
code --install-extension devhub-2.0.0.vsix
```

### Database Location

VSCode Extension:
```
~/.vscode-server/data/User/globalStorage/devhub.devhub/devhub.db
```

Access with sqlite3:
```bash
sqlite3 ~/.vscode-server/data/User/globalStorage/devhub.devhub/devhub.db
```

## 🐛 Issues & Support

- **Report bugs:** [GitHub Issues](https://github.com/ngannguyen-nvn/devhub/issues)
- **Main Project:** [DevHub Repository](https://github.com/ngannguyen-nvn/devhub)

## 📊 Stats

- **Extension size:** 294.81 KB
- **Commands:** 10+
- **Tree views:** 2 (Services, Workspaces)
- **Webview tabs:** 4 (Services, Docker, Workspaces, Notes)

## 🎉 What's New in v2.0.0

- ✅ Complete VSCode extension implementation
- ✅ Tree views with inline actions
- ✅ Context menus for quick operations
- ✅ esbuild bundling for fast loading
- ✅ Full feature parity with web version
- ✅ Service health checks and monitoring
- ✅ Log persistence and filtering
- ✅ Service groups for batch operations

---

**Made with ❤️ for developers who manage complex microservices ecosystems.**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
