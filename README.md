# DevHub - Developer Mission Control

**One dashboard to rule all your microservices**

DevHub is a powerful desktop application that helps developers manage their local microservices ecosystem. It combines git repository management, service orchestration, Docker management, environment configuration, and documentation in one unified interface.

---

## 🎯 What Does DevHub Do?

DevHub solves the chaos of managing multiple microservices locally:

- **Repository Dashboard**: See all your git repos, branches, and changes in one place
- **Service Manager**: Start/stop services with one click and view real-time logs
- **Docker Integration**: Build images, manage containers, and generate docker-compose files
- **Environment Manager**: Secure environment variables with AES-256 encryption and profiles
- **Wiki/Notes**: Markdown-based documentation with full-text search and bidirectional linking
- **Hierarchical Workspaces**: Organize and manage development environments with workspace → snapshot hierarchy

---

## 🚀 Quick Start (Testing the Current Version)

### Prerequisites

Make sure you have these installed:

- **Node.js** >= 18.0.0 ([Download here](https://nodejs.org/))
- **npm** >= 9.0.0 (comes with Node.js)
- **Git** (to scan repositories)
- **Docker** (optional, for future Docker features)

### Step 1: Clone the Repository

```bash
git clone https://github.com/ngannguyen-nvn/devhub.git
cd devhub
git checkout claude/review-workspace-implementation-011CUWCRV4ibC76y9ZFg3Hef
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install dependencies for all three packages (frontend, backend, shared).

### Step 3: Start DevHub

```bash
npm run dev
```

This starts both the backend API and frontend UI:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

**That's it!** Open http://localhost:3000 in your browser to start using DevHub.

---

## 📖 How to Test DevHub - Step by Step

### Feature 1: Repository Dashboard

**What it does:** Scans your filesystem for git repositories and shows their status.

**How to test:**

1. **Open DevHub** at http://localhost:3000
2. You should see the **Dashboard** (it's the default view)
3. In the **scan path input field**, enter a directory path, for example:
   - `/home/user` (Linux/Mac)
   - `C:\Users\YourName` (Windows)
   - Or any folder where you have git repositories
4. Click the **"Scan"** button
5. **Wait a moment** - DevHub will search for all git repos in that directory

**What you should see:**

Each repository will display:
- Repository name
- Full path
- Current branch (e.g., `main`, `develop`)
- Uncommitted changes indicator (yellow badge if there are changes)
- Last commit message and author
- Dockerfile indicator (blue "Docker" badge if Dockerfile exists)

**Try this:**
- Scan different directories
- Navigate to one of your repos and make a change, then rescan to see the "Uncommitted changes" badge

#### 1.1 Save Repositories to Workspace

**What it does:** After scanning, you can save selected repositories to a workspace with optional .env file import.

**How to test:**

1. **Scan a folder** with repositories
2. **Select repositories** - All repos are selected by default, or click checkboxes to select specific ones
3. Click **"Save to Workspace"** button
4. **Choose workspace mode:**
   - **Create New**: Enter workspace name (auto-populated from folder name)
   - **Use Existing**: Select from existing workspaces
5. **Optional: Import .env files**
   - If any selected repos have .env files, you'll see a checkbox
   - Check to import .env files to environment profiles
   - Format: `"{SnapshotName} - {RepoName}"` (one profile per repo)
   - Example: "Scan - 1/27/2025 - Backend API"
6. Click **"Save"**

**What happens:**
- Creates/uses workspace
- Creates snapshot with selected repos
- (Optional) Creates environment profiles from .env files
- Automatically activates new workspaces

**Benefits:**
- One-click setup for entire project
- .env files automatically imported (opt-in)
- No variable conflicts between repos
- Clear organization with snapshot-prefixed profiles

---

### Feature 2: Service Manager

**What it does:** Lets you define, start, stop, and monitor services (any command-line program).

**How to test:**

#### 2.1 Add Your First Service

1. Click **"Services"** in the left sidebar
2. Click the **"Add Service"** button (blue button in top-right)
3. Fill out the form:
   - **Service Name**: `Test Echo Service`
   - **Repository Path**: `/home/user` (or any valid directory)
   - **Start Command**: `echo "Hello from DevHub!" && sleep 30`
   - **Port**: Leave empty (optional)
4. Click **"Add Service"**

#### 2.2 Start the Service

1. You should see your new service in the list with a "Stopped" badge
2. Click the **green "Start"** button
3. The badge should change to **"Running"** with a green color
4. You should see a PID (process ID) displayed

#### 2.3 View Logs

1. **Click on the service card** (anywhere on it)
2. Look at the **right panel** (dark terminal-style panel)
3. You should see the output: `Hello from DevHub!`
4. Logs update automatically every 2 seconds while the service is running

#### 2.4 Stop the Service

1. Click the **red "Stop"** button
2. The service status changes to "Stopped"
3. The logs stop updating

#### 2.5 Add a Real Service (Optional)

If you have a Node.js project, try this:

1. Click **"Add Service"** again
2. Fill out:
   - **Service Name**: `My Node App`
   - **Repository Path**: Path to your Node.js project (e.g., `/path/to/my-project`)
   - **Start Command**: `npm start` (or `npm run dev`)
   - **Port**: `3001` (or whatever port your app uses)
3. Click **"Add Service"**
4. Start it and watch the logs in real-time!

#### 2.6 Test Multiple Services

- Add 2-3 services
- Start them all at once
- Switch between services by clicking on their cards
- Each service has its own log viewer
- Try stopping and restarting services

#### 2.7 Import Services from Workspace

**What it does:** Automatically import services from repositories in the active workspace with auto-detected configuration.

**How to test:**

1. Make sure you have an **active workspace** with repositories
2. Click **"Import from Workspace"** button
3. **Select repositories** to import as services
4. Review auto-detected configuration:
   - **Service name**: From folder name
   - **Start command**: Detected from package.json (`npm start`, `npm run dev`, etc.)
   - **Port**: Detected from .env file (if `PORT=` exists)
5. Click **"Import Selected"**

**What happens:**
- Creates one service per selected repository
- Auto-detection saves time (no manual configuration)
- Skips repositories that are already imported (shows "Already added" badge)
- Shows toast notifications for success/skipped/failed imports

**Benefits:**
- Batch import multiple services at once
- No manual entry for common configurations
- Duplicate detection prevents re-adding services
- Quick setup for entire project

---

### Feature 3: Docker Management

**What it does:** Build Docker images, manage containers, and generate docker-compose files.

**Prerequisites:** Docker must be installed and running.

**How to test:**

#### 3.1 View Docker Images

1. Click **"Docker"** in the left sidebar
2. You should see the **Images** tab (default view)
3. All your local Docker images will be listed with:
   - Image name and tags
   - Size
   - Created date
   - Number of containers using it

#### 3.2 Build an Image

1. Click **"Build Image"** button
2. Fill out the form:
   - **Context Path**: Path to directory with Dockerfile (e.g., `/home/user/my-app`)
   - **Dockerfile Path**: `Dockerfile` (or custom name)
   - **Image Name**: `my-app`
   - **Image Tag**: `latest`
3. Click **"Build"**
4. Watch the build progress stream in real-time
5. New image appears in the list when complete

#### 3.3 Run a Container

1. Find an image in the list
2. Click **"Run"** button
3. Fill out the form:
   - **Container Name**: `my-app-container`
   - **Ports**: `8080:80` (hostPort:containerPort)
   - **Environment Variables**: `KEY=value` (one per line)
4. Click **"Run"**
5. Container starts and appears in Containers tab

#### 3.4 Manage Containers

1. Switch to **"Containers"** tab
2. See all containers (running and stopped)
3. For each container:
   - **Start**: Green play button (for stopped containers)
   - **Stop**: Red stop button (for running containers)
   - **View Logs**: Click "Logs" button to see container output
   - **Remove**: Trash icon to delete container

#### 3.5 Generate docker-compose.yml

1. Click **"Generate Compose"** button
2. Select multiple images to include
3. Configure ports and environment variables
4. Click **"Generate"**
5. Copy the generated docker-compose.yml content

---

### Feature 4: Environment Variables Manager

**What it does:** Manage environment variables across services with secure encrypted storage.

**How to test:**

#### 4.1 Create an Environment Profile

1. Click **"Environment"** in the left sidebar
2. Click **"Create Profile"** button
3. Fill out:
   - **Profile Name**: `Development`
   - **Description**: `Dev environment variables`
4. Click **"Create"**
5. Profile appears in the left panel

#### 4.2 Add Variables

1. Select a profile from the left panel
2. Click **"Add Variable"** in the center panel
3. Fill out:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://localhost:5432/mydb`
   - **Is Secret**: Check this box to encrypt and mask the value
   - **Description**: `Primary database connection`
4. Click **"Add"**
5. Variable appears in the list
6. Note: Secrets show as `•••••` in the UI

#### 4.3 Import from .env File

1. Select a profile
2. Click **"Import .env"** button
3. Paste your .env file content:
   ```
   NODE_ENV=development
   API_KEY=secret123
   PORT=3000
   ```
4. Click **"Import"**
5. All variables are added to the profile

#### 4.4 Export to .env

1. Select a profile with variables
2. Click **"Export"** button
3. Copy the generated .env format
4. Save to a file or use in your project

#### 4.5 Apply Profile to Service

1. Select a profile
2. In the right panel, see "Apply to Service" section
3. Select a service from dropdown
4. Click **"Apply"**
5. Environment variables are now available to that service when it runs

#### 4.6 Auto-Import from Dashboard (Recommended)

**What it does:** When saving repositories to a workspace from Dashboard, you can automatically import .env files with per-repository isolation.

**How it works:**

1. **Scan folder** in Dashboard
2. Select repos with .env files
3. Click **"Save to Workspace"**
4. **Check "Import .env files"** option
5. DevHub creates **one profile per repository**:
   - Profile name format: `"{SnapshotName} - {RepoName}"`
   - Example: "Scan - 1/27/2025 - Backend API"
   - Example: "Scan - 1/27/2025 - Frontend Web"

**Benefits of per-repo profiles:**

✅ **No variable conflicts** - Each repo gets its own profile (PORT=3000 vs PORT=4000)
✅ **Clear organization** - Easy to identify which profile belongs to which repo
✅ **Snapshot isolation** - Each snapshot creates its own set of profiles
✅ **History preserved** - Profiles persist at workspace level, never deleted
✅ **Easy management** - Filter/search by snapshot name or repo name

**Example:**

Snapshot 1: "Initial Setup" (Jan 27)
- Creates: "Initial Setup - Backend API" (PORT=3000, DB_HOST=localhost)
- Creates: "Initial Setup - Frontend Web" (PORT=4000, API_URL=...)

Snapshot 2: "Feature Branch" (Feb 5)
- Creates: "Feature Branch - Backend API" (PORT=3000, DB_HOST=staging)
- Creates: "Feature Branch - Payment Service" (PORT=5000, STRIPE_KEY=...)

When you restore Snapshot 1, all profiles are still visible, but you can clearly see which ones belong to "Initial Setup".

---

### Feature 5: Hierarchical Workspaces

**What it does:** Organize your development environments with a hierarchical workspace → snapshots structure. Each workspace can contain multiple snapshots, making it easy to manage different states of the same project.

**⚡ Key Concept: Workspace Scoping**

All resources in DevHub are **workspace-scoped** for complete isolation:

- **Services** belong to workspaces (not global)
- **Environment profiles** belong to workspaces
- **Notes/Wiki** belong to workspaces
- **Snapshots** belong to workspaces (child entities)

**Benefits:**
- ✅ **Complete isolation** - Switching workspaces shows only that workspace's resources
- ✅ **No naming conflicts** - Different projects can have services with same name
- ✅ **Organized by project** - Each workspace is self-contained
- ✅ **Cascade deletion** - Deleting workspace removes all its resources (services, profiles, notes, snapshots)
- ✅ **Active workspace** - One workspace is active at a time (services, env profiles, notes are filtered by active workspace)

**Example:**

```
Workspace: "E-commerce Backend"
├── Services: auth-api, payment-api, user-service
├── Env Profiles: "Initial Setup - Backend API", "Feature Branch - Payment Service"
├── Notes: API docs, architecture notes, troubleshooting guides
└── Snapshots: Initial Setup, Feature Branch, Production Ready

Workspace: "Mobile App"
├── Services: react-native, ios-simulator, android-emulator
├── Env Profiles: "Dev Build - Mobile App", "Staging Build - Mobile App"
├── Notes: Mobile API docs, deployment guide
└── Snapshots: Dev Build, Staging Build
```

When you switch from "E-commerce Backend" to "Mobile App", you see completely different services, profiles, and notes.

**How to test:**

#### 5.1 Create a Manual Workspace

1. Click **"Workspaces"** in the left sidebar
2. Click **"New Workspace"** button
3. Fill out:
   - **Workspace Name**: `Feature A Development`
   - **Description**: `Working on feature A`
   - **Folder Path**: `/path/to/project` (optional)
   - **Tags**: `backend,api` (comma-separated, optional)
4. Click **"Create"**
5. New workspace appears in the workspace list

#### 5.2 Navigate Workspaces

**Level 1: Workspace List**
1. All workspaces appear as cards showing:
   - Name and description
   - Snapshot count
   - Active status badge
   - Tags
2. Click on a workspace card to drill down

**Level 2: Workspace Detail (Snapshots List)**
1. See all snapshots under the selected workspace
2. Breadcrumb navigation: "Workspaces > Workspace Name"
3. Each snapshot shows:
   - Name and description
   - Number of services and repos
   - Created date
   - Tags
4. Click on a snapshot to view details

**Level 3: Snapshot Detail**
1. Full snapshot details:
   - Running services that were captured
   - Git branches for each repository
   - Uncommitted changes status
2. Breadcrumb navigation: "Workspaces > Workspace Name > Snapshot Name"
3. Actions: Export, Restore, Delete

#### 5.3 Scan Folder to Auto-Create Workspace

1. From workspace list, click **"Scan Folder"**
2. Enter folder path to scan
3. DevHub will:
   - Scan for git repositories
   - Auto-create a workspace (or use existing one for that folder)
   - Create a snapshot with all repos
4. Navigate into the workspace to see the snapshot

#### 5.4 Create Snapshot in a Workspace

1. Navigate to a workspace (Level 2)
2. Click **"New Snapshot"** to manually create
   - OR click **"Quick Snapshot"** to capture current state immediately
3. Fill out snapshot details (name, description, tags)
4. Snapshot appears in the workspace's snapshot list

#### 5.5 Restore a Snapshot

1. Navigate to snapshot detail (Level 3)
2. Review the snapshot details:
   - Services that will be started
   - Git branches that will be checked out
3. Click **"Restore"** button
4. DevHub will:
   - Stop any running services not in the snapshot
   - Start all services from the snapshot
   - Switch git branches (if repositories exist)
5. Your environment is restored to that exact state!

#### 5.6 Activate a Workspace

1. In workspace list (Level 1)
2. Click **"Activate"** button on any workspace
3. That workspace becomes the active workspace
4. New snapshots will be created under the active workspace by default

#### 5.7 Delete Workspace (Cascade)

1. In workspace list (Level 1)
2. Click **"Delete"** button on a workspace
3. Confirm the deletion
4. **Important**: Deleting a workspace will also delete ALL its snapshots
5. Workspace and all snapshots are removed

---

### Feature 6: Wiki/Notes System

**What it does:** Markdown-based documentation with full-text search and bidirectional linking.

**How to test:**

#### 6.1 Create Your First Note

1. Click **"Wiki"** in the left sidebar
2. Click **"New Note"** button (top-right)
3. Fill out:
   - **Title**: `API Documentation`
   - **Category**: `Architecture`
   - **Tags**: `api,backend` (comma-separated)
   - **Content**: Write markdown (see template options)
4. Click **"Save"**

#### 6.2 Use a Template

1. Click **"New Note"**
2. Click **"Use Template"** button
3. Browse 5 built-in templates:
   - **Architecture**: System architecture docs
   - **API Documentation**: API endpoint docs
   - **Runbook**: Operational procedures
   - **Troubleshooting**: Debug guides
   - **Meeting Notes**: Meeting minutes
4. Click on a template to apply it
5. Template content pre-fills the editor
6. Customize and save

#### 6.3 Add Bidirectional Links

1. In note content, use double brackets: `[[Note Name]]`
2. Example:
   ```markdown
   # API Gateway

   The gateway routes to [[User Service]] and [[Auth Service]].

   See [[System Architecture]] for details.
   ```
3. Save the note
4. Create the linked notes ("User Service", "Auth Service", etc.)
5. Links become clickable in preview
6. View **"Links"** section to see all forward links
7. View **"Backlinks"** section to see what links to this note

#### 6.4 Search Notes

1. Use the search bar at the top
2. Type keywords: `authentication`
3. Full-text search returns matching notes
4. Results show title and preview snippet
5. Click a result to open that note

#### 6.5 Filter by Category or Tags

1. Use **Category** dropdown to filter
2. Select "Architecture" to see only architecture docs
3. Tags appear as badges on each note
4. Click a tag to filter by that tag

#### 6.6 Edit and Preview

1. Toggle between **Editor** and **Preview** views
2. Editor shows raw markdown
3. Preview renders:
   - Formatted text
   - Code blocks with syntax highlighting
   - Tables
   - Lists
   - Clickable [[links]]
4. GitHub Flavored Markdown supported

---

## 🎨 Understanding the UI

### Sidebar Navigation

The left sidebar has 6 sections:

1. **Dashboard** (✅ Working) - Repository scanner
2. **Services** (✅ Working) - Service manager with logs
3. **Workspaces** (✅ Working) - Hierarchical workspace → snapshots management with 3-level navigation
4. **Docker** (✅ Working) - Container and image management
5. **Environment** (✅ Working) - Environment variables manager
6. **Wiki** (✅ Working) - Documentation and notes system

### Dashboard View

```
┌─────────────────────────────────────────────┐
│  [Scan Path Input]  [Scan Button]           │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │ Repository Name               [Docker]│  │
│  │ /path/to/repo                         │  │
│  │ • main branch  [Uncommitted changes] │  │
│  │ Last commit: "Fix bug in auth"       │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  [... more repos ...]                        │
└─────────────────────────────────────────────┘
```

### Services View

```
┌──────────────────────┬──────────────────────┐
│   Service List       │   Logs Viewer        │
├──────────────────────┼──────────────────────┤
│ ┌─────────────────┐  │                      │
│ │ Service Name    │  │  $ npm start         │
│ │ • Running  PID  │  │  > Starting...       │
│ │ npm start       │  │  > Server running    │
│ │ [Stop] [Delete] │  │  > Ready on :3000    │
│ └─────────────────┘  │                      │
│                      │  [... live logs ...]  │
│ ┌─────────────────┐  │                      │
│ │ Another Service │  │                      │
│ │ • Stopped       │  │                      │
│ └─────────────────┘  │                      │
└──────────────────────┴──────────────────────┘
```

---

## 🧪 Testing Scenarios

### Scenario 1: Developer with Multiple Projects

**Goal**: Monitor all your projects in one place

1. Use the Dashboard to scan your projects directory
2. See which projects have uncommitted changes
3. Identify which projects use Docker

### Scenario 2: Starting a Microservices Stack

**Goal**: Start all services for local development

1. Add each microservice as a service:
   - Auth Service (port 3001)
   - API Gateway (port 3000)
   - Database Migration (`npm run migrate`)
   - Background Worker (`npm run worker`)
2. Start them all
3. Monitor their logs in one place
4. Quickly stop everything when done

### Scenario 3: Debugging a Service

**Goal**: Watch logs in real-time while testing

1. Add your service with debug logging enabled
2. Start the service
3. Click on it to view logs
4. Make requests to your service
5. Watch logs update in real-time
6. Spot errors immediately

---

## 🛠 Advanced Usage

### Running Frontend and Backend Separately

```bash
# Terminal 1 - Backend only
npm run dev:backend

# Terminal 2 - Frontend only
npm run dev:frontend
```

### Building for Production

```bash
npm run build
```

This builds all packages into `dist/` directories.

### Project Structure

```
devhub/
├── backend/          # Express API server
│   ├── src/
│   │   ├── db/       # SQLite database
│   │   ├── routes/   # API endpoints
│   │   └── services/ # Business logic
│   └── package.json
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   └── App.tsx
│   └── package.json
├── shared/           # Shared TypeScript types
│   └── src/
└── package.json      # Root package (workspace)
```

---

## 🐛 Troubleshooting

### "Port 3000 already in use"

Another app is using port 3000. Either:
- Stop the other app
- Or change the port in `frontend/vite.config.ts`:
  ```typescript
  server: {
    port: 3001, // Change this
  }
  ```

### "Port 5000 already in use"

Another app is using port 5000 for the backend. Change it:
1. Create `backend/.env`:
   ```
   PORT=5001
   ```
2. Update `frontend/vite.config.ts` proxy:
   ```typescript
   proxy: {
     '/api': {
       target: 'http://localhost:5001', // Update this
     }
   }
   ```

### Services won't start

**Check:**
- The repository path exists and is correct
- The command is valid (try running it manually in terminal)
- You're in the right directory

### "Module not found" errors

Run `npm install` again:
```bash
npm install
```

### Logs not showing

- Logs only appear while service is running
- Click on the service card to select it
- Wait 2 seconds for logs to refresh
- Some commands may not output to stdout (try adding `echo` statements)

---

## 📊 API Endpoints (for developers)

### Repository API
- `GET /api/repos/scan?path=/home/user&depth=3` - Scan for repositories

### Services API
- `GET /api/services` - List all services
- `POST /api/services` - Create a service
- `GET /api/services/:id` - Get service details
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `POST /api/services/:id/start` - Start service
- `POST /api/services/:id/stop` - Stop service
- `GET /api/services/:id/logs?lines=100` - Get service logs

### Docker API
- `GET /api/docker/images` - List all images
- `POST /api/docker/images/build` - Build image (SSE stream)
- `DELETE /api/docker/images/:id` - Remove image
- `POST /api/docker/images/:id/run` - Run container from image
- `GET /api/docker/containers` - List all containers
- `POST /api/docker/containers/:id/start` - Start container
- `POST /api/docker/containers/:id/stop` - Stop container
- `DELETE /api/docker/containers/:id` - Remove container
- `GET /api/docker/containers/:id/logs` - Get container logs
- `POST /api/docker/compose/generate` - Generate docker-compose.yml

### Environment Variables API
- `GET /api/env/profiles` - List all profiles
- `POST /api/env/profiles` - Create profile
- `GET /api/env/profiles/:id` - Get profile details
- `PUT /api/env/profiles/:id` - Update profile
- `DELETE /api/env/profiles/:id` - Delete profile
- `GET /api/env/profiles/:id/variables` - Get variables in profile
- `POST /api/env/variables` - Create variable
- `PUT /api/env/variables/:id` - Update variable
- `DELETE /api/env/variables/:id` - Delete variable
- `POST /api/env/profiles/:id/import` - Import .env file
- `GET /api/env/profiles/:id/export` - Export to .env format
- `POST /api/env/profiles/:id/apply/:serviceId` - Apply profile to service

### Workspaces API

**Workspace Endpoints:**
- `GET /api/workspaces` - List all workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/active` - Get active workspace
- `GET /api/workspaces/:workspaceId` - Get workspace details
- `PUT /api/workspaces/:workspaceId` - Update workspace
- `DELETE /api/workspaces/:workspaceId` - Delete workspace (cascade deletes all snapshots)
- `POST /api/workspaces/:workspaceId/activate` - Activate workspace
- `GET /api/workspaces/:workspaceId/snapshots` - Get snapshots for workspace
- `POST /api/workspaces/:workspaceId/snapshots` - Create snapshot in workspace
- `POST /api/workspaces/:workspaceId/scan` - Scan folder and create snapshot in workspace

**Snapshot Endpoints:**
- `GET /api/workspaces/snapshots` - List all snapshots
- `POST /api/workspaces/snapshots` - Create snapshot (hybrid: auto or manual workspace)
- `POST /api/workspaces/snapshots/quick` - Quick snapshot (capture current state)
- `POST /api/workspaces/snapshots/scan` - Scan folder and create snapshot (auto-creates workspace)
- `GET /api/workspaces/snapshots/:snapshotId` - Get snapshot details
- `PUT /api/workspaces/snapshots/:snapshotId` - Update snapshot
- `DELETE /api/workspaces/snapshots/:snapshotId` - Delete snapshot
- `POST /api/workspaces/snapshots/:snapshotId/restore` - Restore snapshot state
- `GET /api/workspaces/snapshots/:snapshotId/export` - Export snapshot config

### Notes/Wiki API
- `GET /api/notes` - List all notes (filter: ?category=X)
- `POST /api/notes` - Create note
- `GET /api/notes/:id` - Get note details
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/notes/search/:query` - Full-text search
- `GET /api/notes/meta/categories` - Get all categories
- `GET /api/notes/meta/tags` - Get all tags
- `GET /api/notes/meta/templates` - Get note templates
- `GET /api/notes/:id/links` - Get linked notes
- `GET /api/notes/:id/backlinks` - Get backlinks

**Total: 59 API endpoints** (Workspace system expanded with hierarchical management)

See feature-specific documentation for detailed API usage:
- [DOCKER_FEATURE.md](./DOCKER_FEATURE.md)
- [ENV_FEATURE.md](./ENV_FEATURE.md)
- [WORKSPACE_FEATURE.md](./WORKSPACE_FEATURE.md)
- [WIKI_FEATURE.md](./WIKI_FEATURE.md)

---

## 🗺 Roadmap

See [DEVHUB_PLAN.md](./DEVHUB_PLAN.md) for the complete product roadmap.

### ✅ Completed (v1.0) - MVP Complete!

- Repository scanner with git status
- **Dashboard enhancements:**
  - Checkbox selection for repositories
  - "Save to Workspace" with selected repos
  - Auto-populate workspace names from folder paths
  - SessionStorage for last scan path
  - Optional .env import when saving to workspace
  - Auto-activate newly created workspaces
- Service manager with process control
  - **"Import from Workspace"** - Batch import services with auto-detection
  - Auto-detect service name, start command, and port from package.json/.env
  - Duplicate service detection with "Already added" badges
  - Increased auto-refresh intervals (10s services, 5s logs)
- Real-time logs viewer
- SQLite persistence
- **Docker integration** - Build images, manage containers, generate docker-compose
- **Environment variables manager** - Secure storage with AES-256 encryption
  - **Per-repository profiles** - One profile per repo for complete isolation
  - Profile naming: `"{SnapshotName} - {RepoName}"`
  - Auto-import .env files from Dashboard (opt-in)
  - No variable conflicts between repos
  - Snapshot-prefixed profiles for clear organization
- **Wiki/notes system** - Markdown docs with full-text search and [[linking]]
- **Hierarchical workspace management** - Organize environments with workspace → snapshots structure
  - Database migration system with automatic execution (2 migrations)
  - Hybrid workspace creation (auto from folder scan + manual)
  - **Full workspace scoping** - All resources (services, env profiles, notes) belong to workspaces
  - Complete isolation between workspaces
  - 3-level navigation UI with breadcrumb & workspace switcher
  - Cascade deletion (workspace → snapshots → all resources)
  - Active workspace pattern

### 📅 Planned (v2.0)

- Team collaboration features
- Cloud sync
- CI/CD integration
- Monitoring and APM
- Kubernetes support
- Service dependencies and startup order
- Metrics dashboard (CPU/memory usage)
- Service health checks

---

## 💡 Tips & Tricks

### Tip 1: Auto-Refresh

The dashboard and services auto-refresh:
- **Services**: Every 10 seconds
- **Logs**: Every 5 seconds

No need to manually refresh!

### Tip 2: Service Templates

Create common service templates:
- `npm run dev` for Node.js apps
- `python manage.py runserver` for Django
- `go run main.go` for Go apps
- `docker-compose up` for Docker stacks

### Tip 3: Long-Running Services

For services that run indefinitely (like web servers):
- They'll stay running until you stop them
- Logs are kept (last 500 lines)
- Survives browser refresh (backend keeps running)

### Tip 4: Quick Testing

For quick testing without real services, use:
```bash
# Service that outputs then exits
echo "Test" && sleep 10

# Service that outputs continuously
while true; do echo "Tick: $(date)"; sleep 2; done

# Service that simulates a web server
python3 -m http.server 8080
```

---

## 🤝 Contributing

This is currently a solo project but contributions are welcome!

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

## 📄 License

MIT License - See LICENSE file for details

---

## 🙋 Getting Help

**Issues?**
- Check the Troubleshooting section above
- Review the [DEVHUB_PLAN.md](./DEVHUB_PLAN.md) for feature status
- Open an issue on GitHub

**Questions?**
- Is it about how to use a feature? Check this README
- Is it about the architecture? Check the Project Structure section
- Is it a bug? Open an issue with reproduction steps

---

## 🎉 You're Ready!

Now that you understand how DevHub works:

1. **Start the app**: `npm run dev`
2. **Open your browser**: http://localhost:3000
3. **Try the Dashboard**: Scan for repositories
4. **Try Services**: Add a service and see it run

**Have fun managing your microservices!** 🚀

---

Built with ❤️ using React, TypeScript, Express, and SQLite

🤖 Generated with [Claude Code](https://claude.com/claude-code)
