# CRITICAL: Workspace Architecture Issue

**Identified By:** User feedback
**Date:** 2025-10-26
**Severity:** 🔴 CRITICAL - Fundamental Design Flaw

---

## The Problem

**User's Question:**
> "I don't understand why the workspace is separated from the other functionalities, e.g service, env...etc as I think everything should be stick with a workspace, right?"

**Answer:** You're absolutely correct. This is a **fundamental architectural flaw** in the current implementation.

---

## Current Architecture (BROKEN)

### Database Schema

```
services (GLOBAL - no workspace_id)
├── id
├── name
├── repo_path
├── command
├── port
└── env_vars

env_profiles (GLOBAL - no workspace_id)
├── id
├── name
└── description

notes (GLOBAL - no workspace_id)
├── id
├── title
└── content

workspaces (SEPARATE ENTITY)
├── id
├── name
└── description

workspace_snapshots (JUST REFERENCES)
├── id
├── name
├── workspace_id
└── config (JSON with references to global entities)
```

### What This Means

**Current behavior:**
1. You create services globally (not tied to any workspace)
2. You create env profiles globally
3. You create notes globally
4. Workspaces just take "snapshots" (photos) of the global state

**Example scenario showing the problem:**

```
Global Services List:
- auth-service (from Project A)
- payment-service (from Project A)
- user-service (from Project B)
- notification-service (from Project B)
- api-gateway (from Project C)

All 5 services are mixed together!
```

When you activate "Workspace A", what happens?
- ❌ Services from Project B and C are still visible
- ❌ All services from all projects are mixed in the UI
- ❌ No isolation between projects
- ❌ Can't have services with same name in different workspaces

---

## Why This Is Wrong

### 1. No Project Isolation

**Problem:** All services from all projects are in one global list.

**Real-world scenario:**
```
Developer working on 3 microservice projects:
- E-commerce (10 services)
- CRM (8 services)
- Analytics (6 services)

Current UI shows: 24 services mixed together!
```

**User needs to:**
- Manually remember which services belong to which project
- Manually filter/search through all services
- Risk starting wrong services
- Can't have duplicate service names across projects

### 2. Confusing Mental Model

**User expectation:**
```
Workspace = Project = Container for everything
- When I'm in "E-commerce workspace", I should see ONLY e-commerce services
- When I switch to "CRM workspace", I should see ONLY CRM services
```

**Current reality:**
```
Workspace = Photo album
- Snapshots are just references to global entities
- All services from all workspaces are always visible
- "Workspace" doesn't actually contain anything
```

### 3. Workspace Switching Doesn't Make Sense

**What should happen when activating a workspace:**
```
✅ Switch to workspace "E-commerce"
→ Load E-commerce services
→ Load E-commerce env vars
→ Load E-commerce notes
→ Hide everything else
```

**What actually happens:**
```
❌ Set workspace.active = 1
→ Nothing else changes
→ All global services still visible
→ No context switch
```

### 4. Snapshot Restoration Is Confusing

**Current behavior:**
```
Restore Snapshot X:
- Starts services with IDs from the snapshot
- But those services are global
- If a service was deleted globally, restore fails
- If a service was renamed globally, wrong service starts
```

**Expected behavior:**
```
Restore Snapshot X:
- Restore the workspace's services to their saved state
- Restore the workspace's env vars to their saved state
- Restore the workspace's branches to their saved state
- Everything is scoped to THIS workspace
```

### 5. No True Multi-Project Support

**Current limitation:**
```
❌ Can't have two services named "api-gateway" in different projects
❌ Can't have isolated environment variables per project
❌ Can't organize notes by project
❌ Can't cleanly separate concerns
```

---

## Correct Architecture (WORKSPACE-SCOPED)

### Database Schema (PROPOSED)

