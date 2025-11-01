# DevHub v2.0+ Roadmap - Intelligent Orchestration

**Created:** 2025-10-29
**Status:** Planning Phase
**Timeline Strategy:** Aggressive delivery

---

## 🎯 Vision

Transform DevHub from a service manager into an **intelligent orchestration platform** that makes managing complex microservices ecosystems effortless.

**The "Wow" Moment:**
> Scan folder → Auto-detect frameworks → Apply templates → Define dependencies → Click "Start Project" → Everything starts in correct order, waits for health checks, handles port conflicts automatically, and keeps all logs forever.

---

## 📊 Feature Categories Overview

| Category | Features | Priority |
|----------|----------|----------|
| 🧠 Service Orchestration | Dependencies, Health Checks, Auto-Restart | Critical |
| 📊 Resource Management | CPU/Memory Monitoring, Port Conflicts | High |
| ⚡ Developer Productivity | Templates, Groups, Shared Env Vars | High |
| 💾 Data Persistence | Log History, Service Timeline | High |
| 🔌 Integrations | Git Operations, HTTP Client, Database Mgmt | Medium |
| ✨ UX Polish | WebSockets, Dependency Graph, Terminal | Medium |

---

## 🚀 v2.0 - "Intelligent Orchestration" (8-10 weeks)

**Theme:** Make DevHub smart and reduce manual work

**Status:** 🟡 Planning
**Target:** Q1 2025
**Timeline:** Aggressive (8-10 weeks)

### Must-Have Features (Core v2.0)

#### 1. Service Dependencies & Startup Order ⭐⭐⭐⭐⭐
**Priority:** CRITICAL
**Effort:** 3 weeks
**Status:** Not Started

**Problem:**
Services don't know about each other. Users manually start services in correct order.

**Solution:**
```typescript
interface ServiceDependency {
  serviceId: string
  dependsOn: string[]  // Array of service IDs
  waitForHealth: boolean  // Wait for health check before starting dependents
  startupDelay?: number  // Optional delay in ms
}
```

**Implementation:**
- New table: `service_dependencies`
- New algorithm: Topological sort for startup order
- New state machine: stopped → queued → starting → healthy → running
- New UI: Visual dependency graph with drag-and-drop
- New action: "Start Project" (starts all services in correct order)

**Benefits:**
- ✅ One-click project startup
- ✅ Automatic orchestration
- ✅ Prevents startup failures from missing dependencies
- ✅ Handles complex dependency graphs

**Acceptance Criteria:**
- [ ] Can define dependencies between services
- [ ] Topological sort correctly orders startup
- [ ] Services wait for dependencies to be healthy before starting
- [ ] Circular dependencies are detected and reported
- [ ] "Start Project" button starts all services in correct order
- [ ] UI shows startup progress (queued, starting, healthy)

---

#### 2. Service Health Checks ⭐⭐⭐⭐⭐
**Priority:** CRITICAL
**Effort:** 2 weeks
**Status:** Not Started

**Problem:**
"Running" doesn't mean "working". Can't tell if service is actually healthy.

**Solution:**
```typescript
interface HealthCheck {
  type: 'http' | 'tcp' | 'command'

  // For HTTP
  endpoint?: string  // e.g., '/health', '/api/ping'
  expectedStatus?: number  // Default 200
  expectedBody?: string  // Optional body check

  // For TCP
  port?: number

  // For command
  command?: string  // e.g., 'curl localhost:3000'

  interval: number  // Check every N seconds
  timeout: number  // Timeout in ms
  retries: number  // How many failures before unhealthy
}
```

**Implementation:**
- New states: healthy, unhealthy, degraded
- New UI: Health status badges (green/yellow/red)
- New feature: Configurable health checks per service
- New feature: Health check history/logs
- HTTP health checks with configurable endpoints
- TCP port checks
- Command-based checks (custom scripts)

