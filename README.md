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
- **Workspace Snapshots**: Save and restore your entire dev environment with one click

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
git checkout claude/continue-devhub-mvp-011CUVcBQCRuQu1yoTkCXSzY
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

---

### Feature 5: Workspace Snapshots

**What it does:** Save and restore your entire development environment state.

**How to test:**

#### 5.1 Capture Current State

1. Start a few services (from Services page)
2. Click **"Workspaces"** in the left sidebar
3. Click **"Capture Current State"** button
4. The current state modal shows:
   - Running services
   - Git branch for each repository
   - Uncommitted changes status
5. Click **"Save as Workspace"**
6. Fill out:
   - **Workspace Name**: `Feature A Development`
   - **Description**: `Working on feature A`
   - **Tags**: `backend,api` (comma-separated)
7. Click **"Create"**

#### 5.2 View Saved Workspaces

1. All saved workspaces appear in the list
2. Each workspace shows:
   - Name and description
   - Created/updated dates
   - Number of services
   - Tags

#### 5.3 Restore a Workspace

1. Click on a workspace card
2. Review the workspace details in the right panel:
   - List of services that will be started
   - Git branches that will be checked out
3. Click **"Restore Workspace"** button
4. DevHub will:
   - Stop any running services not in the snapshot
   - Start all services from the snapshot
   - Switch git branches (if repositories exist)
5. Your environment is now restored to that exact state!

#### 5.4 Manage Workspaces

- **Duplicate**: Create a copy of a workspace
- **Export**: Download workspace config as JSON
- **Delete**: Remove a workspace
- **Update**: Modify workspace details

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
3. **Workspaces** (✅ Working) - Save and restore workspace states
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
- `GET /api/workspaces` - List all workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/restore` - Restore workspace state
- `POST /api/workspaces/capture` - Capture current state
- `GET /api/workspaces/current` - Get current workspace state

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

**Total: 46 API endpoints**

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
- Service manager with process control
- Real-time logs viewer
- SQLite persistence
- **Docker integration** - Build images, manage containers, generate docker-compose
- **Environment variables manager** - Secure storage with AES-256 encryption
- **Wiki/notes system** - Markdown docs with full-text search and [[linking]]
- **Workspace snapshots** - Save and restore entire dev environment

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
- **Services**: Every 3 seconds
- **Logs**: Every 2 seconds

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
