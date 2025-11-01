# DevHub VSCode Extension - Implementation Guide

**Status:** Planned (Core Architecture Ready) ✅

This document provides a comprehensive guide for building the DevHub VSCode extension using the shared `@devhub/core` package.

---

## 📋 Overview

DevHub is being architected to support **two versions** from a single codebase:

1. **Web Application** (Current) - Express backend + React frontend
2. **VSCode Extension** (Planned) - VSCode extension + webview UI

**Key Insight:** 85-90% of the backend logic is already shared via the `@devhub/core` package, making the VSCode extension development significantly faster and more maintainable.

---

## 🎯 Feasibility Assessment

| Aspect | Score | Notes |
|--------|-------|-------|
| **Code Reusability** | 9/10 | 85-90% backend logic shared, 80% React UI reusable |
| **Technical Complexity** | 7/10 | Message passing + webviews, but well-documented patterns |
| **Maintenance Overhead** | 8/10 | Only 30% overhead vs 200% for separate codebases |
| **Market Fit** | 10/10 | 165M+ VSCode users, huge potential audience |
| **Development Time** | 8/10 | 3-4 weeks estimated with core already extracted |
| **Overall Feasibility** | **8.5/10** | **Highly Feasible** ✅

---

## 🏗 Architecture Overview

### Current Shared Core Architecture

```
┌─────────────────────────────────────────────────┐
│           @devhub/core (packages/core)          │
│  ┌───────────────────────────────────────────┐  │
│  │ Service Managers (100% shared)            │  │
│  │ - ServiceManager, DockerManager           │  │
│  │ - EnvManager, WorkspaceManager            │  │
│  │ - NotesManager, HealthCheckManager        │  │
│  │ - LogManager, GroupManager, RepoScanner   │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ Database & Migrations (100% shared)       │  │
│  │ - SQLite database initialization          │  │
│  │ - 7 migrations (workspace, v2.0 features) │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ▲
                      │
          ┌───────────┴───────────┐
          │                       │
┌─────────┴─────────┐   ┌─────────┴──────────┐
│ Web Backend       │   │ VSCode Extension   │
│ (backend/)        │   │ (TO BUILD)         │
│                   │   │                    │
│ Thin HTTP wrapper │   │ Thin message       │
│ - Express routes  │   │   passing wrapper  │
│ - REST endpoints  │   │ - VSCode webviews  │
│ - CORS handling   │   │ - Extension API    │
└───────────────────┘   └────────────────────┘
```

### What's Already Done ✅

1. **Core Package Extracted** - All business logic in `packages/core`
2. **Service Managers** - 9 managers ready for reuse
3. **Database Layer** - SQLite + migrations fully portable
4. **Type Definitions** - Shared interfaces in `@devhub/shared`
5. **Web App Working** - Proven that core architecture works

### What Needs to Be Built 🚧

1. **VSCode Extension Scaffold** (`packages/vscode-extension`)
2. **Message Passing Layer** (Extension Host ↔ Webview)
3. **Webview UI** (Adapt React components for VSCode)
4. **Extension API Integration** (Commands, panels, status bar)
5. **Extension Configuration** (Settings, workspace storage)

---

## 📦 Package Structure

```
devhub/
├── packages/
│   ├── core/                 # ✅ DONE - Shared logic
│   ├── vscode-extension/     # 🚧 TO BUILD
│   │   ├── src/
│   │   │   ├── extension.ts           # Extension entry point
│   │   │   ├── extensionHost/
│   │   │   │   ├── devhubManager.ts   # Main manager wrapping core
│   │   │   │   ├── messageHandler.ts  # Handle webview messages
│   │   │   │   └── commands.ts        # VSCode command handlers
│   │   │   ├── webview/
│   │   │   │   ├── DevHubPanel.ts     # Webview panel manager
│   │   │   │   └── messaging.ts       # Message protocol
│   │   │   └── utils/
│   │   │       ├── storage.ts         # Workspace storage wrapper
│   │   │       └── logger.ts          # Extension logger
│   │   ├── webview-ui/                # React UI (adapted from frontend)
│   │   │   ├── src/
│   │   │   │   ├── components/        # Reuse 80% from frontend
│   │   │   │   ├── messaging/
│   │   │   │   │   └── vscodeApi.ts   # Message passing to extension
│   │   │   │   └── App.tsx            # Main webview app
│   │   │   ├── vite.config.ts         # Build for webview
│   │   │   └── package.json
│   │   ├── package.json               # Extension manifest
│   │   └── tsconfig.json
│   ├── shared/               # ✅ DONE - TypeScript types
│   └── frontend/             # ✅ DONE - Web app UI (reference)
└── backend/                  # ✅ DONE - Web app backend (reference)
```

