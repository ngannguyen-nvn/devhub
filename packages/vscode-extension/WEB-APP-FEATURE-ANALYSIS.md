# DevHub Web App - Complete Feature Analysis

**Purpose**: Comprehensive review of all web app functionalities for VSCode extension implementation

**Total**: ~10,310 lines of React code across 17 components

---

## 1. Dashboard Component (1,139 lines)

### Features:
- **Workspace Overview Card**
  - Active workspace display with name, description, folder path
  - Active snapshot indicator
  - "Manage Workspace" button

- **Statistics Cards** (3 cards)
  - Services stats (total, running, stopped)
  - Snapshots count and latest date
  - Quick Actions (Env Profiles, Wiki & Notes shortcuts)

- **Recent Snapshots List**
  - Display 5 most recent snapshots
  - Restore button (with uncommitted changes check)
  - Delete button (prevent active snapshot deletion)
  - Active snapshot highlighting

- **Quick Snapshot**
  - One-click snapshot capture
  - Auto-generated timestamp name

- **Repository Scanner**
  - Path input with auto-select
  - Scan button with loading state
  - Repository list display:
    - Checkbox selection (individual + select all)
    - Branch name
    - Uncommitted changes indicator
    - Last commit info (message, author, date)
    - Dockerfile detection badge
    - .env file detection

- **Save to Workspace Modal**
  - Create new workspace OR use existing
  - Auto-populated workspace name from path
  - Custom snapshot name (optional)
  - Description field
  - .env import checkbox (auto-detect .env files)
  - Batch service creation from repos
  - Batch env profile import

- **Uncommitted Changes Dialog**
  - Stash changes option
  - Commit changes option (with message)
  - Cancel restore

- **API Calls**:
  - `GET /api/services` - Service stats
  - `GET /api/workspaces/:id/snapshots` - Recent snapshots
  - `POST /api/workspaces/snapshots/quick` - Quick snapshot
  - `GET /api/repos/scan?path=X` - Scan repos
  - `POST /api/workspaces/:id/snapshots` - Create snapshot
  - `POST /api/workspaces/snapshots/:id/restore` - Restore
  - `DELETE /api/workspaces/snapshots/:id` - Delete
  - `GET /api/workspaces/snapshots/:id/check-changes` - Check uncommitted
  - `POST /api/workspaces/snapshots/:id/stash-changes` - Stash
  - `POST /api/workspaces/snapshots/:id/commit-changes` - Commit
  - `POST /api/repos/analyze-batch` - Analyze repos for service creation
  - `POST /api/services/batch` - Batch create services
  - `POST /api/env/profiles` - Create env profile
  - `POST /api/env/profiles/:id/import` - Import .env file
  - `POST /api/workspaces/:id/activate` - Activate workspace

---

## 2. Services Component (~800 lines)

### Features:
- **Service List**
  - Grid/card view
  - Search by name
  - Filter by group
  - Status indicators (running/stopped/error)
  - Health status badges (healthy/unhealthy/unknown)
  - Tags display
  - Quick actions: Start, Stop, Delete, Assign to Groups

- **Add Service Form**
  - Manual creation: name, repo path, command, port
  - Import from workspace (batch)
  - Auto-analyze repos for package.json detection

- **Import from Workspace Modal**
  - Load repos from active workspace snapshots
  - Checkbox selection
  - Batch analyze and create services

- **Central Logs View**
  - All running services in one view
  - Color-coded by service
  - Real-time updates
  - Timestamp display
  - Service name prefix

- **Individual Service Logs**
  - Tab per service
  - Full log history
  - Auto-scroll
  - Clear button

- **Service Groups Management**
  - Create groups
  - Assign services to groups
  - Filter by group
  - Group colors

- **Batch Operations**
  - Stop all running services
  - Delete confirmation dialog

