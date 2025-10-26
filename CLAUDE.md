# CLAUDE.md - Development Guide for DevHub

**For Claude Code AI Assistant & Human Developers**

This document contains everything needed to understand and continue developing DevHub. Whether you're picking up where the previous session left off or starting fresh, this guide will get you up to speed.

---

## 📋 Project Overview

**DevHub** is a developer productivity tool for managing microservices ecosystems locally.

**Current Status:** MVP v1.0 - All 4 priorities complete ✅
**Tech Stack:** React + Vite (frontend), Express + TypeScript (backend), SQLite (database)
**Repository:** https://github.com/ngannguyen-nvn/devhub
**Branch:** `claude/continue-devhub-mvp-011CUVcBQCRuQu1yoTkCXSzY`

---

## 🎯 What's Been Built (v1.0)

### ✅ Working Features:

1. **Repository Dashboard**
   - Scans filesystem for git repositories
   - Displays: branch, uncommitted changes, last commit, Dockerfile detection
   - Auto-refresh every scan
   - Located: `frontend/src/components/Dashboard.tsx`

2. **Service Manager**
   - CRUD operations for services (create, read, update, delete)
   - Start/stop services (spawns Node child processes)
   - Real-time log viewer (last 500 lines)
   - Auto-refresh (services every 3s, logs every 2s)
   - SQLite persistence for service configs
   - Located: `frontend/src/components/Services.tsx`, `backend/src/services/serviceManager.ts`

3. **Backend API**
   - Express server on port 5000
   - Repository scanning endpoint
   - Services CRUD endpoints
   - Process management
   - Located: `backend/src/`

4. **Frontend UI**
   - React with Tailwind CSS
   - Sidebar navigation (6 sections)
   - Responsive layout
   - Located: `frontend/src/`

5. **Docker Management** (Priority 1)
   - Build Docker images from repositories
   - List and manage Docker images
   - Run, start, stop, remove containers
   - View container logs
   - Generate docker-compose.yml files
   - Located: `frontend/src/components/Docker.tsx`, `backend/src/services/dockerManager.ts`

6. **Environment Variables Manager** (Priority 2)
   - Create and manage environment profiles (dev/staging/prod)
   - Secure storage with AES-256-GCM encryption
   - Per-service environment variables
   - Import/export .env files
   - Secret masking in UI
   - Located: `frontend/src/components/Environment.tsx`, `backend/src/services/envManager.ts`

7. **Workspace Snapshots** (Priority 3)
   - Capture current workspace state (running services, git branches)
   - Save and restore workspace configurations
   - Tag workspaces for organization
   - Auto-restore on startup (optional)
   - Git branch tracking and switching
   - Located: `frontend/src/components/Workspaces.tsx`, `backend/src/services/workspaceManager.ts`

8. **Wiki/Notes System** (Priority 4)
   - Markdown-based documentation system
   - Full-text search with SQLite FTS5
   - Bidirectional linking with [[note-name]] syntax
   - 5 built-in templates (Architecture, API, Runbook, Troubleshooting, Meeting)
   - Category and tag organization
   - Live markdown preview
   - Located: `frontend/src/components/Wiki.tsx`, `backend/src/services/notesManager.ts`

---

## 🏗 Architecture Overview

### Monorepo Structure