```sql
-- Workspaces are containers/projects
workspaces
├── id
├── name
├── description
├── folder_path
├── active (which workspace you're currently working in)
├── created_at
└── updated_at

-- Services BELONG TO a workspace
services
├── id
├── workspace_id (FK → workspaces.id) ON DELETE CASCADE  ← NEW!
├── name
├── repo_path
├── command
├── port
├── env_vars
├── created_at
└── updated_at

-- Env profiles BELONG TO a workspace
env_profiles
├── id
├── workspace_id (FK → workspaces.id) ON DELETE CASCADE  ← NEW!
├── name
├── description
├── created_at
└── updated_at

-- Notes BELONG TO a workspace (optional: could stay global)
notes
├── id
├── workspace_id (FK → workspaces.id) ON DELETE CASCADE  ← NEW! (optional)
├── title
├── content
├── category
├── tags
├── created_at
└── updated_at

-- Snapshots save point-in-time state of workspace-owned resources
workspace_snapshots
├── id
├── workspace_id (FK → workspaces.id) ON DELETE CASCADE
├── name
├── description
├── config (JSON with FULL state, not references)
├── created_at
└── updated_at
```

### Key Changes

1. **Add `workspace_id` foreign key to:**
   - ✅ `services` table
   - ✅ `env_profiles` table
   - ⚠️  `notes` table (optional - notes could be global or workspace-scoped)

2. **Cascade delete:**
   - Deleting a workspace deletes all its services, env profiles, notes, snapshots

3. **Filter everything by workspace:**
   - Services list: `WHERE workspace_id = ?`
   - Env profiles list: `WHERE workspace_id = ?`
   - Notes list: `WHERE workspace_id = ?` or stay global

---

## How It Should Work

### User Flow: Creating a Workspace

```
1. User clicks "New Workspace"
2. Enters: Name = "E-commerce Project"
3. Workspace is created and set as active

4. User goes to Services tab
   → Sees ONLY services in "E-commerce Project" workspace (currently empty)

5. User creates service "auth-service" in this workspace
   → Service automatically belongs to "E-commerce Project"

6. User switches to "CRM Project" workspace
   → Services list now shows ONLY "CRM Project" services
   → "auth-service" from E-commerce is HIDDEN

7. User creates service "auth-service" in CRM workspace
   → ✅ No conflict! Different workspace, different service
```

### User Flow: Switching Workspaces

```
Current workspace: "E-commerce Project"
- Services tab shows: 10 e-commerce services
- Env vars show: e-commerce env profiles
- Notes show: e-commerce documentation

User clicks "Activate" on "CRM Project" workspace
→ Active workspace changes
→ Services tab refreshes → shows 8 CRM services
→ Env vars refresh → shows CRM env profiles
→ Notes refresh → shows CRM documentation

Everything is scoped to the active workspace!
```

### User Flow: Snapshots

```
Within workspace "E-commerce Project":

1. Create snapshot "Before refactor"
   → Saves current state of ALL E-commerce services/env/notes

2. Make changes, refactor code, modify env vars

3. Create snapshot "After refactor"
   → Saves new state

4. Something breaks, need to restore

5. Click "Restore" on "Before refactor" snapshot
   → Restores services to pre-refactor state
   → Restores env vars to pre-refactor state
   → Restores branches to pre-refactor state
   → All within E-commerce workspace scope
```

---

## Migration Path

### Option 1: Add workspace_id to existing tables (Recommended)

**Migration 002: Add Workspace Scoping**