- **API Calls**:
  - `GET /api/services` - List services
  - `POST /api/services` - Create service
  - `POST /api/services/batch` - Batch create
  - `POST /api/services/:id/start` - Start
  - `POST /api/services/:id/stop` - Stop
  - `DELETE /api/services/:id` - Delete
  - `GET /api/services/:id/logs` - Get logs
  - `GET /api/workspaces/:id/snapshots` - For import
  - `POST /api/repos/analyze-batch` - Analyze repos
  - `GET /api/groups` - List groups
  - `POST /api/groups` - Create group
  - `POST /api/groups/:id/services` - Assign services
  - `DELETE /api/groups/:id/services/:serviceId` - Remove from group

---

## 3. Docker Component (~600 lines)

### Features:
- **Images Tab**
  - List all Docker images
  - Image details: ID, tag, size, created date
  - Build image from Dockerfile
  - Remove image
  - Run container from image

- **Containers Tab**
  - List all containers
  - Container details: ID, name, status, ports
  - Start/stop container
  - Remove container
  - View logs

- **Build Image**
  - Select repository with Dockerfile
  - Build context path
  - Image name and tag
  - Real-time build logs (SSE stream)
  - Build progress

- **Run Container**
  - Image selection
  - Container name
  - Port mapping
  - Environment variables
  - Volume mounts
  - Command override

- **Container Logs**
  - Real-time log streaming
  - Follow mode
  - Clear logs
  - Download logs

- **Docker Compose**
  - Generate docker-compose.yml from services
  - Preview before save
  - Download compose file

- **Docker Info**
  - Daemon status
  - Version info
  - System info

- **API Calls**:
  - `GET /api/docker/images` - List images
  - `POST /api/docker/images/build` - Build (SSE)
  - `DELETE /api/docker/images/:id` - Remove image
  - `POST /api/docker/images/:id/run` - Run container
  - `GET /api/docker/containers` - List containers
  - `POST /api/docker/containers/:id/start` - Start
  - `POST /api/docker/containers/:id/stop` - Stop
  - `DELETE /api/docker/containers/:id` - Remove
  - `GET /api/docker/containers/:id/logs` - Container logs
  - `POST /api/docker/compose/generate` - Generate compose
  - `GET /api/docker/meta/info` - Docker info
  - `GET /api/docker/meta/version` - Docker version

---

## 4. Environment Component (~700 lines)

### Features:
- **Profile List**
  - All env profiles in workspace
  - Profile name, description
  - Variable count
  - Source metadata (auto-import vs manual)
  - Active/inactive status

- **Create Profile**
  - Name, description
  - Color picker
  - Icon selection
  - Tags

- **Profile Details View**
  - All variables in profile
  - Variable key/value display
  - Secret masking (****)
  - Description per variable

- **Add/Edit Variable**
  - Key input
  - Value input (textarea for multi-line)
  - Secret checkbox
  - Description
  - Service association (optional)

- **Import .env File**
  - File path input
  - File picker
  - Parse and preview
  - Bulk import
  - Service association

- **Export .env File**
  - Export to file
  - Download
  - Copy to clipboard

- **Apply Profile to Service**
  - Select service
  - Apply all variables
  - Override existing

- **Bulk Operations**
  - Delete profile (with confirmation)
  - Duplicate profile
  - Merge profiles

- **Search/Filter**
  - Search variables by key
  - Filter by service
  - Filter by secret/non-secret

- **API Calls**:
  - `GET /api/env/profiles` - List profiles
  - `POST /api/env/profiles` - Create profile
  - `PUT /api/env/profiles/:id` - Update profile
  - `DELETE /api/env/profiles/:id` - Delete profile
  - `GET /api/env/profiles/:id/variables` - List variables
  - `POST /api/env/variables` - Create variable
  - `PUT /api/env/variables/:id` - Update variable
  - `DELETE /api/env/variables/:id` - Delete variable
  - `POST /api/env/profiles/:id/import` - Import .env
  - `GET /api/env/profiles/:id/export` - Export .env
  - `POST /api/env/profiles/:id/apply/:serviceId` - Apply to service
  - `GET /api/env/services/:serviceId/variables` - Get service vars

---

## 5. Workspaces Component (~900 lines)