**Benefits:**
- ✅ Know actual service status
- ✅ Catch failures immediately
- ✅ Enable auto-healing
- ✅ Required for dependency startup

**Acceptance Criteria:**
- [ ] HTTP health checks work (configurable endpoint, status, body)
- [ ] TCP health checks work (port connectivity)
- [ ] Command health checks work (exit code 0 = healthy)
- [ ] Health status updates in UI (real-time)
- [ ] Health check failures are logged
- [ ] Configurable interval, timeout, retries
- [ ] Unhealthy services trigger notifications

---

#### 3. Port Conflict Detection & Auto-Assignment ⭐⭐⭐⭐⭐
**Priority:** HIGH (Quick Win)
**Effort:** 1 week
**Status:** Not Started

**Problem:**
Port conflicts are common and frustrating. No detection or auto-fix.

**Solution:**
```typescript
interface PortManagement {
  checkBeforeStart: boolean  // Check if port is available
  autoAssign: boolean  // Auto-assign if port is taken
  portRange: [number, number]  // Range for auto-assignment (3000-3999)
  updateEnvVars: boolean  // Update PORT env var with assigned port
}
```

**Implementation:**
- New check: netstat/lsof port scanning before service start
- New algorithm: Find next available port in range
- New UI: Port conflict warnings with suggestions
- New feature: "Fix port conflicts" button
- New feature: Port usage dashboard (which ports are used)
- Auto-update environment variables with assigned port

**Benefits:**
- ✅ No more port conflict errors
- ✅ Faster service startup
- ✅ Automatic problem resolution

**Acceptance Criteria:**
- [ ] Detect port conflicts before service starts
- [ ] Warn user when port is already in use
- [ ] Auto-assign next available port (optional)
- [ ] Update service PORT env var with assigned port
- [ ] Show port usage dashboard
- [ ] Handle platform differences (Windows/Mac/Linux)

---

#### 4. Service Templates & Presets ⭐⭐⭐⭐⭐
**Priority:** HIGH
**Effort:** 2 weeks
**Status:** Not Started

**Problem:**
Setting up services is repetitive. No built-in configurations.

**Solution:**
```typescript
interface ServiceTemplate {
  id: string
  name: string  // e.g., "Next.js App"
  description: string
  icon: string
  language: 'nodejs' | 'python' | 'go' | 'ruby' | 'java'
  framework?: string  // 'express', 'nextjs', 'django', 'flask'

  defaultCommand: string  // e.g., 'npm run dev'
  defaultPort: number
  defaultEnvVars: Record<string, string>
  healthCheck?: HealthCheck

  detectFiles: string[]  // Auto-detect based on files (package.json, requirements.txt)
}
```

**Built-in Templates:**
- Node.js: Express, Nest.js, Next.js, React, Vue, Angular
- Python: Django, Flask, FastAPI
- Go: Standard, Gin, Echo
- Ruby: Rails, Sinatra
- Java: Spring Boot
- Databases: PostgreSQL, MySQL, MongoDB, Redis

**Implementation:**
- New table: `service_templates`
- New UI: Template gallery with search and filtering
- New feature: Auto-detect framework from repository files
- New feature: Apply template to service (one-click setup)
- New feature: Custom user templates (save current config as template)
- New feature: Template marketplace (future)

**Benefits:**
- ✅ 10x faster service setup
- ✅ Best practices baked in
- ✅ Consistent configuration
- ✅ Lower barrier to entry

**Acceptance Criteria:**
- [ ] 15+ built-in templates for common frameworks
- [ ] Template gallery UI with icons and descriptions
- [ ] Auto-detect framework from package.json, requirements.txt, etc.
- [ ] Apply template button pre-fills service configuration
- [ ] Custom template creation (save as template)
- [ ] Template includes health check configuration
- [ ] Search and filter templates

---

#### 5. Log Persistence & Historical View ⭐⭐⭐⭐⭐
**Priority:** HIGH (Frequently Requested)
**Effort:** 2 weeks
**Status:** Not Started

