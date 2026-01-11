# DevHub - Developer Mission Control

**One dashboard to rule all your microservices**

DevHub is a powerful desktop application that helps developers manage their local microservices ecosystem. It combines git repository management, intelligent service orchestration, Docker management, environment configuration, and documentation in one unified interface.

**✅ v2.0 Production Ready!** Advanced orchestration features: service groups, database management, and edit service functionality for professional microservices management.

**🏗️ Dual-Version Architecture:** DevHub now supports both web app and VSCode extension versions using a shared core package, enabling code reuse and maintainable dual deployments.

---

## 🚀 Quick Start

### Option 1: Web Application

#### Prerequisites

- **Node.js** >= 18.0.0 ([Download here](https://nodejs.org/))
- **npm** >= 9.0.0 (comes with Node.js)
- **Git** (to scan repositories)
- **Docker** (optional, for Docker features)

#### Installation

```bash
git clone https://github.com/ngannguyen-nvn/devhub.git
cd devhub
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

### Option 2: VSCode Extension

**Install from .vsix file:**

1. Download `devhub-2.0.0.vsix` from releases
2. In VSCode:
   - Open Command Palette (`Cmd/Ctrl+Shift+P`)
   - Run "Extensions: Install from VSIX..."
   - Select the downloaded `.vsix` file
3. Reload VSCode

**Features:**
- **24 commands** via command palette
- **6 tree views** with inline actions (Dashboard, Services, Docker, Environment, Workspaces, Notes)
- **6 webview tabs** matching web app functionality
- Service management from tree view with inline start/stop
- **Edit services** inline with pencil button
- Real-time logs viewer with auto-refresh
- Docker integration (build, manage containers)
- Environment profiles with AES-256 encryption
- Workspace snapshots (capture and restore state)
- **Auto-create workspace** when scanning repositories
- **Import services** from scanned repositories
- Wiki/Notes with markdown and [[bidirectional linking]]
- **VSCode 1.108** (Electron 35) support

See `packages/vscode-extension/README.md` for detailed documentation.

---

## 📸 Screenshots

### Dashboard - Workspace Overview
![Dashboard](screenshots/01-dashboard.png)
*Central hub showing workspace stats, services, snapshots, and repository scanner*

### Service Manager - Control Your Microservices
![Services](screenshots/02-services.png)
*Start/stop 40+ services with one click, real-time logs, and search*

### Environment Variables - Secure Configuration
![Environment](screenshots/03-environment.png)
*AES-256 encrypted profiles with inline editing and .env file sync*

### Workspaces - Organize Your Projects
![Workspaces](screenshots/04-workspaces.png)
*Hierarchical workspace management with snapshots and isolation*

### Wiki & Notes - Documentation System
![Wiki](screenshots/05-wiki.png)
*Markdown-based notes with full-text search and bidirectional linking*

---

## 🎯 What Does DevHub Do?

DevHub solves the chaos of managing multiple microservices locally:

### Core Features (v1.0)
- **Repository Dashboard**: See all your git repos, branches, and changes in one place
- **Service Manager**: Start/stop services with one click, view real-time logs, and search across all services
- **Docker Integration**: Build images, manage containers, and generate docker-compose files
- **Environment Manager**: Secure environment variables with AES-256 encryption, inline editing, copy/sync to files, and smart search
- **Wiki/Notes**: Markdown-based documentation with full-text search and bidirectional linking
- **Hierarchical Workspaces**: Organize and manage development environments with workspace → snapshot hierarchy

### Advanced Orchestration (v2.0)

- **Service Groups**: Organize services into logical groups with custom colors for visual organization
- **Database Management**: Backup, restore, vacuum, and maintenance operations
- **Edit Services**: Update service configuration inline without recreating

**Performance**: Handles 40+ repos in seconds with 97% fewer API calls

---

## 📖 Web Application Guide

### Feature 1: Repository Dashboard

**What it does:** Scans your filesystem for git repositories and shows their status.

**How to test:**

1. **Open DevHub** at http://localhost:3000
2. You should see the **Dashboard** (it's the default view)
3. In the **scan path input field**, enter a directory path:
   - `/home/user` (Linux/Mac)
   - `C:\Users\YourName` (Windows)
4. Click the **"Scan"** button

**What you should see:**

Each repository displays:
- Repository name and full path
- Current branch (e.g., `main`, `develop`)
- Uncommitted changes indicator (yellow badge if there are changes)
- Last commit message and author
- Dockerfile indicator (blue "Docker" badge if Dockerfile exists)

#### 1.1 Save Repositories to Workspace

**What it does:** After scanning, save selected repositories to a workspace with optional .env file import.

**How to test:**

1. **Scan a folder** with repositories
2. **Select repositories** - All repos are selected by default
3. Click **"Save to Workspace"** button
4. **Choose workspace mode:**
   - **Create New**: Enter workspace name
   - **Use Existing**: Select existing workspace
5. **Optional: Import .env files**
   - Check to import .env files to environment profiles
   - Creates one profile per repository
6. Click **"Save"**

**Benefits:**
- One-click setup for entire project
- .env files automatically imported (opt-in)
- No variable conflicts between repos

---

### Feature 2: Service Manager

**What it does:** Define, start, stop, and monitor services (any command-line program).

#### 2.1 Add Your First Service

1. Click **"Services"** in the left sidebar
2. Click **"Add Service"** button
3. Fill out the form:
   - **Service Name**: `Test Echo Service`
   - **Repository Path**: `/home/user`
   - **Start Command**: `echo "Hello from DevHub!" && sleep 30`
   - **Port**: Leave empty (optional)
4. Click **"Add Service"**

#### 2.2 Start and Monitor

1. Click the **green "Start"** button
2. Badge changes to **"Running"** with a green color
3. **Click on the service card** to view logs in the right panel
4. Logs update automatically every 5 seconds

#### 2.3 Search Services

**Quick find services by name, path, command, or port:**

1. Use the **search bar** at the top
2. Type to search (real-time filtering)
3. Click **"Clear"** to reset

#### 2.4 Import from Workspace

**Batch import services with auto-detection:**

1. Click **"Import from Workspace"** button
2. **Select repositories** to import
3. Review auto-detected configuration:
   - Service name from folder name
   - Start command from package.json
   - Port from .env file
4. Click **"Import Selected"**

---

### Feature 3: Docker Management

**Prerequisites:** Docker must be installed and running.

#### 3.1 View Images

1. Click **"Docker"** in sidebar
2. See the **Images** tab
3. All local Docker images listed

#### 3.2 Build an Image

1. Click **"Build Image"**
2. Fill context path, Dockerfile name, image name, tag
3. Click **"Build"**
4. Watch real-time build progress

#### 3.3 Manage Containers

1. Switch to **"Containers"** tab
2. Start/stop/remove containers
3. View container logs

#### 3.4 Generate docker-compose.yml

1. Click **"Generate Compose"**
2. Select images to include
3. Configure ports and environment
4. Copy generated YAML

---

### Feature 4: Environment Variables Manager

**What it does:** Manage environment variables with secure AES-256 encryption.

#### 4.1 Create Profile

1. Click **"Environment"** in sidebar
2. Click **"Create Profile"**
3. Enter name and description
4. Click **"Create"**

#### 4.2 Add Variables

1. Select profile
2. Click **"Add Variable"**
3. Fill out key, value, description
4. Check **"Is Secret"** to encrypt
5. Click **"Add"**

#### 4.3 Search

- **Search profiles**: Use search bar above profile list
- **Search variables**: Use search bar above variable list
- Real-time filtering

#### 4.4 Copy in KEY=VALUE Format

1. Click **Copy** button next to variable
2. Paste anywhere (terminal, .env file)
3. Format: `KEY=value`

#### 4.5 Inline Editing

1. Click **Edit** button (pencil icon)
2. Update any field
3. Click **Save** (checkmark) or **Cancel** (X)

#### 4.6 Sync to Service .env Files

**Write profile variables directly to service .env files:**

1. Select profile
2. Click **"Sync to Service"**
3. **Smart matching** selects matching service by name
4. Click **"Sync"**
5. Variables written to `{service.repoPath}/.env`

---

### Feature 5: Hierarchical Workspaces

**What it does:** Organize development environments with workspace → snapshots structure.

**⚡ Key Concept: Workspace Scoping**

All resources are **workspace-scoped** for complete isolation:
- Services belong to workspaces
- Environment profiles belong to workspaces
- Notes/Wiki belong to workspaces
- Snapshots belong to workspaces

**Benefits:**
- ✅ Complete isolation between projects
- ✅ No naming conflicts
- ✅ Cascade deletion
- ✅ Active workspace pattern

#### 5.1 Create Workspace

1. Click **"Workspaces"** in sidebar
2. Click **"New Workspace"**
3. Fill name, description, folder path (optional), tags
4. Click **"Create"**

#### 5.2 Navigate Workspaces

**3-Level Navigation:**

**Level 1: Workspace List**
- All workspaces as cards
- Shows snapshot count, active status, tags

**Level 2: Workspace Detail**
- All snapshots under workspace
- Breadcrumb: "Workspaces > Workspace Name"

**Level 3: Snapshot Detail**
- Full snapshot details
- Running services, git branches
- Breadcrumb: "Workspaces > Workspace > Snapshot"

#### 5.3 Create Snapshot

1. Navigate to workspace
2. Click **"New Snapshot"** (manual)
   - OR **"Quick Snapshot"** (capture current state)
3. Fill details
4. Click **"Create"**

#### 5.4 Restore Snapshot

1. Navigate to snapshot detail
2. Review services and git branches
3. Click **"Restore"**
4. DevHub will:
   - Stop services not in snapshot
   - Start snapshot services
   - Switch git branches

---

### Feature 6: Wiki/Notes System

**What it does:** Markdown documentation with full-text search and bidirectional linking.

#### 6.1 Create Note

1. Click **"Wiki"** in sidebar
2. Click **"New Note"**
3. Fill title, category, tags, content
4. Click **"Save"**

#### 6.2 Use Templates

5 built-in templates:
- **Architecture**: System architecture docs
- **API Documentation**: API endpoint docs
- **Runbook**: Operational procedures
- **Troubleshooting**: Debug guides
- **Meeting Notes**: Meeting minutes

#### 6.3 Bidirectional Links

Use double brackets: `[[Note Name]]`

```markdown
# API Gateway

The gateway routes to [[User Service]] and [[Auth Service]].

See [[System Architecture]] for details.
```

Links become clickable in preview.
View **"Links"** and **"Backlinks"** sections.

#### 6.4 Search

1. Use search bar
2. Type keywords
3. Full-text search returns matching notes

#### 6.5 Filter

- Use **Category** dropdown
- Click tags to filter

---

## 🛠 Project Structure

**Shared Core Architecture:**

```
devhub/
├── packages/core/         # Shared business logic (NEW!)
│   ├── src/
│   │   ├── db/            # SQLite database & 7 migrations
│   │   └── services/      # All service managers
│   └── package.json
├── backend/               # Express API wrapper (web)
│   ├── src/routes/        # HTTP endpoints (thin layer)
│   └── package.json       # Depends on @devhub/core
├── frontend/              # React + Vite web UI
│   ├── src/components/
│   └── package.json
├── packages/vscode-extension/  # VSCode extension
│   ├── src/extension.ts
│   └── webview-ui/
└── shared/                # TypeScript types
```

**Architecture Benefits:**
- **85-90% code sharing** between web and VSCode
- **Single source of truth** for business logic
- **30% overhead** to maintain dual versions
- **DRY principle** - write once, use everywhere

---

## 🎨 Understanding the UI

### Sidebar Navigation

7 main sections:

1. **Dashboard** - Repository scanner with workspace integration
2. **Services** - Service manager with logs, search, and groups
3. **Workspaces** - Hierarchical workspace → snapshots management
4. **Docker** - Container and image management
5. **Environment** - Environment variables with encryption
6. **Wiki** - Documentation and notes system
7. **Database** - Backup, restore, and maintenance

---

## 🐛 Troubleshooting

### "Port 3000 already in use"

Change port in `frontend/vite.config.ts`:
```typescript
server: {
  port: 3001, // Change this
}
```

### "Port 5000 already in use"

Create `backend/.env`:
```
PORT=5001
```

Update `frontend/vite.config.ts` proxy:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:5001',
  }
}
```

### Services won't start

**Check:**
- Repository path exists and is correct
- Command is valid (try manually in terminal)
- You're in the right directory

### "Module not found" errors

Run:
```bash
npm install
```

### Logs not showing

- Logs only appear while service is running
- Click on service card to select it
- Wait 5 seconds for logs to refresh

---

## 📊 API Endpoints

### Core APIs

**Repository API**
- `GET /api/repos/scan?path=/path&depth=3` - Scan for repositories
- `POST /api/repos/analyze-batch` - Batch analyze repositories (performance)

**Services API**
- `GET /api/services` - List all services
- `POST /api/services` - Create service
- `POST /api/services/batch` - Batch create services (performance)
- `POST /api/services/:id/start` - Start service
- `POST /api/services/:id/stop` - Stop service
- `GET /api/services/:id/logs?lines=100` - Get logs

**Docker API**
- `GET /api/docker/images` - List images
- `POST /api/docker/images/build` - Build image (SSE stream)
- `GET /api/docker/containers` - List containers
- `POST /api/docker/containers/:id/start` - Start container

**Environment API**
- `GET /api/env/profiles` - List profiles
- `POST /api/env/variables` - Create variable
- `POST /api/env/profiles/:id/import` - Import .env file
- `POST /api/env/profiles/:id/apply/:serviceId` - Apply to service

**Workspaces API**
- `GET /api/workspaces` - List all workspaces
- `GET /api/workspaces/active` - Get active workspace
- `POST /api/workspaces/:id/snapshots` - Create snapshot
- `POST /api/workspaces/snapshots/:id/restore` - Restore snapshot

**Notes/Wiki API**
- `GET /api/notes` - List notes
- `GET /api/notes/search/:query` - Full-text search
- `GET /api/notes/:id/links` - Get linked notes

**Total: 70+ API endpoints** (including batch processing for performance)

---

## 🗺 Roadmap

### ✅ Completed (v2.0)

**v1.0 MVP:**
- Repository scanner with git status
- Service manager with process control
- Real-time logs viewer
- SQLite persistence
- Docker integration
- Environment variables manager with AES-256 encryption
- Wiki/notes system with full-text search
- Hierarchical workspace management with full resource scoping

**v2.0 Advanced Orchestration:**
- Service groups (organize and batch operations)
- Database management (backup, restore, maintenance)
- Edit service functionality

**VSCode Extension (v2.0):**
- ✅ Complete implementation (all 5 phases)
- ✅ 6 tree views (Dashboard, Services, Docker, Environment, Workspaces, Notes)
- ✅ React webview UI (6 tabs)
- ✅ 24 commands via command palette
- ✅ Edit services inline with pencil button
- ✅ Auto-create workspace when scanning repositories
- ✅ Import services from scanned repositories
- ✅ esbuild bundling (~16 MB .vsix)
- ✅ VSCode 1.108 (Electron 35) support
- ✅ Production ready

### 📅 Future Enhancements

Potential additions:
- Team collaboration features
- Cloud sync
- CI/CD integration
- Monitoring and APM
- Kubernetes support
- Advanced metrics dashboard

---

## 💡 Tips & Tricks

### Auto-Refresh

Services and logs auto-refresh:
- **Services**: Every 10 seconds
- **Logs**: Every 5 seconds

No manual refresh needed!

### Service Templates

Common patterns:
- `npm run dev` for Node.js apps
- `python manage.py runserver` for Django
- `go run main.go` for Go apps
- `docker-compose up` for Docker stacks

### Quick Testing

For quick testing without real services:

```bash
# Service that outputs then exits
echo "Test" && sleep 10

# Service that outputs continuously
while true; do echo "Tick: $(date)"; sleep 2; done

# Simple HTTP server
python3 -m http.server 8080
```

---

## 🤝 Contributing

Contributions welcome!

### Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Type check
npm run type-check

# Build
npm run build
```

---

## 📚 Documentation

- **CLAUDE.md** - Comprehensive development guide for Claude Code AI and developers
- **PROJECT_INDEX.md** - Project structure and codebase overview
- **TESTING.md** - E2E testing guide with Playwright
- **packages/core/README.md** - Shared core package documentation
- **packages/vscode-extension/README.md** - VSCode extension guide

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙋 Getting Help

**Issues?**
- Check the Troubleshooting section above
- Review this README for feature usage
- Open an issue on GitHub

**Questions?**
- How to use a feature? Check this README
- Architecture questions? Check Project Structure section or CLAUDE.md
- Bug reports? Open an issue with reproduction steps

---

## 🎉 You're Ready!

**Web App:**
1. `npm run dev`
2. Open http://localhost:3000
3. Try the Dashboard and Services

**VSCode Extension:**
1. Install from .vsix file
2. Open Command Palette
3. Run "DevHub: Open Dashboard"

**Have fun managing your microservices!** 🚀

---

Built with ❤️ using React, TypeScript, Express, and SQLite

🤖 Generated with [Claude Code](https://claude.com/claude-code)
