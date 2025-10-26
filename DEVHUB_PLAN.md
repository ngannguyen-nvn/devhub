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

## 🚀 MVP v0.1 - Core Features

### 1. Repository Dashboard 📊
**What it does:**
- Scans root directory for all git repositories
- Displays real-time status for each repo

**Features:**
- Current branch
- Uncommitted changes count
- Last commit message & timestamp
- Pull/push status (ahead/behind remote)
- Dockerfile detection indicator
- Quick actions: Open in VSCode, Open terminal

---

### 2. Docker Management 🐳

#### Per-Repo Dockerfile Manager
**Features:**
- Detect Dockerfile in each repo
- View/edit Dockerfile with syntax highlighting
- Validate Dockerfile syntax
- Build image directly from UI
- Show built images (size, tags, age)
- Quick "Rebuild" button
- Build logs viewer

#### Ecosystem Docker Compose
**Features:**
- Auto-generate docker-compose.yml from detected services
- Visual editor for docker-compose with validation
- Service dependency graph (visual representation)
- One-click "Compose Up" entire ecosystem
- One-click "Compose Down"
- Container status dashboard
- Aggregated logs from all containers
- Port mapping overview

---

### 3. Environment Variables Manager 🔐

**Features:**
- Manage .env files per service
- Global environment variables (shared across services)
- Environment profiles (dev/staging/prod)
- Template system for common configs
- Secure storage for sensitive values (encrypted)
- Quick profile switching
- Validation (check for missing required vars)
- Copy env from one service to another

---

### 4. Service Manager 🚀

**Start services via:**
- Native commands (npm start, yarn dev, etc.)
- Docker run
- Docker compose

**Features:**
- Define custom start commands per service
- Port management & conflict detection
- Start/Stop individual services
- Start/Stop all services
- Service groups (e.g., "Auth Services", "Payment Stack")
- Live logs viewer (last 500 lines, tail -f style)
- Health check endpoints monitoring
- Process resource usage (CPU, memory)

---

### 5. Quick Wiki 📝

**Features:**
- Markdown-based note system
- Quick note creation
- List all notes
- Basic search functionality
- Link notes together with [[note-name]] syntax
- Auto-save
- Categories/tags
- Special templates:
  - Architecture diagrams
  - API documentation
  - Runbooks
  - Troubleshooting guides

---

### 6. Workspace Snapshots 💾

**Features:**
- Save current workspace state:
  - Which services are running
  - Current branches for all repos
  - Active environment profile
  - Open notes
- One-click restore workspace
- Multiple saved workspaces
- Share workspace configs (export/import JSON)

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

### Phase 1: Foundation (Week 1-2)
- [x] Project setup
- [ ] Repository scanner
- [ ] Basic dashboard UI
- [ ] Git status display
- [ ] Simple service start/stop

### Phase 2: Docker Integration (Week 3-4)
- [ ] Dockerfile detection
- [ ] Docker image build
- [ ] Docker-compose generation
- [ ] Container management
- [ ] Logs viewer

### Phase 3: Configuration (Week 5-6)
- [ ] Environment variables manager
- [ ] Service configuration
- [ ] Port management
- [ ] Workspace snapshots

### Phase 4: Polish & UX (Week 7-8)
- [ ] Wiki/notes system
- [ ] Search functionality
- [ ] Performance optimization
- [ ] Error handling
- [ ] User onboarding

### Phase 5: Desktop App (Week 9-10)
- [ ] Electron wrapper
- [ ] System tray
- [ ] Auto-updates
- [ ] Installers (Mac/Windows/Linux)

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

## 📦 MVP Deliverables

1. Working web application
2. Repository scanner and git integration
3. Docker management (build, run, compose)
4. Environment variable management
5. Service orchestration
6. Basic wiki/notes
7. Workspace save/restore
8. Documentation & README
9. Demo video

---

## 🎨 UI/UX Inspiration

- **Railway.app** - Clean service management
- **Vercel Dashboard** - Modern, fast UI
- **Docker Desktop** - Container management (but better)
- **Obsidian** - Note-taking and linking
- **Linear** - Beautiful, performant UI

---

## 🔮 Future Features (Post-MVP)

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
**Status:** Planning → Development
**Version:** 0.1.0-alpha

---

**Let's build something developers actually want to use!**