### Features:
- **Workspace List View**
  - All workspaces
  - Active workspace highlighting
  - Workspace cards with:
    - Name, description
    - Folder path
    - Snapshot count
    - Created date
    - Tags
  - Activate button
  - Edit/delete actions

- **Create Workspace**
  - Name, description
  - Folder path (optional)
  - Tags
  - Set as active checkbox

- **Workspace Detail View**
  - Workspace overview
  - Breadcrumb navigation
  - All snapshots in workspace
  - Statistics (total snapshots, last modified)

- **Snapshot List**
  - All snapshots in workspace
  - Active snapshot badge
  - Snapshot cards with:
    - Name, description
    - Created date
    - Repository count
    - Service count
  - Restore button
  - Edit/delete actions
  - Export config

- **Create Snapshot**
  - Name, description
  - Scan repos (reuse Dashboard scanner)
  - Auto-import .env checkbox
  - Select repos to include

- **Restore Snapshot**
  - Uncommitted changes check
  - Stash/commit options
  - Branch switching
  - Service starting
  - Env profile sync (optional)
  - Progress feedback

- **Edit Workspace**
  - Update name, description
  - Update tags
  - Update folder path

- **Delete Workspace**
  - Confirmation dialog
  - Cascade delete snapshots
  - Prevent active workspace deletion

- **Snapshot Export/Import**
  - Export snapshot config to JSON
  - Import snapshot from JSON
  - Preview before import

- **Active Snapshot Tracking**
  - Clear active snapshot
  - Auto-set on restore
  - Visual indicator

- **API Calls**:
  - `GET /api/workspaces` - List workspaces
  - `POST /api/workspaces` - Create workspace
  - `GET /api/workspaces/:id` - Get workspace
  - `PUT /api/workspaces/:id` - Update workspace
  - `DELETE /api/workspaces/:id` - Delete workspace
  - `POST /api/workspaces/:id/activate` - Activate
  - `GET /api/workspaces/:id/snapshots` - List snapshots
  - `POST /api/workspaces/:id/snapshots` - Create snapshot
  - `GET /api/workspaces/snapshots/:id` - Get snapshot
  - `PUT /api/workspaces/snapshots/:id` - Update snapshot
  - `DELETE /api/workspaces/snapshots/:id` - Delete snapshot
  - `POST /api/workspaces/snapshots/:id/restore` - Restore
  - `GET /api/workspaces/snapshots/:id/export` - Export config
  - `POST /api/workspaces/snapshots/import` - Import config
  - `POST /api/workspaces/snapshots/quick` - Quick snapshot
  - `POST /api/workspaces/snapshots/scan` - Scan and create

---

## 6. Wiki Component (~800 lines)

### Features:
- **Notes List**
  - All notes in workspace
  - Grid/list view toggle
  - Search by title/content (FTS5)
  - Filter by category
  - Filter by tags
  - Sort options (date, title, category)

- **Create Note**
  - Title input
  - Category selection (or create new)
  - Tags (multi-select or create new)
  - Template selection (5 templates)
  - Content editor

- **Note Editor**
  - Markdown editor
  - Live preview (split view or toggle)
  - Toolbar (bold, italic, headers, lists, links, code)
  - Wiki links syntax [[note-name]]
  - Auto-save (debounced)

- **Note Templates**
  - Architecture Documentation
  - API Documentation
  - Runbook
  - Troubleshooting Guide
  - Meeting Notes

- **Note Details View**
  - Full note display
  - Rendered markdown
  - Edit button
  - Delete button
  - Category badge
  - Tags display
  - Created/updated dates

- **Wiki Links**
  - [[note-name]] syntax
  - Clickable links to other notes
  - Backlinks display
  - Link suggestions

- **Backlinks**
  - Show notes linking to current note
  - Count and list
  - Click to navigate

- **Full-Text Search**
  - Search title and content
  - SQLite FTS5 backend
  - Highlight matches
  - Results ranking

- **Categories Management**
  - List all categories in workspace
  - Rename category
  - Delete category (reassign notes)
  - Category colors