```
devhub/
├── backend/              # Express API (port 5000)
│   ├── src/
│   │   ├── db/
│   │   │   └── index.ts           # SQLite database init
│   │   ├── routes/
│   │   │   ├── repos.ts           # Repository scanning endpoints
│   │   │   ├── services.ts        # Service management endpoints
│   │   │   ├── docker.ts          # Docker management endpoints
│   │   │   ├── env.ts             # Environment variables endpoints
│   │   │   ├── workspaces.ts      # Workspace snapshots endpoints
│   │   │   └── notes.ts           # Wiki/Notes endpoints
│   │   ├── services/
│   │   │   ├── repoScanner.ts     # Git repo scanner logic
│   │   │   ├── serviceManager.ts  # Process management logic
│   │   │   ├── dockerManager.ts   # Docker operations
│   │   │   ├── envManager.ts      # Environment variables & encryption
│   │   │   ├── workspaceManager.ts # Workspace snapshots
│   │   │   └── notesManager.ts    # Wiki/Notes system
│   │   └── index.ts               # Express app entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── devhub.db                  # SQLite database (gitignored)
│
├── frontend/             # React + Vite (port 3000)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx      # Repository scanner UI
│   │   │   ├── Services.tsx       # Service manager UI
│   │   │   ├── Docker.tsx         # Docker management UI
│   │   │   ├── Environment.tsx    # Environment variables UI
│   │   │   ├── Workspaces.tsx     # Workspace snapshots UI
│   │   │   ├── Wiki.tsx           # Wiki/Notes UI
│   │   │   └── Sidebar.tsx        # Navigation sidebar
│   │   ├── App.tsx                # Main app component
│   │   ├── main.tsx               # React entry point
│   │   └── index.css              # Tailwind styles
│   ├── vite.config.ts             # Vite config (includes proxy to backend)
│   ├── tailwind.config.js
│   └── package.json
│
├── shared/               # Shared TypeScript types
│   └── src/
│       └── index.ts                # Shared interfaces
│
├── package.json          # Root workspace config
├── README.md             # User-facing documentation
├── DEVHUB_PLAN.md        # Product roadmap
├── CLAUDE.md             # This file (dev guide)
├── DOCKER_FEATURE.md     # Docker management docs
├── ENV_FEATURE.md        # Environment variables docs
├── WORKSPACE_FEATURE.md  # Workspace snapshots docs
└── WIKI_FEATURE.md       # Wiki/Notes system docs
```

---

## 🔑 Key Implementation Details

### Database Schema (SQLite)

**Location:** `backend/devhub.db` (auto-created on first run)

**Tables:**

```sql
-- Services table
CREATE TABLE services (
  id TEXT PRIMARY KEY,              -- Format: service_{timestamp}_{random}
  name TEXT NOT NULL,
  repo_path TEXT NOT NULL,
  command TEXT NOT NULL,
  port INTEGER,
  env_vars TEXT,                    -- JSON stringified
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Environment profiles table (Priority 2)
CREATE TABLE env_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Environment variables table (Priority 2)
CREATE TABLE env_variables (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,              -- Encrypted with AES-256-GCM
  profile_id TEXT NOT NULL,
  service_id TEXT,
  is_secret INTEGER DEFAULT 0,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES env_profiles(id) ON DELETE CASCADE
);

-- Workspaces table (Priority 3)
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT NOT NULL,             -- JSON stringified snapshot data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notes table (Priority 4)
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT,                        -- JSON array
  template TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search for notes (Priority 4)
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title,
  content,
  content='notes',
  content_rowid='rowid'
);
```

### Process Management

**How services run:**
- Backend spawns child processes using Node's `child_process.spawn()`
- Each service gets its own process with unique PID
- Logs captured from stdout/stderr
- Processes tracked in-memory via `Map<serviceId, ChildProcess>`
- Process lifecycle: start → running → exit (or error)

**Important:** Processes are NOT persisted across backend restarts. If backend crashes, all running services stop.

### API Endpoints

**Repository Endpoints:**
```
GET /api/repos/scan?path=/home/user&depth=3
```
- Scans directory for git repos
- `depth`: how many levels deep to search (0-5)
- Returns array of Repository objects

**Service Endpoints:**
```
GET    /api/services              # List all services
POST   /api/services              # Create service
GET    /api/services/:id          # Get service details
PUT    /api/services/:id          # Update service
DELETE /api/services/:id          # Delete service (stops if running)
POST   /api/services/:id/start    # Start service
POST   /api/services/:id/stop     # Stop service
GET    /api/services/:id/logs     # Get logs (query: ?lines=100)
```

**Docker Endpoints (Priority 1):**
```
GET    /api/docker/images                        # List all images
POST   /api/docker/images/build                  # Build image (SSE stream)
DELETE /api/docker/images/:id                    # Remove image
POST   /api/docker/images/:id/run                # Run container from image
GET    /api/docker/containers                    # List all containers
POST   /api/docker/containers/:id/start          # Start container
POST   /api/docker/containers/:id/stop           # Stop container
DELETE /api/docker/containers/:id                # Remove container
GET    /api/docker/containers/:id/logs           # Get container logs
POST   /api/docker/compose/generate              # Generate docker-compose.yml
GET    /api/docker/meta/info                     # Get Docker daemon info
GET    /api/docker/meta/version                  # Get Docker version
```