**Problem:**
Logs disappear on service restart or backend restart. Can't debug historical issues.

**Solution:**
```typescript
interface ServiceLogSession {
  sessionId: string
  serviceId: string
  startedAt: Date
  stoppedAt: Date
  exitCode: number
  exitReason: string
  logsStored: number  // Number of log lines
}
```

**Implementation:**
- New tables: `service_log_sessions`, `service_logs`
- Schema: (session_id, timestamp, level, message)
- New UI: Session history dropdown (view previous runs)
- New UI: Log viewer with filtering (level, timestamp, search)
- New feature: Export logs to file (JSON, text)
- New feature: Auto-cleanup old logs (configurable: last 7 days or 100MB)
- New feature: Log levels (INFO, WARN, ERROR) with color coding
- New feature: Full-text search across all logs

**Benefits:**
- ✅ Debug historical issues
- ✅ Survive backend restarts
- ✅ Professional development tool

**Acceptance Criteria:**
- [ ] Logs persist to database on service output
- [ ] Logs survive backend restarts
- [ ] Session history shows previous runs
- [ ] Can switch between current and historical sessions
- [ ] Filter logs by level, timestamp, keyword
- [ ] Export logs to file
- [ ] Auto-cleanup with configurable retention
- [ ] Full-text search works across all sessions
- [ ] Performance: Handle 10,000+ log lines per session

---

### Should-Have Features (If Time Permits)

#### 6. Service Groups & Bulk Operations ⭐⭐⭐⭐
**Priority:** HIGH
**Effort:** 1-2 weeks

**Implementation:**
```typescript
interface ServiceGroup {
  id: string
  name: string
  description: string
  color: string  // For UI visualization
  icon: string
  serviceIds: string[]
  startupOrder?: string[]  // Optional override
}
```

- New table: `service_groups`, `service_group_members`
- New UI: Drag-and-drop grouping interface
- New actions: Start Group, Stop Group, Restart Group
- New feature: Group health status rollup

**Acceptance Criteria:**
- [ ] Create and manage service groups
- [ ] Drag-and-drop services into groups
- [ ] Start/stop entire groups with one click
- [ ] Group health status (all healthy, some unhealthy, all down)
- [ ] Color-coded groups in UI

---

#### 7. Auto-Restart & Healing ⭐⭐⭐⭐
**Priority:** HIGH
**Effort:** 1 week

**Implementation:**
```typescript
interface AutoRestartConfig {
  enabled: boolean
  maxRetries: number  // Max restart attempts
  backoffStrategy: 'immediate' | 'exponential' | 'fixed'
  backoffDelay: number  // Base delay in ms
  resetAfter: number  // Reset retry count after N seconds
}
```

- Detect crashes and exit codes
- Implement restart with exponential backoff
- New UI: Restart history and statistics
- New notification: Alert on repeated failures

**Acceptance Criteria:**
- [ ] Auto-restart on crash (exit code != 0)
- [ ] Configurable max retries
- [ ] Exponential backoff between retries
- [ ] Reset retry count after stable run
- [ ] Show restart history in UI
- [ ] Alert on repeated failures

---

#### 8. Resource Monitoring (CPU/Memory) ⭐⭐⭐⭐
**Priority:** HIGH
**Effort:** 2 weeks

**Implementation:**
```typescript
interface ResourceMetrics {
  cpu: number  // Percentage
  memory: number  // MB
  uptime: number  // Seconds
  restartCount: number
}
```

- Use Node.js `process.cpuUsage()` and `process.memoryUsage()`
- New UI: Resource dashboard with real-time graphs
- New feature: Historical resource metrics (last 24 hours)
- New feature: Alerts on high CPU/memory usage
- Library: Chart.js or Recharts for visualization