---

## 🔨 Implementation Steps

### Phase 1: Extension Scaffold (Week 1)

**Goal:** Create extension structure and verify it loads in VSCode

**Tasks:**

1. **Initialize Extension Package**
   ```bash
   cd packages
   npx @vscode/vsce create-extension vscode-extension
   ```

2. **Configure package.json**
   ```json
   {
     "name": "devhub",
     "displayName": "DevHub - Developer Mission Control",
     "description": "Manage microservices, Docker, env vars, and notes",
     "version": "2.0.0",
     "engines": {
       "vscode": "^1.85.0"
     },
     "categories": ["Other"],
     "activationEvents": ["onStartupFinished"],
     "main": "./dist/extension.js",
     "contributes": {
       "commands": [
         {
           "command": "devhub.openPanel",
           "title": "DevHub: Open Dashboard"
         }
       ],
       "viewsContainers": {
         "activitybar": [
           {
             "id": "devhub",
             "title": "DevHub",
             "icon": "resources/icon.svg"
           }
         ]
       }
     },
     "dependencies": {
       "@devhub/core": "*",
       "@devhub/shared": "*"
     }
   }
   ```

3. **Create Extension Entry Point**
   ```typescript
   // packages/vscode-extension/src/extension.ts
   import * as vscode from 'vscode'
   import { DevHubManager } from './extensionHost/devhubManager'

   let devhubManager: DevHubManager | undefined

   export function activate(context: vscode.ExtensionContext) {
     console.log('DevHub extension activated')

     // Initialize DevHub manager (wraps @devhub/core)
     devhubManager = new DevHubManager(context)

     // Register command to open panel
     const openPanelCommand = vscode.commands.registerCommand(
       'devhub.openPanel',
       () => devhubManager?.showPanel()
     )

     context.subscriptions.push(openPanelCommand)
   }

   export function deactivate() {
     devhubManager?.dispose()
   }
   ```

4. **Test Loading**
   - Press F5 in VSCode to launch Extension Development Host
   - Verify extension loads without errors
   - Verify command appears in command palette

**Deliverable:** Extension scaffold that loads successfully ✅

---

### Phase 2: Core Integration (Week 1-2)

**Goal:** Wrap `@devhub/core` service managers in extension host

**Tasks:**

1. **Create DevHub Manager**
   ```typescript
   // packages/vscode-extension/src/extensionHost/devhubManager.ts
   import * as vscode from 'vscode'
   import {
     ServiceManager,
     DockerManager,
     EnvManager,
     WorkspaceManager,
     NotesManager,
     HealthCheckManager,
     LogManager,
     GroupManager,
     RepoScanner,
     Database
   } from '@devhub/core'

   export class DevHubManager {
     private serviceManager: ServiceManager
     private dockerManager: DockerManager
     private envManager: EnvManager
     private workspaceManager: WorkspaceManager
     private notesManager: NotesManager
     private healthCheckManager: HealthCheckManager
     private logManager: LogManager
     private groupManager: GroupManager
     private repoScanner: RepoScanner
     private db: Database

     constructor(private context: vscode.ExtensionContext) {
       // Initialize database in extension storage
       const dbPath = path.join(
         context.globalStorageUri.fsPath,
         'devhub.db'
       )
       this.db = new Database(dbPath)

       // Initialize all managers (reuse from @devhub/core!)
       this.serviceManager = new ServiceManager(this.db)
       this.dockerManager = new DockerManager()
       this.envManager = new EnvManager(this.db)
       this.workspaceManager = new WorkspaceManager(this.db)
       this.notesManager = new NotesManager(this.db)
       this.healthCheckManager = new HealthCheckManager(this.db)
       this.logManager = new LogManager(this.db)
       this.groupManager = new GroupManager(this.db)
       this.repoScanner = new RepoScanner()
     }

     // Expose methods for message handler
     getServiceManager() { return this.serviceManager }
     getDockerManager() { return this.dockerManager }
     getEnvManager() { return this.envManager }
     // ... etc
   }
   ```

