# DevHub - Developer Mission Control

**Tagline:** One dashboard to rule all your microservices

## 🎯 Product Vision

A desktop/web application that gives developers complete control over their local microservice ecosystem. Combines git management, Docker orchestration, environment configuration, and documentation in one unified interface.

### Target Market
- Backend/Full-stack developers working with microservices (3+ repos)
- Teams running complex local development environments
- Developers frustrated with juggling multiple terminals, Docker Desktop, and scattered documentation

### Problem We Solve
Managing multiple microservices locally is chaos:
- Which service is on what branch?
- What's running and on which port?
- Where are those environment variables?
- How do I start the entire ecosystem?
- Which Dockerfile am I using?

---

## 🚀 MVP v1.0 - Core Features ✅ COMPLETE

### 1. Repository Dashboard 📊 ✅ COMPLETE
**Status:** Implemented in v0.1, fully working

**What it does:**
- Scans root directory for all git repositories
- Displays real-time status for each repo

**Implemented Features:**
- ✅ Current branch
- ✅ Uncommitted changes count
- ✅ Last commit message & timestamp
- ✅ Dockerfile detection indicator
- ⏳ Pull/push status (ahead/behind remote) - Planned for v2.0
- ⏳ Quick actions: Open in VSCode, Open terminal - Planned for v2.0

---

### 2. Docker Management 🐳 ✅ COMPLETE (Priority 1)

**Status:** Fully implemented with dockerode integration

#### Image Management ✅
**Implemented Features:**
- ✅ Build images from Dockerfile (with real-time streaming)
- ✅ List all Docker images
- ✅ View image details (size, tags, created date)
- ✅ Remove images
- ✅ Run containers from images

#### Container Management ✅
**Implemented Features:**
- ✅ List all containers (running and stopped)
- ✅ Start/stop containers
- ✅ Remove containers
- ✅ View container logs
- ✅ Container status monitoring

#### Docker Compose ✅
**Implemented Features:**
- ✅ Generate docker-compose.yml from services
- ✅ Configure ports and environment variables
- ⏳ Visual editor - Planned for v2.0
- ⏳ Service dependency graph - Planned for v2.0
- ⏳ One-click compose up/down - Planned for v2.0

See [DOCKER_FEATURE.md](./DOCKER_FEATURE.md) for detailed documentation.

---

### 3. Environment Variables Manager 🔐 ✅ COMPLETE (Priority 2)

**Status:** Fully implemented with AES-256-GCM encryption

**Implemented Features:**
- ✅ Environment profiles (dev/staging/prod)
- ✅ Secure encrypted storage for sensitive values (AES-256-GCM)
- ✅ Per-service environment variables
- ✅ Secret masking in UI (shows as •••••)
- ✅ Import .env files
- ✅ Export to .env format
- ✅ Apply profiles to services
- ✅ Variable descriptions and metadata
- ⏳ Template system - Planned for v2.0
- ⏳ Validation (check for missing required vars) - Planned for v2.0

See [ENV_FEATURE.md](./ENV_FEATURE.md) for detailed documentation.

---

### 4. Service Manager 🚀 ✅ COMPLETE (v0.1)

**Status:** Implemented in v0.1, fully working

**Start services via:**
- ✅ Native commands (npm start, yarn dev, etc.)
- ✅ Custom start commands
- ⏳ Docker run integration - Planned for v2.0
- ⏳ Docker compose integration - Planned for v2.0

**Implemented Features:**
- ✅ Define custom start commands per service
- ✅ Port configuration
- ✅ Start/Stop individual services
- ✅ Live logs viewer (last 500 lines, tail -f style)
- ✅ Real-time log streaming
- ✅ Service status monitoring
- ✅ Environment variables per service
- ⏳ Service groups - Planned for v2.0
- ⏳ Health check endpoints - Planned for v2.0
- ⏳ Resource usage (CPU, memory) - Planned for v2.0
- ⏳ Port conflict detection - Planned for v2.0

---

### 5. Wiki/Notes System 📝 ✅ COMPLETE (Priority 4)

**Status:** Fully implemented with SQLite FTS5 full-text search