**Acceptance Criteria:**
- [ ] Track CPU usage per service
- [ ] Track memory usage per service
- [ ] Display real-time metrics in UI
- [ ] Graph historical metrics (last 24 hours)
- [ ] Alert on high resource usage (>80% CPU, >500MB RAM)
- [ ] Sort services by resource usage

---

## 📈 v2.0 Success Metrics

**Development Metrics:**
- All 5 must-have features shipped
- 3+ should-have features shipped (stretch goal)
- All features have automated tests
- Documentation updated

**User Impact Metrics:**
- Average setup time reduced from 30 min → 5 min (with templates)
- Port conflicts reduced by 95% (auto-assignment)
- Debug time reduced by 50% (log persistence)
- Manual orchestration eliminated (dependencies)
- Service uptime improved by 80% (health checks + auto-restart)

**Quality Metrics:**
- Zero critical bugs in first week
- Performance: Handle 20+ services without lag
- Stability: Backend uptime > 99.9%

---

## 🎨 v2.1 - "Professional Polish" (8-10 weeks)

**Theme:** Make DevHub delightful and complete

**Status:** 🔵 Planned
**Target:** Q2 2025

### Features

#### 1. Shared & Inherited Environment Variables
**Effort:** 2 weeks

**Problem:** Duplicating `DATABASE_URL` across 10 services.

**Solution:**
- Workspace-level variables (shared across services)
- Global variables (shared across workspaces)
- Inheritance chain: service → workspace → global
- UI shows inherited variables in different color
- Can override at service level

---

#### 2. Git Operations Integration
**Effort:** 2-3 weeks

**Features:**
- Pull, commit, push from UI
- Branch switching dropdown
- Stash/unstash
- Commit dialog with file selection
- Progress indicators for long operations

---

#### 3. Service Timeline & History
**Effort:** 1-2 weeks

**Features:**
- Timeline visualization (gantt-chart style)
- Show starts, stops, crashes, restarts
- Filter by service, date range, event type
- Identify flaky services (frequent crashes)

---

#### 4. Visual Service Dependency Graph
**Effort:** 3 weeks

**Features:**
- Interactive graph with nodes (services) and edges (dependencies)
- Library: react-flow or d3.js
- Zoom, pan, click to view details
- Highlight dependency chain on hover
- Show health status as node colors

---

#### 5. Real-time Updates (WebSockets)
**Effort:** 2 weeks

**Features:**
- Replace polling with WebSocket connections
- Instant UI updates for service status changes
- Real-time log streaming
- Lower server load
- Auto-reconnection on disconnect

---

#### 6. Database Management (Docker Containers)
**Effort:** 2-3 weeks

**Features:**
- One-click database setup (Postgres, MySQL, MongoDB, Redis)
- Database template gallery
- Auto-generate connection strings
- Link databases to services (auto-inject env vars)
- Volume management for data persistence

---

## 🌟 v2.2 - "Extended Capabilities" (8-10 weeks)

**Theme:** Add power features

**Status:** 🔵 Planned
**Target:** Q3 2025

### Features

#### 1. Built-in HTTP Client (API Tester)
**Effort:** 3-4 weeks

**Features:**
- Postman-like interface
- Save requests and collections
- Environment variables in URLs
- Response viewer (JSON, HTML, headers)
- Response history
- Import/export collections

---

#### 2. External Terminal Delegation
**Effort:** 2 weeks

**Features:**
- Launch services in native terminal (iTerm2, Alacritty, etc.)
- Platform-specific terminal detection
- Keep window open option
- Show PID and terminal reference in DevHub

---

#### 3. Advanced Filtering & Search
**Effort:** 1 week

**Features:**
- Search across services, logs, env vars, notes
- Advanced filters (by status, health, resource usage)
- Saved search queries
- Global search (Cmd/Ctrl + K)

---

#### 4. Environment Variable Validation
**Effort:** 1 week

**Features:**
- Required variables per service
- Type validation (URL, number, boolean)
- Format validation (regex)
- Missing variable warnings
- Validation on service start

---