**Environment Variables Endpoints (Priority 2):**
```
GET    /api/env/profiles                         # List all profiles
POST   /api/env/profiles                         # Create profile
GET    /api/env/profiles/:id                     # Get profile details
PUT    /api/env/profiles/:id                     # Update profile
DELETE /api/env/profiles/:id                     # Delete profile
GET    /api/env/profiles/:id/variables           # Get variables in profile
POST   /api/env/variables                        # Create variable
PUT    /api/env/variables/:id                    # Update variable
DELETE /api/env/variables/:id                    # Delete variable
POST   /api/env/profiles/:id/import              # Import .env file
GET    /api/env/profiles/:id/export              # Export to .env format
GET    /api/env/services/:serviceId/variables    # Get service variables
POST   /api/env/profiles/:id/apply/:serviceId    # Apply profile to service
```

**Workspace Endpoints (Priority 3):**
```
GET    /api/workspaces                           # List all workspaces
POST   /api/workspaces                           # Create workspace
GET    /api/workspaces/:id                       # Get workspace details
PUT    /api/workspaces/:id                       # Update workspace
DELETE /api/workspaces/:id                       # Delete workspace
POST   /api/workspaces/:id/restore               # Restore workspace state
POST   /api/workspaces/capture                   # Capture current state
GET    /api/workspaces/current                   # Get current workspace state
POST   /api/workspaces/:id/duplicate             # Duplicate workspace
POST   /api/workspaces/:id/export                # Export workspace config
```

**Notes/Wiki Endpoints (Priority 4):**
```
GET    /api/notes                                # List all notes (filter: ?category=X)
POST   /api/notes                                # Create note
GET    /api/notes/:id                            # Get note details
PUT    /api/notes/:id                            # Update note
DELETE /api/notes/:id                            # Delete note
GET    /api/notes/search/:query                  # Full-text search
GET    /api/notes/meta/categories                # Get all categories
GET    /api/notes/meta/tags                      # Get all tags
GET    /api/notes/meta/templates                 # Get note templates
GET    /api/notes/:id/links                      # Get linked notes
GET    /api/notes/:id/backlinks                  # Get backlinks
```

**Total API Endpoints:** 46

### Frontend State Management

**Current approach:** React `useState` + useEffect
**No global state library** (Zustand available in package.json but not used)

**Auto-refresh logic:**
- Services list: `setInterval(fetchServices, 3000)`
- Logs: `setInterval(fetchLogs, 2000)` when service selected
- Intervals cleaned up in `useEffect` return

### Vite Proxy Configuration

**Location:** `frontend/vite.config.ts`

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

All `/api/*` requests from frontend automatically proxy to backend.

---

## 🚀 Development Workflow

### Starting the App

```bash
# Install dependencies (first time only)
npm install

# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:backend    # Backend only (port 5000)
npm run dev:frontend   # Frontend only (port 3000)
```

**What happens:**
- Backend starts with `tsx watch` (auto-restart on changes)
- Frontend starts with Vite (HMR enabled)
- Database auto-initializes if not exists
- Both servers run concurrently

### Making Changes

**Backend changes:**
1. Edit files in `backend/src/`
2. tsx watch auto-restarts server
3. Test via frontend or curl

**Frontend changes:**
1. Edit files in `frontend/src/`
2. Vite HMR updates instantly
3. Browser refreshes automatically

**Type changes:**
1. Edit `shared/src/index.ts`
2. Rebuild shared: `npm run build -w shared`
3. Restart backend and frontend

### Building for Production

```bash
npm run build
```

Builds:
- `shared/dist/` - TypeScript declarations
- `backend/dist/` - Compiled JavaScript
- `frontend/dist/` - Static HTML/CSS/JS bundle

---

## 🛠 Common Tasks

### Task 1: Add a New API Endpoint

**Example: Add endpoint to get service statistics**

1. **Define types** in `shared/src/index.ts`:
```typescript
export interface ServiceStats {
  totalServices: number
  runningServices: number
  stoppedServices: number
}
```

2. **Add backend logic** in `backend/src/services/serviceManager.ts`:
```typescript
getStats(): ServiceStats {
  const all = this.getAllServices()
  const running = this.getRunningServices()
  return {
    totalServices: all.length,
    runningServices: running.length,
    stoppedServices: all.length - running.length,
  }
}
```

