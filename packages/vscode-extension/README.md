# DevHub - VSCode Extension

**Developer Mission Control for VSCode**

Manage microservices, Docker containers, environment variables, and documentation directly within VSCode.

## 🎯 Status

**Current Version:** 2.0.0
**Development Phase:** Phase 2/5 Complete ✅

- ✅ **Phase 1:** Extension Scaffold - Complete
- ✅ **Phase 2:** Core Integration - Complete
- 🚧 **Phase 3:** React Webview UI - Pending
- 🚧 **Phase 4:** VSCode Features - Pending
- 🚧 **Phase 5:** Testing & Distribution - Pending

## 🚀 Features

### ✅ Implemented

- **Extension Activation:** Loads on VSCode startup
- **Status Bar:** Shows count of running services
- **Commands:**
  - `DevHub: Open Dashboard` - Open main panel
  - `DevHub: Scan Workspace for Repositories` - Find git repos
  - `DevHub: Create Quick Snapshot` - Save workspace state
  - `DevHub: Start Service` - Start a service (quick pick)
  - `DevHub: Stop Service` - Stop a service (quick pick)
- **Core Integration:** All 9 service managers from `@devhub/core`
- **Message Passing:** Webview ↔ Extension communication protocol
- **Active Workspace:** Auto-creates and manages workspaces

### 🚧 Pending

- React UI in webview (currently placeholder HTML)
- Tree view for services in sidebar
- Context menus for service operations
- Configuration panel
- Full feature parity with web app

## 🏗 Architecture

```
VSCode Extension
├── Extension Host (Node.js)
│   ├── extension.ts - Entry point & commands
│   ├── devhubManager.ts - Wraps @devhub/core managers
│   └── messageHandler.ts - Routes webview messages
└── Webview (Browser)
    └── DevHubPanel.ts - Manages webview lifecycle
```

**Code Sharing:** 85-90% of business logic shared with web app via `@devhub/core` package.

## 📦 Installation (Development)

### Prerequisites

- VSCode >= 1.85.0
- Node.js >= 18.0.0
- npm >= 9.0.0

### Build & Run

```bash
# From monorepo root
npm install
npm run build -w packages/vscode-extension

# Open extension in VSCode
cd packages/vscode-extension
code .

# Press F5 to launch Extension Development Host
```

### Manual Installation

```bash
# Package extension
cd packages/vscode-extension
npx @vscode/vsce package

# Install .vsix file
code --install-extension devhub-2.0.0.vsix
```

## 🔧 Development

### Project Structure

```
packages/vscode-extension/
├── src/
│   ├── extension.ts          # Extension entry point (223 lines)
│   ├── extensionHost/
│   │   └── devhubManager.ts  # Core wrapper (270 lines)
│   └── webview/
│       ├── DevHubPanel.ts    # Webview manager (218 lines)
│       └── messageHandler.ts # Message router (237 lines)
├── dist/                     # Compiled output
├── package.json              # Extension manifest
└── tsconfig.json             # TypeScript config
```

### Key Files

- **package.json:** Extension manifest with commands, views, and configuration
- **extension.ts:** Registers commands and initializes managers
- **devhubManager.ts:** Wraps all 9 service managers from core
- **messageHandler.ts:** Routes 40+ message types to core APIs

### Building

```bash
# Watch mode (auto-rebuild on changes)
npm run watch

# Production build
npm run build

# Type check
npm run lint
```

### Testing

```bash
# Run extension
code --extensionDevelopmentPath=/path/to/packages/vscode-extension

# Or press F5 in VSCode when in extension directory
```

## 📚 Usage

### Opening Dashboard

1. Press `Cmd/Ctrl + Shift + P`
2. Type "DevHub: Open Dashboard"
3. Dashboard opens in webview panel

### Quick Service Management

1. Use command palette or click status bar
2. Select service from quick pick
3. Start/stop with one click

### Workspace Snapshots

1. Run "DevHub: Create Quick Snapshot"
2. Enter snapshot name
3. Current workspace state saved

## 🔑 Message Protocol

Webview communicates with extension host via message passing:

```typescript
// Webview → Extension
{
  id: 12345,
  type: 'services.getAll',
  payload: {}
}

// Extension → Webview
{
  id: 12345,
  type: 'response',
  response: [...]
}
```

**Supported Message Types:** 40+ (services, docker, workspaces, notes, health checks, logs, groups)

## 🎨 Shared Core Architecture

This extension uses the same core package as the web app:

```
@devhub/core (packages/core)
    ↓
┌────────────────┬─────────────────┐
│ Web Backend    │ VSCode Extension│
│ (HTTP wrapper) │ (Message passing)│
└────────────────┴─────────────────┘
```

**Benefits:**
- 85-90% code reuse
- Single source of truth
- Only 30% overhead for dual versions

## 📋 TODO

### Phase 3: React Webview UI

- [ ] Set up React + Vite build for webview
- [ ] Adapt components from frontend/
- [ ] Replace axios with vscodeApi messaging
- [ ] Build webview HTML with proper CSP

### Phase 4: VSCode Integration

- [ ] Tree view for services in sidebar
- [ ] Context menus (right-click operations)
- [ ] Configuration settings panel
- [ ] Keyboard shortcuts
- [ ] Extension icons and branding

### Phase 5: Testing & Distribution

- [ ] Test all features end-to-end
- [ ] Handle edge cases
- [ ] Performance optimization
- [ ] Package for marketplace
- [ ] Create screenshots and demo
- [ ] Write marketplace description

## 🤝 Contributing

This extension is part of the DevHub monorepo. See main README for contribution guidelines.

## 📄 License

MIT License - See LICENSE file in repository root.

## 🔗 Links

- **Monorepo:** https://github.com/ngannguyen-nvn/devhub
- **Web App:** See `frontend/` and `backend/` directories
- **Implementation Guide:** See `VSCODE_EXTENSION_GUIDE.md`

---

**Last Updated:** 2025-11-01
**Version:** 2.0.0
**Status:** Phase 2/5 Complete ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)