- **Tags Management**
  - List all tags in workspace
  - Rename tag
  - Delete tag (remove from notes)
  - Tag colors

- **Bulk Operations**
  - Delete multiple notes
  - Bulk category change
  - Bulk tag assignment

- **Export/Import**
  - Export note to markdown file
  - Import markdown files
  - Bulk export workspace notes

- **API Calls**:
  - `GET /api/notes` - List notes
  - `POST /api/notes` - Create note
  - `GET /api/notes/:id` - Get note
  - `PUT /api/notes/:id` - Update note
  - `DELETE /api/notes/:id` - Delete note
  - `GET /api/notes/search/:query` - Full-text search
  - `GET /api/notes/:id/links` - Get linked notes
  - `GET /api/notes/:id/backlinks` - Get backlinks
  - `GET /api/notes/meta/categories` - List categories
  - `GET /api/notes/meta/tags` - List tags
  - `GET /api/notes/meta/templates` - List templates

---

## 7. HealthChecks Component (v2.0, ~400 lines)

### Features:
- **Health Check List**
  - All health checks for services
  - Check type (HTTP, TCP, Command)
  - Status (healthy/unhealthy/unknown)
  - Last check time
  - Response time
  - Failure count

- **Create Health Check**
  - Select service
  - Check type (HTTP/TCP/Command)
  - HTTP: URL, expected status, headers
  - TCP: host, port
  - Command: shell command, expected exit code
  - Interval (seconds)
  - Timeout (seconds)
  - Retries
  - Auto-start on service start

- **Edit Health Check**
  - Update all check params
  - Enable/disable check

- **Delete Health Check**
  - Remove check
  - Stop monitoring

- **Health Status Display**
  - Visual indicators (green/red/gray)
  - Response time graph
  - Failure history
  - Uptime percentage

- **Start/Stop Monitoring**
  - Manual start/stop
  - Auto-start with service

- **API Calls**:
  - `GET /api/health-checks` - List checks
  - `POST /api/health-checks` - Create check
  - `PUT /api/health-checks/:id` - Update check
  - `DELETE /api/health-checks/:id` - Delete check
  - `POST /api/health-checks/:id/start` - Start monitoring
  - `POST /api/health-checks/:id/stop` - Stop monitoring
  - `GET /api/health-checks/:id/history` - Get history

---

## 8. LogViewer Component (v2.0, ~500 lines)

### Features:
- **Log Session List**
  - All log sessions per service
  - Session duration
  - Log count
  - Status (active/completed)
  - Start/end time

- **Log Filtering**
  - Filter by level (info/warn/error/debug)
  - Filter by text search
  - Filter by date range
  - Filter by service

- **Log Display**
  - Syntax highlighting
  - Line numbers
  - Timestamp
  - Log level badges
  - Auto-scroll toggle

- **Session Management**
  - View historical sessions
  - Compare sessions
  - Export session logs

- **Log Cleanup**
  - Delete old sessions
  - Auto-cleanup settings
  - Retention policy

- **API Calls**:
  - `GET /api/logs/sessions` - List sessions
  - `GET /api/logs/sessions/:id` - Get session logs
  - `DELETE /api/logs/sessions/:id` - Delete session
  - `POST /api/logs/cleanup` - Manual cleanup

---

## 9. ServiceGroups Component (v2.0, ~400 lines)

### Features:
- **Group List**
  - All service groups
  - Group name, description
  - Service count
  - Color/icon

- **Create Group**
  - Name, description
  - Color picker
  - Icon selection

- **Edit Group**
  - Update details
  - Reorder services

- **Group Actions**
  - Start all services in group
  - Stop all services in group
  - Restart all

- **Assign Services**
  - Multi-select services
  - Add to group
  - Remove from group

- **Group Statistics**
  - Total services
  - Running services
  - Healthy services