3. **Add route** in `backend/src/routes/services.ts`:
```typescript
router.get('/stats', (req, res) => {
  const stats = serviceManager.getStats()
  res.json({ success: true, stats })
})
```

4. **Call from frontend** in `frontend/src/components/Services.tsx`:
```typescript
const fetchStats = async () => {
  const response = await axios.get('/api/services/stats')
  setStats(response.data.stats)
}
```

### Task 2: Add a New UI Component

**Example: Add a statistics card**

1. **Create component** `frontend/src/components/StatsCard.tsx`:
```typescript
interface StatsCardProps {
  total: number
  running: number
  stopped: number
}

export default function StatsCard({ total, running, stopped }: StatsCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3>Service Statistics</h3>
      <p>Total: {total}</p>
      <p>Running: {running}</p>
      <p>Stopped: {stopped}</p>
    </div>
  )
}
```

2. **Import in parent** `frontend/src/components/Services.tsx`:
```typescript
import StatsCard from './StatsCard'

// In component:
<StatsCard total={stats.total} running={stats.running} stopped={stats.stopped} />
```

### Task 3: Add Database Migration

**Example: Add new column to services table**

Since we're using raw SQL, migrations are manual:

1. **Update schema** in `backend/src/db/index.ts`:
```typescript
db.exec(`
  ALTER TABLE services ADD COLUMN auto_restart INTEGER DEFAULT 0;
`)
```

2. **Update TypeScript types** in `shared/src/index.ts`:
```typescript
export interface Service {
  // ... existing fields
  autoRestart?: boolean
}
```

3. **Handle in service manager** - update CRUD operations

**Note:** SQLite doesn't support all ALTER TABLE operations. For complex changes, you may need to:
- Create new table with correct schema
- Copy data from old table
- Drop old table
- Rename new table

### Task 4: Add WebSocket for Real-Time Logs

Currently logs poll every 2 seconds. To make real-time:

1. **Install ws** (already in package.json):
```bash
npm install
```

2. **Set up WebSocket server** in `backend/src/index.ts`:
```typescript
import { WebSocketServer } from 'ws'
import { serviceManager } from './routes/services'

const wss = new WebSocketServer({ port: 5001 })

serviceManager.on('log', ({ serviceId, type, data }) => {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify({ serviceId, type, data }))
    }
  })
})
```

3. **Connect from frontend**:
```typescript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:5001')

  ws.onmessage = (event) => {
    const { serviceId, data } = JSON.parse(event.data)
    if (serviceId === selectedService) {
      setLogs(prev => [...prev, ...data])
    }
  }

  return () => ws.close()
}, [selectedService])
```

---

## 🎯 Next Features to Build

Based on `DEVHUB_PLAN.md`, here are the planned features:

### Priority 1: Docker Management

**What to build:**
- Detect Dockerfiles (already done in repo scanner)
- Build Docker images from UI
- View built images (list, size, tags)
- Run containers
- Stop/start/remove containers
- View container logs
- Generate docker-compose.yml

**Where to add:**
1. **Backend:** Create `backend/src/services/dockerManager.ts`
   - Use `dockerode` package (already installed)
   - Methods: buildImage(), listImages(), runContainer(), listContainers(), etc.
2. **Backend:** Create `backend/src/routes/docker.ts`
3. **Frontend:** Create `frontend/src/components/Docker.tsx`
4. **Frontend:** Update `App.tsx` to show Docker component

**Key library:** `dockerode`
```typescript
import Docker from 'dockerode'
const docker = new Docker()
```

### Priority 2: Environment Variables Manager

**What to build:**
- Read/write .env files for each service
- Global env vars (shared across services)
- Environment profiles (dev/staging/prod)
- Secure storage for secrets (encrypt in database)

**Where to add:**
1. **Backend:** Create `backend/src/services/envManager.ts`
2. **Backend:** Create `backend/src/routes/env.ts`
3. **Frontend:** Create `frontend/src/components/Environment.tsx`
4. **Database:** New table `env_vars` and `env_profiles`

### Priority 3: Workspace Snapshots

**What to build:**
- Save current state (which services running, current branches)
- Restore workspace
- List saved workspaces
- Export/import workspace configs