```typescript
export function up(db: Database.Database): void {
  db.exec('BEGIN TRANSACTION')

  try {
    // 1. Add workspace_id to services
    db.exec('ALTER TABLE services ADD COLUMN workspace_id TEXT')

    // 2. Add workspace_id to env_profiles
    db.exec('ALTER TABLE env_profiles ADD COLUMN workspace_id TEXT')

    // 3. Add workspace_id to notes (optional)
    db.exec('ALTER TABLE notes ADD COLUMN workspace_id TEXT')

    // 4. Create indexes
    db.exec('CREATE INDEX idx_services_workspace ON services(workspace_id)')
    db.exec('CREATE INDEX idx_env_profiles_workspace ON env_profiles(workspace_id)')
    db.exec('CREATE INDEX idx_notes_workspace ON notes(workspace_id)')

    // 5. Migrate existing data to active workspace or create default workspace
    const activeWorkspace = db.prepare('SELECT id FROM workspaces WHERE active = 1 LIMIT 1').get()

    let defaultWorkspaceId
    if (activeWorkspace) {
      defaultWorkspaceId = activeWorkspace.id
    } else {
      defaultWorkspaceId = `workspace_${Date.now()}_default`
      db.prepare(`
        INSERT INTO workspaces (id, name, description, active, created_at, updated_at)
        VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
      `).run(defaultWorkspaceId, 'Default Workspace', 'Auto-created for existing resources')
    }

    // 6. Assign all existing resources to default workspace
    db.exec(`UPDATE services SET workspace_id = '${defaultWorkspaceId}'`)
    db.exec(`UPDATE env_profiles SET workspace_id = '${defaultWorkspaceId}'`)
    db.exec(`UPDATE notes SET workspace_id = '${defaultWorkspaceId}'`)

    // 7. Add foreign key constraints (recreate tables with constraints)
    // Note: SQLite doesn't support ADD CONSTRAINT, need to recreate tables

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
```

### Option 2: Keep some resources global

**Hybrid approach:**
- Services: workspace-scoped ✅
- Env profiles: workspace-scoped ✅
- Notes: global ⚠️ (could be shared across projects)
- Docker images: global ✅ (images can be used by multiple workspaces)

---

## Frontend Changes Required

### 1. Always Work Within Workspace Context

```typescript
// Current (WRONG):
const [services, setServices] = useState<Service[]>([])

useEffect(() => {
  fetchServices() // Gets ALL services globally
}, [])

// Correct:
const [services, setServices] = useState<Service[]>([])
const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)

useEffect(() => {
  fetchActiveWorkspace()
}, [])

useEffect(() => {
  if (activeWorkspace) {
    fetchServicesForWorkspace(activeWorkspace.id)
  }
}, [activeWorkspace])
```

### 2. Add Workspace Indicator to UI

```tsx
// Add to every page header:
<div className="workspace-indicator">
  <span>Current Workspace:</span>
  <select onChange={handleWorkspaceSwitch}>
    <option value={workspace1.id}>{workspace1.name}</option>
    <option value={workspace2.id}>{workspace2.name}</option>
  </select>
</div>
```

### 3. Update API Calls

```typescript
// Current (WRONG):
GET /api/services → returns ALL services

// Correct:
GET /api/services?workspace_id={id} → returns services for workspace
// Or better:
GET /api/workspaces/{id}/services → RESTful nested resource
```

### 4. Create Workspace Switcher

```typescript
const switchWorkspace = async (workspaceId: string) => {
  // 1. Set as active
  await axios.post(`/api/workspaces/${workspaceId}/activate`)

  // 2. Refresh all lists
  await fetchServices(workspaceId)
  await fetchEnvProfiles(workspaceId)
  await fetchNotes(workspaceId)

  // 3. Update UI
  setActiveWorkspace(workspace)
}
```

---

## Backend Changes Required

### 1. Filter All Queries by Workspace

```typescript
// Current (WRONG):
getAllServices(): Service[] {
  const stmt = db.prepare('SELECT * FROM services')
  return stmt.all()
}

// Correct:
getAllServices(workspaceId: string): Service[] {
  const stmt = db.prepare('SELECT * FROM services WHERE workspace_id = ?')
  return stmt.all(workspaceId)
}
```

### 2. Require workspace_id for Create Operations