#### 5. Workspace Sharing & Export
**Effort:** 2 weeks

**Features:**
- Export workspace as JSON/YAML
- Import workspace from file
- Share workspaces via URL (future: cloud)
- Template workspaces for common stacks

---

## 📋 Implementation Priorities

### Phase 1: Foundation (Weeks 1-2)
- Database schema updates for dependencies, health checks, log sessions
- Backend API endpoints for new features
- Core dependency resolution algorithm (topological sort)

### Phase 2: Core Features (Weeks 3-5)
- Service dependencies UI and logic
- Health checks implementation
- Port conflict detection

### Phase 3: Developer Productivity (Weeks 6-8)
- Service templates system
- Log persistence and UI
- Service groups

### Phase 4: Polish (Weeks 9-10)
- Auto-restart logic
- Resource monitoring
- Bug fixes and testing

---

## 🎯 Development Guidelines

### Code Quality
- All features must have unit tests (>80% coverage)
- Integration tests for critical paths
- Performance benchmarks for resource-intensive features
- TypeScript strict mode

### User Experience
- All actions should have loading states
- Error messages must be actionable
- Success notifications with undo option where applicable
- Keyboard shortcuts for power users

### Performance Targets
- UI remains responsive with 50+ services
- Log search results in <500ms for 100,000 lines
- Service startup time <5 seconds
- Backend memory usage <500MB

### Documentation
- Update README.md with new features
- API documentation for new endpoints
- User guide with screenshots
- Developer guide for architecture changes

---

## 🚧 Technical Challenges & Solutions

### Challenge 1: Circular Dependencies
**Problem:** Services depend on each other in a cycle.

**Solution:**
- Detect cycles using graph traversal
- Show error with visual representation
- Suggest breaking the cycle
- Allow manual override (start in parallel)

### Challenge 2: Health Check False Positives
**Problem:** Service briefly unhealthy during startup.

**Solution:**
- Initial delay before first health check
- Multiple retries with exponential backoff
- Different health thresholds (startup vs. running)

### Challenge 3: Log Storage Performance
**Problem:** Millions of log lines slow down database.

**Solution:**
- Batch insert (buffer 100 lines before writing)
- Indexes on session_id, timestamp
- Automatic partitioning by date
- Archive old logs to files

### Challenge 4: Port Assignment Race Conditions
**Problem:** Two services try to use same auto-assigned port.

**Solution:**
- Lock ports during assignment
- Verify port is still available before starting service
- Retry with next port if conflict

---

## 📊 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Timeline slippage | Medium | High | Start with must-haves only, cut should-haves |
| Performance issues | Low | High | Benchmark early, optimize as we go |
| Complex dependency bugs | Medium | Medium | Extensive testing, clear error messages |
| Cross-platform issues | Medium | Medium | Test on Mac, Linux, Windows regularly |
| User confusion | Low | Medium | Clear UI, good documentation, tooltips |

---

## 🎉 Success Definition

v2.0 is successful when:

1. **User can set up a complex microservices project in 5 minutes**
   - Scan folder → detect frameworks → apply templates → done

2. **User can start entire project with one click**
   - Define dependencies → click "Start Project" → everything starts in correct order

3. **User never worries about port conflicts**
   - Auto-detection and auto-assignment handle all cases

4. **User can debug issues from yesterday**
   - All logs are persisted and searchable

5. **User knows if services are actually working**
   - Health checks show real status, not just "running"

**The North Star:** DevHub becomes the indispensable tool that developers open first thing in the morning and use all day.

---

## 📝 Notes

- This roadmap is aggressive (8-10 weeks for v2.0)
- Focus on must-have features first
- Should-have features are included if time permits
- v2.1 and v2.2 features may be reprioritized based on user feedback
- All features eventually get implemented (no cuts, only delays)

**Created:** 2025-10-29
**Last Updated:** 2025-10-29
**Status:** Planning Phase
**Next Review:** After v2.0 completion

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