**Where to add:**
1. **Backend:** Update `backend/src/services/serviceManager.ts` with snapshot methods
2. **Backend:** Create `backend/src/routes/workspaces.ts`
3. **Frontend:** Add workspace UI to Services page or new page
4. **Database:** Use existing `workspaces` table

### Priority 4: Wiki/Notes

**What to build:**
- Markdown editor
- List notes
- Search notes
- Link notes with [[note-name]] syntax

**Where to add:**
1. **Backend:** Create `backend/src/services/wikiManager.ts`
2. **Backend:** Create `backend/src/routes/wiki.ts`
3. **Frontend:** Create `frontend/src/components/Wiki.tsx`
4. **Database:** New table `notes`

**Suggested libraries:**
- `react-markdown` for rendering
- `react-simplemde-editor` or `react-mde` for editing

---

## 🐛 Known Issues & Limitations

### Current Limitations:

1. **No authentication** - Anyone with access can control services
2. **No service groups** - Can't organize services
3. **No port conflict detection** - User must manually avoid conflicts
4. **Logs limited to 500 lines** - Older logs are discarded
5. **No log search/filter** - Hard to find specific logs in long outputs
6. **Services don't persist across backend restart** - Running services stop if backend crashes
7. **No multi-user support** - Single SQLite database for all users
8. **No remote access** - Must run on localhost

### Potential Bugs:

1. **Race condition in log updates** - Multiple rapid updates might cause UI flicker
2. **Memory leak in long-running services** - Logs array grows unbounded until service stops
3. **No graceful shutdown** - Killing backend doesn't stop child processes
4. **Windows path compatibility** - Repo scanner uses Unix-style paths

### Future Improvements:

1. Add service groups/tags
2. Add log search and filtering
3. Add service health checks
4. Add notification system
5. Add metrics (CPU, memory usage)
6. Add service dependencies (start order)
7. Add custom env vars per service in UI (not just in form)

---

## 💡 Development Tips

### Tip 1: Debugging Backend

**Use console.log liberally:**
```typescript
console.log('Starting service:', serviceId)
```

Logs appear in the terminal where you ran `npm run dev:backend`.

**Check database:**
```bash
sqlite3 backend/devhub.db
sqlite> SELECT * FROM services;
sqlite> .quit
```

### Tip 2: Debugging Frontend

**Use React DevTools:**
- Install React DevTools browser extension
- Inspect component state and props

**Check network requests:**
- Open browser DevTools → Network tab
- Filter by "Fetch/XHR"
- See all API requests/responses

### Tip 3: Testing API Endpoints

**Use curl:**
```bash
# List services
curl http://localhost:5000/api/services

# Create service
curl -X POST http://localhost:5000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "repoPath": "/home/user",
    "command": "echo hello"
  }'
```

### Tip 4: Hot Module Replacement (HMR)

Frontend supports HMR:
- Edit a component → Browser updates instantly
- State is preserved (usually)
- If state breaks, refresh manually

Backend uses `tsx watch`:
- Edit a file → Server restarts automatically
- All in-memory data is lost (including running services!)

### Tip 5: TypeScript Errors

**If you see type errors:**

1. Rebuild shared types:
```bash
npm run build -w shared
```

2. Restart TypeScript server (in VSCode):
- Cmd/Ctrl + Shift + P
- "TypeScript: Restart TS Server"

3. Check tsconfig.json paths are correct

---

## 📦 Dependencies Reference

### Backend Dependencies:

- **express** - Web framework
- **cors** - CORS middleware
- **dotenv** - Environment variables
- **simple-git** - Git operations
- **dockerode** - Docker SDK
- **better-sqlite3** - SQLite database
- **ws** - WebSocket server

### Frontend Dependencies:

- **react** - UI framework
- **react-dom** - React DOM renderer
- **react-router-dom** - Routing (not used yet)
- **zustand** - State management (not used yet)
- **axios** - HTTP client
- **lucide-react** - Icons
- **tailwindcss** - CSS framework

### Dev Dependencies:

- **typescript** - TypeScript compiler
- **tsx** - TypeScript executor (backend)
- **vite** - Build tool (frontend)
- **@vitejs/plugin-react** - React plugin for Vite

---

## 🔄 Git Workflow

### Branch Strategy:

- Main branch: `claude/create-private-repo-011CUTzeAJKig5m4aBqXWsUV`
- All development happens on this branch (for now)