```typescript
// Current (WRONG):
createService(data: { name: string, repoPath: string, command: string }): Service {
  // ...
}

// Correct:
createService(workspaceId: string, data: { name: string, repoPath: string, command: string }): Service {
  const stmt = db.prepare(`
    INSERT INTO services (id, workspace_id, name, repo_path, command, ...)
    VALUES (?, ?, ?, ?, ?, ...)
  `)
  stmt.run(id, workspaceId, data.name, data.repoPath, data.command, ...)
}
```

### 3. Update Routes to Use Workspace Context

```typescript
// Option A: Nested routes (RESTful)
router.get('/workspaces/:workspaceId/services', (req, res) => {
  const { workspaceId } = req.params
  const services = serviceManager.getAllServices(workspaceId)
  res.json({ services })
})

// Option B: Query parameter
router.get('/services', (req, res) => {
  const { workspace_id } = req.query
  const services = serviceManager.getAllServices(workspace_id)
  res.json({ services })
})

// Recommendation: Option A (nested routes) is more RESTful
```

---

## Impact Analysis

### What Breaks

1. **All service operations** - need workspace context
2. **All env profile operations** - need workspace context
3. **All UI lists** - need filtering by workspace
4. **Snapshot capture/restore** - simpler (no global references)
5. **API contracts** - routes change

### What Improves

1. **True project isolation** ✅
2. **Cleaner mental model** ✅
3. **No service name conflicts** ✅
4. **Workspace switching makes sense** ✅
5. **Simpler snapshot logic** ✅
6. **Better multi-project support** ✅
7. **Cascade delete cleanup** ✅

---

## Recommendation

### Short Answer: **YES, you need to refactor**

### Priority: 🔴 **CRITICAL**

This is not a minor issue - it's a fundamental architectural problem that affects the entire application. The current design will cause major UX issues as soon as users try to manage multiple projects.

### Recommended Action Plan

1. **Immediate:** Document this issue (✅ done in this file)

2. **Phase 1: Database Migration**
   - Create migration 002 to add workspace_id to tables
   - Migrate existing data to default workspace
   - Add indexes for performance

3. **Phase 2: Backend Refactor**
   - Update all service/env/notes managers to require workspace_id
   - Update routes to use nested resources
   - Add workspace context validation

4. **Phase 3: Frontend Refactor**
   - Add workspace switcher to UI
   - Add active workspace state management
   - Filter all lists by active workspace
   - Update all API calls to include workspace context

5. **Phase 4: Testing & Documentation**
   - Test workspace switching
   - Test multi-project scenarios
   - Update user documentation
   - Update developer documentation

### Effort Estimate

- Backend: ~2-3 days
- Frontend: ~2-3 days
- Testing: ~1 day
- Documentation: ~0.5 day

**Total: ~1 week of focused development**

---

## Alternative: Keep Current Design?

**Should we keep the global architecture?**

**NO.** Here's why:

1. **Doesn't match user mental model**
   - Users think in projects, not global resources

2. **Doesn't scale**
   - Managing 50+ services across 5 projects is chaos

3. **Snapshot restoration is fragile**
   - References to global entities can break

4. **No proper isolation**
   - Can't have duplicate names, can't organize clearly

5. **Confusing UX**
   - "What workspace am I in?" has no clear answer

**The only scenario where global makes sense:**
- Single project/workspace only
- But then why have workspaces at all?

---

## Conclusion

**You are 100% correct.** Services, env profiles, and optionally notes should belong to workspaces, not exist globally.

The current architecture treats workspaces as "photo albums" that reference global entities. The correct architecture treats workspaces as "containers/projects" that OWN their resources.

This requires significant refactoring but is **essential** for the feature to be useful in real-world scenarios with multiple projects.

---

**Next Steps:**

1. Get user confirmation on this approach
2. Prioritize this refactor vs. other features
3. Create detailed implementation plan
4. Execute migration carefully (data preservation critical)

---

*Identified from user feedback - excellent catch! 🎯*