**Implemented Features:**
- ✅ Markdown-based note system with live preview
- ✅ Quick note creation
- ✅ List all notes with filtering
- ✅ Full-text search functionality (SQLite FTS5)
- ✅ Bidirectional linking with [[note-name]] syntax
- ✅ Links and backlinks display
- ✅ Categories and tags
- ✅ 5 built-in templates:
  - ✅ Architecture documentation
  - ✅ API documentation
  - ✅ Runbooks
  - ✅ Troubleshooting guides
  - ✅ Meeting notes
- ✅ GitHub Flavored Markdown support
- ⏳ Auto-save - Planned for v2.0
- ⏳ Architecture diagrams (Mermaid) - Planned for v2.0

See [WIKI_FEATURE.md](./WIKI_FEATURE.md) for detailed documentation.

---

### 6. Workspace Snapshots 💾 ✅ COMPLETE (Priority 3)

**Status:** Fully implemented with git integration

**Implemented Features:**
- ✅ Save current workspace state:
  - ✅ Which services are running
  - ✅ Current branches for all repos
  - ✅ Uncommitted changes detection
- ✅ One-click restore workspace
- ✅ Multiple saved workspaces
- ✅ Workspace tags and descriptions
- ✅ Capture current state on-demand
- ✅ Duplicate workspaces
- ✅ Export workspace configs
- ✅ Git branch switching on restore
- ⏳ Active environment profile - Planned for v2.0
- ⏳ Import workspace configs - Planned for v2.0

See [WORKSPACE_FEATURE.md](./WORKSPACE_FEATURE.md) for detailed documentation.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React with Vite (fast development, modern)
- **Styling:** Tailwind CSS (rapid UI development)
- **State Management:** Zustand or React Context
- **UI Components:** shadcn/ui or Headless UI
- **Code Editor:** Monaco Editor (for Dockerfile/docker-compose editing)
- **Terminal:** xterm.js (for logs viewer)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (local, zero-config)
- **ORM:** Better-sqlite3 or Drizzle
- **Process Management:** node-pty or execa
- **Docker SDK:** dockerode
- **Git Operations:** simple-git

### Desktop Wrapper (Phase 2)
- **Electron** or **Tauri** (for native desktop app)
- System tray integration
- Native notifications

### Development
- **Language:** TypeScript
- **Build:** Vite
- **Testing:** Vitest + React Testing Library
- **Linting:** ESLint + Prettier

---

## 📋 Development Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] Project setup
- [x] Repository scanner
- [x] Basic dashboard UI
- [x] Git status display
- [x] Simple service start/stop

### Phase 2: Docker Integration ✅ COMPLETE
- [x] Dockerfile detection
- [x] Docker image build
- [x] Docker-compose generation
- [x] Container management
- [x] Logs viewer

### Phase 3: Configuration ✅ COMPLETE
- [x] Environment variables manager
- [x] Service configuration
- [x] Port management
- [x] Workspace snapshots

### Phase 4: Polish & UX ✅ COMPLETE
- [x] Wiki/notes system
- [x] Search functionality
- [x] Error handling
- [ ] Performance optimization - Ongoing
- [ ] User onboarding - Planned for v2.0

### Phase 5: Desktop App 🚧 PLANNED (v2.0)
- [ ] Electron/Tauri wrapper
- [ ] System tray integration
- [ ] Auto-updates
- [ ] Native installers (Mac/Windows/Linux)
- [ ] Native notifications

---

## 💰 Monetization Strategy

### Free Tier
- Single user
- Up to 10 repositories
- Local storage only
- Core features

### Pro Tier ($10-15/month)
- Unlimited repositories
- Cloud workspace sync
- Team sharing
- Remote environment configs
- Priority support

### Team Tier ($50-100/month)
- Everything in Pro
- Team workspaces
- Shared configurations
- Role-based access
- Audit logs
- SSO integration

### Enterprise
- Self-hosted option
- Custom integrations
- Dedicated support
- SLA

---

## 🎯 Success Metrics (MVP)

### Usage Metrics
- Daily active users
- Repositories managed per user
- Services started via DevHub
- Workspaces created

### Engagement
- Time saved vs manual management
- Feature usage (which features are most used)
- User retention (7-day, 30-day)