### Committing Changes:

```bash
git add .
git commit -m "Add feature X

Detailed description of what was added/changed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Pushing Changes:

```bash
# Make sure remote is set correctly
git remote -v
# Should show: http://local_proxy@127.0.0.1:16047/git/ngannguyen-nvn/simple-express-ts

# Push
git push -u origin claude/create-private-repo-011CUTzeAJKig5m4aBqXWsUV
```

**Note:** The repository was renamed to `devhub`, but git still works with the old URL due to GitHub's redirect.

---

## 📝 Coding Conventions

### File Naming:

- Components: PascalCase (e.g., `Dashboard.tsx`)
- Services: camelCase (e.g., `serviceManager.ts`)
- Routes: camelCase (e.g., `repos.ts`)
- Types: PascalCase (e.g., `interface Service`)

### Code Style:

- **TypeScript:** Strict mode enabled
- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Yes
- **Trailing commas:** Yes in multiline

### Component Structure:

```typescript
// Imports
import { useState } from 'react'

// Types/Interfaces
interface Props {
  // ...
}

// Component
export default function ComponentName({ props }: Props) {
  // State
  const [state, setState] = useState()

  // Effects
  useEffect(() => {
    // ...
  }, [])

  // Handlers
  const handleClick = () => {
    // ...
  }

  // Render
  return (
    <div>
      {/* ... */}
    </div>
  )
}
```

### API Response Format:

Always return JSON with `success` field:

```typescript
// Success
res.json({
  success: true,
  data: { /* ... */ }
})

// Error
res.status(500).json({
  success: false,
  error: 'Error message'
})
```

---

## 🎓 Learning Resources

If you need to learn more about the tech stack:

- **React:** https://react.dev/learn
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Express:** https://expressjs.com/
- **Vite:** https://vitejs.dev/guide/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **SQLite:** https://www.sqlite.org/docs.html
- **simple-git:** https://github.com/steveukx/git-js
- **dockerode:** https://github.com/apocas/dockerode

---

## 🤝 Working with Claude Code

### How to Continue Development:

When starting a new Claude Code session:

1. **Read this file** (CLAUDE.md) to understand the project
2. **Read README.md** to understand user-facing features
3. **Read DEVHUB_PLAN.md** for product roadmap
4. **Check git status** to see current state
5. **Ask the user** what they want to build next

### Effective Prompts:

**Good prompts:**
- "Add Docker image building to the backend"
- "Create a UI for managing environment variables"
- "Fix the bug where logs don't show for short-running services"

**Bad prompts:**
- "Make it better" (too vague)
- "Add all the features" (too broad)

### Best Practices:

1. **Start servers before testing:**
   ```bash
   npm run dev
   ```

2. **Test your changes** before committing:
   - Try the feature in the browser
   - Check for console errors
   - Test edge cases

3. **Commit frequently** with descriptive messages

4. **Update this CLAUDE.md** if you make architectural changes

---

## 📞 Quick Reference

**Start app:**
```bash
npm run dev
```

**Frontend URL:**
```
http://localhost:3000
```

**Backend URL:**
```
http://localhost:5000
```

**Database location:**
```
backend/devhub.db
```

**Current branch:**
```
claude/continue-devhub-mvp-011CUVcBQCRuQu1yoTkCXSzY
```

**Repository:**
```
https://github.com/ngannguyen-nvn/devhub
```

---

## ✅ Checklist: Before Pushing Code

- [ ] Code compiles without TypeScript errors
- [ ] App starts successfully (`npm run dev`)
- [ ] Tested the feature in browser
- [ ] No console errors
- [ ] Committed with descriptive message
- [ ] Pushed to GitHub

---

## 🎉 You're Ready!

This document should give you everything needed to understand and continue developing DevHub. If something is unclear or missing, update this file and commit the changes!

**Happy coding!** 🚀

---

**Last Updated:** 2025-10-26
**Version:** v1.0
**Status:** MVP - All 4 priorities complete ✅

Features:
- ✅ Repository Dashboard & Service Manager
- ✅ Priority 1: Docker Management
- ✅ Priority 2: Environment Variables Manager
- ✅ Priority 3: Workspace Snapshots
- ✅ Priority 4: Wiki/Notes System

🤖 Generated with [Claude Code](https://claude.com/claude-code)