- **API Calls**:
  - `GET /api/groups` - List groups
  - `POST /api/groups` - Create group
  - `PUT /api/groups/:id` - Update group
  - `DELETE /api/groups/:id` - Delete group
  - `POST /api/groups/:id/services` - Assign services
  - `DELETE /api/groups/:id/services/:serviceId` - Remove service
  - `POST /api/groups/:id/start-all` - Start all
  - `POST /api/groups/:id/stop-all` - Stop all

---

## 10. Supporting Components

### WorkspaceSwitcher (~200 lines)
- Dropdown in header
- Show all workspaces
- Active workspace indicator
- Quick switch
- Create new workspace shortcut

### ConfirmDialog (~100 lines)
- Reusable confirmation modal
- Custom message
- Confirm/cancel actions
- Danger mode (red button)

### UncommittedChangesDialog (~300 lines)
- Show uncommitted changes
- Stash option
- Commit option with message input
- Cancel option
- Loading states

### StashManager (~300 lines)
- List stashed changes per repo
- Stash metadata (message, date)
- Apply stash
- Pop stash
- Drop stash

### Loading (~100 lines)
- Skeleton loader
- Spinner
- Progress bar

### ErrorBoundary (~150 lines)
- Catch React errors
- Display error UI
- Reset functionality

### Database (~400 lines)
- View database tables
- Execute SQL queries
- Export database
- Import database
- Migrations list
- Run specific migration

---

## Summary Statistics

| Component | Lines | API Endpoints | Key Features |
|-----------|-------|---------------|--------------|
| Dashboard | 1,139 | 15 | Workspace overview, repo scanner, snapshots, stats |
| Services | 800 | 11 | CRUD, start/stop, logs, groups, import |
| Docker | 600 | 10 | Images, containers, build, logs, compose |
| Environment | 700 | 9 | Profiles, variables, import/export, apply |
| Workspaces | 900 | 14 | Workspace CRUD, snapshots, restore, export |
| Wiki | 800 | 9 | Notes, markdown, search, links, templates |
| HealthChecks | 400 | 7 | HTTP/TCP/Command checks, monitoring |
| LogViewer | 500 | 4 | Sessions, filtering, export |
| ServiceGroups | 400 | 7 | Groups, batch actions, statistics |
| Supporting | 1,500 | - | Switcher, dialogs, loading, error handling |
| **TOTAL** | **~7,739** | **86** | **Full microservices orchestration platform** |

---

## VSCode Extension Implementation Strategy

### Phase 1: Core Infrastructure ✅
- Extension scaffold
- Message passing
- Database integration
- Workspace management
- DONE

### Phase 2: Repository & Services (PRIORITY 1)
**Estimate**: 6-8 hours
- Dashboard component (repo scanner, save to workspace)
- Services component (full CRUD, logs, import)
- Auto-service creation from repos
- Workspace-scoped operations

### Phase 3: Docker Management
**Estimate**: 4-5 hours
- Docker component (images, containers)
- Build, run, stop, remove
- Logs viewer
- Compose generation

### Phase 4: Environment Variables
**Estimate**: 4-5 hours
- Environment component (profiles, variables)
- Import/export .env
- Secret encryption
- Apply to services

### Phase 5: Workspaces & Snapshots
**Estimate**: 4-5 hours
- Workspaces component (CRUD)
- Snapshots (create, restore, export)
- Uncommitted changes handling
- Active snapshot tracking

### Phase 6: Wiki & Notes
**Estimate**: 4-5 hours
- Wiki component (notes CRUD)
- Markdown editor with preview
- Full-text search
- Wiki links and backlinks
- Templates

### Phase 7: v2.0 Advanced Features
**Estimate**: 5-6 hours
- Health checks component
- Log viewer component
- Service groups component

### Phase 8: Supporting Components
**Estimate**: 2-3 hours
- Workspace switcher
- Confirmation dialogs
- Loading states
- Error boundaries

---

## Total Estimate: 33-42 hours

This provides full feature parity with the web application.

---

**Next Steps**:
1. Review and approve this analysis
2. Prioritize phases
3. Begin implementation phase by phase
4. Test each phase thoroughly before moving to next