### Conversion (Future)
- Free → Pro conversion rate
- Churn rate
- Customer lifetime value

---

## 🚧 Technical Challenges

1. **Cross-platform compatibility** - Ensure works on Mac, Linux, Windows
2. **Docker permissions** - Handle Docker socket permissions
3. **Process management** - Reliable start/stop of services
4. **Real-time updates** - Efficient polling/websockets for status
5. **Large log files** - Performance with streaming logs
6. **Security** - Encrypted storage for secrets

---

## 📦 MVP Deliverables ✅ COMPLETE

1. ✅ Working web application (React + Express)
2. ✅ Repository scanner and git integration
3. ✅ Docker management (build, run, compose)
4. ✅ Environment variable management with encryption
5. ✅ Service orchestration and process management
6. ✅ Wiki/notes system with full-text search
7. ✅ Workspace save/restore with git integration
8. ✅ Comprehensive documentation:
   - ✅ README.md (user guide)
   - ✅ CLAUDE.md (developer guide)
   - ✅ DOCKER_FEATURE.md
   - ✅ ENV_FEATURE.md
   - ✅ WORKSPACE_FEATURE.md
   - ✅ WIKI_FEATURE.md
9. ⏳ Demo video - Planned

---

## 🎨 UI/UX Inspiration

- **Railway.app** - Clean service management
- **Vercel Dashboard** - Modern, fast UI
- **Docker Desktop** - Container management (but better)
- **Obsidian** - Note-taking and linking
- **Linear** - Beautiful, performant UI

---

## 🔮 Future Features (Post-MVP)

### Service Manager Enhancements
- **Persist logs across app restarts** - Save service logs to database for historical review
  - Benefits: Review logs from services that crashed yesterday, survive backend restarts
  - Implementation: Add `service_logs` table with `service_id`, `logs` (JSON), `stopped_at`, `exit_code`
  - Load recent logs from database on app start
  - Keep log history per service (e.g., last 10 runs or last 7 days)
  - Current: Logs preserved until service restarts, but lost on backend restart

- **External terminal delegation** - Option to run services in native terminal windows (xterm, gnome-terminal, Terminal.app, etc.)
  - Benefits: Full terminal features, copy-paste, scrollback, native feel
  - Challenges: Cross-platform support (Mac/Linux/Windows), terminal detection
  - Use case: Developers who prefer seeing services in separate terminal windows
  - Implementation: Child process spawning with platform-specific terminal commands
  - Related: Option 2 from log preservation feature discussion

### Platform & Integrations
- **Cloud sync** - Sync configs across machines
- **Team collaboration** - Share workspaces
- **CI/CD integration** - Deploy from DevHub
- **Monitoring** - APM integration
- **Database managers** - Built-in DB clients
- **API testing** - Postman-like functionality
- **SSH tunnel management** - Connect to remote services
- **Kubernetes support** - Beyond just Docker
- **Plugin system** - Community extensions

---

## 📝 Notes

**Created:** 2025-10-26
**Last Updated:** 2025-10-29
**Status:** ✅ MVP v1.0.1 COMPLETE + TESTED
**Version:** 1.0.1

### MVP Completion Summary

All 4 priorities and 6 core features are now complete and tested:
- ✅ **Repository Dashboard** - Git status and monitoring
- ✅ **Service Manager** - Process orchestration and logs (1 bug fixed)
- ✅ **Docker Management** - Images, containers, and compose
- ✅ **Environment Variables** - Encrypted storage and profiles
- ✅ **Wiki/Notes** - Markdown docs with search and linking
- ✅ **Workspace Snapshots** - Save and restore dev environment with clean profile names

**Total Lines of Code:** ~7,200 (backend + frontend + docs)
**API Endpoints:** 63 (including workspace snapshots endpoints)
**Database Tables:** 6 (SQLite)
**Database Migrations:** 5 (automatic execution on startup)
**Feature Documentation:** Comprehensive guides in README, CLAUDE.md, and this doc
**Comprehensive Testing:** Completed 2025-10-29 (28 endpoints tested, 1 bug fixed)

---

**We built something developers actually want to use!** 🚀