2. **Create Message Handler**
   ```typescript
   // packages/vscode-extension/src/extensionHost/messageHandler.ts
   import { DevHubManager } from './devhubManager'

   export class MessageHandler {
     constructor(private devhubManager: DevHubManager) {}

     async handleMessage(message: any): Promise<any> {
       const { type, payload } = message

       switch (type) {
         // Service operations
         case 'services.getAll':
           return this.devhubManager.getServiceManager().getAllServices()

         case 'services.create':
           return this.devhubManager.getServiceManager().createService(payload)

         case 'services.start':
           return this.devhubManager.getServiceManager().startService(payload.id)

         // Docker operations
         case 'docker.listImages':
           return this.devhubManager.getDockerManager().listImages()

         // ... map all API endpoints to core methods
       }
     }
   }
   ```

3. **Set Up Database Storage**
   - Use `context.globalStorageUri` for database file
   - Ensure migrations run on extension activation
   - Handle database locking (single VSCode instance per workspace)

**Deliverable:** Core managers accessible from extension host ✅

---

### Phase 3: Webview UI (Week 2-3)

**Goal:** Create webview panel with React UI

**Tasks:**

1. **Create Webview Panel Manager**
   ```typescript
   // packages/vscode-extension/src/webview/DevHubPanel.ts
   import * as vscode from 'vscode'
   import { MessageHandler } from '../extensionHost/messageHandler'

   export class DevHubPanel {
     private panel: vscode.WebviewPanel | undefined

     constructor(
       private context: vscode.ExtensionContext,
       private messageHandler: MessageHandler
     ) {}

     show() {
       if (this.panel) {
         this.panel.reveal()
         return
       }

       this.panel = vscode.window.createWebviewPanel(
         'devhub',
         'DevHub Dashboard',
         vscode.ViewColumn.One,
         {
           enableScripts: true,
           retainContextWhenHidden: true,
           localResourceRoots: [
             vscode.Uri.joinPath(this.context.extensionUri, 'webview-ui/dist')
           ]
         }
       )

       // Load webview HTML
       this.panel.webview.html = this.getWebviewContent()

       // Handle messages from webview
       this.panel.webview.onDidReceiveMessage(
         async (message) => {
           const response = await this.messageHandler.handleMessage(message)
           this.panel?.webview.postMessage({ id: message.id, response })
         }
       )
     }

     private getWebviewContent(): string {
       const scriptUri = this.panel!.webview.asWebviewUri(
         vscode.Uri.joinPath(
           this.context.extensionUri,
           'webview-ui/dist/assets/index.js'
         )
       )

       return `<!DOCTYPE html>
         <html>
           <head>
             <meta charset="UTF-8">
             <meta name="viewport" content="width=device-width, initial-scale=1.0">
           </head>
           <body>
             <div id="root"></div>
             <script src="${scriptUri}"></script>
           </body>
         </html>`
     }
   }
   ```

2. **Adapt React Components**
   - Copy `frontend/src/components` to `webview-ui/src/components`
   - Replace `axios` calls with VSCode message passing:
     ```typescript
     // webview-ui/src/messaging/vscodeApi.ts
     const vscode = acquireVsCodeApi()

     export async function callExtension(type: string, payload?: any) {
       const messageId = Date.now()

       return new Promise((resolve, reject) => {
         // Send message to extension
         vscode.postMessage({ id: messageId, type, payload })

         // Listen for response
         window.addEventListener('message', (event) => {
           if (event.data.id === messageId) {
             resolve(event.data.response)
           }
         })
       })
     }

     // Usage in components:
     // const services = await callExtension('services.getAll')
     ```

