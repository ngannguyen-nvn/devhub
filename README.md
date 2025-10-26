# DevHub - Developer Mission Control

**One dashboard to rule all your microservices**

DevHub is a powerful desktop application that helps developers manage their local microservices ecosystem. It combines git repository management, service orchestration, Docker management, environment configuration, and documentation in one unified interface.

---

## 🎯 What Does DevHub Do?

DevHub solves the chaos of managing multiple microservices locally:

- **Repository Dashboard**: See all your git repos, branches, and changes in one place
- **Service Manager**: Start/stop services with one click and view real-time logs
- **Docker Integration**: Build images, manage containers, and orchestrate with docker-compose *(coming soon)*
- **Environment Manager**: Centralized configuration for all your services *(coming soon)*
- **Wiki/Notes**: Document your architecture and APIs *(coming soon)*
- **Workspace Snapshots**: Save and restore your entire dev environment *(coming soon)*

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
git checkout claude/create-private-repo-011CUTzeAJKig5m4aBqXWsUV
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

## 🎨 Understanding the UI

### Sidebar Navigation

The left sidebar has 5 sections:

1. **Dashboard** (✅ Working) - Repository scanner
2. **Services** (✅ Working) - Service manager with logs
3. **Docker** (🚧 Coming Soon) - Container management
4. **Environment** (🚧 Coming Soon) - Env vars manager
5. **Wiki** (🚧 Coming Soon) - Documentation

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

---

## 🗺 Roadmap

See [DEVHUB_PLAN.md](./DEVHUB_PLAN.md) for the complete product roadmap.

### ✅ Completed (v0.1)

- Repository scanner
- Service manager with process control
- Real-time logs viewer
- SQLite persistence

### 🚧 In Progress

- Docker integration (build images, manage containers)
- Environment variables manager
- Wiki/notes system
- Workspace snapshots

### 📅 Planned

- Team collaboration features
- Cloud sync
- CI/CD integration
- Monitoring and APM
- Kubernetes support

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