3. **Configure Webview Build**
   ```typescript
   // webview-ui/vite.config.ts
   export default defineConfig({
     build: {
       outDir: '../dist/webview-ui',
       rollupOptions: {
         output: {
           entryFileNames: 'assets/[name].js',
           chunkFileNames: 'assets/[name].js',
           assetFileNames: 'assets/[name].[ext]'
         }
       }
     }
   })
   ```

**Deliverable:** Working webview with React UI ✅

---

### Phase 4: VSCode Integration (Week 3)

**Goal:** Add VSCode-specific features (commands, status bar, tree views)

**Tasks:**

1. **Register Commands**
   ```typescript
   // Commands to register:
   - devhub.openPanel          // Open main dashboard
   - devhub.startService       // Start selected service
   - devhub.stopService        // Stop selected service
   - devhub.scanRepos          // Scan workspace for repos
   - devhub.createSnapshot     // Quick workspace snapshot
   ```

2. **Add Status Bar Item**
   ```typescript
   const statusBarItem = vscode.window.createStatusBarItem(
     vscode.StatusBarAlignment.Left,
     100
   )
   statusBarItem.text = '$(server) DevHub: 3 running'
   statusBarItem.command = 'devhub.openPanel'
   statusBarItem.show()
   ```

3. **Create Tree View** (Optional)
   - Services tree in sidebar
   - Quick start/stop from tree
   - Status indicators

**Deliverable:** Full VSCode integration ✅

---

### Phase 5: Testing & Polish (Week 4)

**Goal:** Test thoroughly and prepare for marketplace

**Tasks:**

1. **Test All Features**
   - Repository scanning
   - Service management (CRUD, start/stop)
   - Docker operations
   - Environment variables
   - Workspaces and snapshots
   - Wiki/Notes
   - Health checks
   - Log persistence
   - Service groups

2. **Handle Edge Cases**
   - Extension activation/deactivation
   - Database migrations
   - Process cleanup on VSCode exit
   - Multi-workspace support

3. **Performance Optimization**
   - Lazy load webview
   - Debounce auto-refresh
   - Optimize message passing

4. **Documentation**
   - README for extension
   - Screenshots
   - Usage guide
   - Keyboard shortcuts

5. **Package for Marketplace**
   ```bash
   npx @vscode/vsce package
   # Creates devhub-2.0.0.vsix
   ```

**Deliverable:** Production-ready extension ✅

---

## 🔑 Key Technical Decisions

### 1. Database Location

**Decision:** Use `context.globalStorageUri` for database
- **Pro:** Shared across all workspaces, single source of truth
- **Con:** Not workspace-specific
- **Alternative:** Use `context.storageUri` for per-workspace databases

### 2. Message Passing Protocol

**Pattern:** Request-Response with message IDs
```typescript
// Webview → Extension
{ id: 12345, type: 'services.getAll', payload: {} }

// Extension → Webview
{ id: 12345, response: [...services] }
```

### 3. React Component Reuse

**Strategy:** Copy components, replace API calls with message passing
- 80% of code reusable as-is
- Only change: `axios.get('/api/services')` → `callExtension('services.getAll')`

### 4. Process Management

**Challenge:** Node.js child processes in extension host
- **Solution:** Works identically to web backend
- ServiceManager already handles process spawning
- Just reuse from `@devhub/core`!

---

## 📊 Effort Estimation

| Phase | Duration | Complexity | Dependencies |
|-------|----------|------------|--------------|
| **1. Extension Scaffold** | 2 days | Low | None |
| **2. Core Integration** | 3 days | Medium | Phase 1 |
| **3. Webview UI** | 5 days | Medium | Phase 1, 2 |
| **4. VSCode Integration** | 3 days | Medium | Phase 3 |
| **5. Testing & Polish** | 5 days | Medium | All phases |
| **Total** | **18 days (3.6 weeks)** | | |

**Note:** Times assume familiarity with VSCode extension development. Add 1 week for learning curve if new to extensions.

---

## 🚀 Getting Started

### Step 1: Set Up Development Environment

```bash
# Install VSCode Extension tools
npm install -g @vscode/vsce yo generator-code

# Install dependencies
npm install
```

### Step 2: Create Extension Package

```bash
cd packages
yo code  # Choose "New Extension (TypeScript)"
# Name: vscode-extension
```

### Step 3: Link Core Package

```bash
cd vscode-extension
npm install --save @devhub/core @devhub/shared
```

### Step 4: Start Development

```bash
# In vscode-extension directory
npm run watch  # Auto-compile TypeScript

# Press F5 in VSCode to launch Extension Development Host
```

---

## 📚 Resources

### VSCode Extension Development

- **Official Guide:** https://code.visualstudio.com/api
- **Webview API:** https://code.visualstudio.com/api/extension-guides/webview
- **Extension Samples:** https://github.com/microsoft/vscode-extension-samples
- **Publishing Guide:** https://code.visualstudio.com/api/working-with-extensions/publishing-extension

### DevHub Codebase

- **Core Package:** `packages/core/` - All business logic
- **Web Backend:** `backend/src/routes/` - API endpoint patterns to replicate
- **Web Frontend:** `frontend/src/components/` - React components to adapt
- **Type Definitions:** `shared/src/index.ts` - Shared interfaces

### Community

- **VSCode Extension Samples:** Study how others build webview extensions
- **React in Webviews:** https://github.com/rebornix/vscode-webview-react

---

## ✅ Success Criteria

The VSCode extension will be considered complete when:

1. ✅ All features from web app work in extension
2. ✅ Database persists across VSCode sessions
3. ✅ Services can be started/stopped from VSCode
4. ✅ Webview UI is responsive and matches web app
5. ✅ Extension can be installed from VSIX file
6. ✅ No memory leaks or performance issues
7. ✅ Documentation is complete
8. ✅ Ready for VSCode Marketplace submission

---

## 🎯 Next Steps

Ready to start building? Follow this sequence:

1. **Read this guide thoroughly** - Understand the architecture
2. **Study `packages/core`** - Familiarize yourself with service managers
3. **Review web backend** - See how core is used in `backend/src/routes/`
4. **Start with Phase 1** - Create extension scaffold
5. **Iterate incrementally** - Test each phase before moving forward

**Questions?** Refer to CLAUDE.md for development guidelines or open an issue.

---

**Last Updated:** 2025-11-01
**Status:** Guide Complete ✅ | Core Architecture Ready ✅ | **Phase 1-3 Complete ✅** | Phase 4-5 Pending 🚧

## 📊 Implementation Progress

- ✅ **Phase 1: Extension Scaffold** (Complete)
  - Extension manifest with 5 commands
  - TypeScript configuration
  - Entry point (extension.ts)
  - Build scripts

- ✅ **Phase 2: Core Integration** (Complete)
  - DevHubManager wrapping @devhub/core
  - Message handler for 40+ message types
  - All API signatures aligned with core package
  - Successfully builds with 0 errors

- ✅ **Phase 3: Webview UI** (Complete)
  - React + Vite webview UI
  - Services component with full CRUD, start/stop, logs
  - VSCode-themed CSS using CSS variables
  - Message passing API wrapper (vscodeApi.ts)
  - Successfully builds: 147K JS bundle + 6K CSS

- 🚧 **Phase 4: VSCode Features** (Pending)
  - Tree view for services
  - Context menus
  - Status bar enhancements

- 🚧 **Phase 5: Testing & Distribution** (Pending)
  - End-to-end testing
  - Package .vsix file
  - Marketplace preparation

🤖 Generated with [Claude Code](https://claude.com/claude-code)
