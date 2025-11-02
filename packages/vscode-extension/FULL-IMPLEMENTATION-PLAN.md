# DevHub VSCode Extension - Full Implementation Plan

## Current Status

### ✅ What's Implemented
- Extension scaffold with 10+ commands
- Message passing infrastructure (40+ message types)
- Webview with Services tab UI
- Tree views for Services and Workspaces
- Core integration via @devhub/core package
- Platform-specific packaging for marketplace

### ❌ What's Missing
1. **Services tab not showing data** - Infrastructure exists but not displaying
2. **Repositories/Dashboard tab** - No UI to show scanned repos
3. **Docker tab** - Shows "Coming soon" placeholder
4. **Workspaces tab** - Shows "Coming soon" placeholder
5. **Notes/Wiki tab** - Shows "Coming soon" placeholder

## Implementation Plan

### Phase 1: Fix Services Tab (PRIORITY 1)
**Estimate**: 30 minutes

**Tasks**:
- [ ] Add debugging/logging to webview
- [ ] Verify message handler responses
- [ ] Check if workspace ID is properly set
- [ ] Test service CRUD operations

**Files to modify**:
- `webview-ui/src/components/Services.tsx` - Add error logging
- `src/webview/DevHubPanel.ts` - Add console logging

### Phase 2: Add Repositories/Dashboard Tab
**Estimate**: 2-3 hours

**Tasks**:
- [ ] Create `Dashboard.tsx` component (copy from web app)
- [ ] Add "Dashboard" tab to App.tsx
- [ ] Connect to repos.scan message
- [ ] Display repos with branch, commits, Dockerfile detection
- [ ] Add scan button and auto-refresh

**Files to create**:
- `webview-ui/src/components/Dashboard.tsx`

**Files to modify**:
- `webview-ui/src/App.tsx` - Add Dashboard tab
- `webview-ui/src/messaging/vscodeApi.ts` - Already has repos.scan

### Phase 3: Add Docker Management Tab
**Estimate**: 3-4 hours

**Tasks**:
- [ ] Create `Docker.tsx` component (copy from web app)
- [ ] Implement image list/build/remove
- [ ] Implement container list/start/stop/remove
- [ ] Add logs viewer for containers
- [ ] Add docker-compose.yml generator

**Files to create**:
- `webview-ui/src/components/Docker.tsx`

**Files to modify**:
- `webview-ui/src/App.tsx` - Enable Docker tab
- `src/webview/messageHandler.ts` - Add all Docker operations
- `webview-ui/src/messaging/vscodeApi.ts` - Add missing Docker APIs

**Core methods needed** (already exist in @devhub/core):
- `dockerManager.buildImage()`
- `dockerManager.removeImage()`
- `dockerManager.runContainer()`
- `dockerManager.startContainer()`
- `dockerManager.stopContainer()`
- `dockerManager.removeContainer()`
- `dockerManager.getContainerLogs()`

### Phase 4: Add Workspaces Tab
**Estimate**: 3-4 hours

**Tasks**:
- [ ] Create `Workspaces.tsx` component (copy from web app)
- [ ] Show workspace list with active indicator
- [ ] Show snapshots for each workspace
- [ ] Implement snapshot create/restore/delete
- [ ] Implement workspace create/delete/switch

**Files to create**:
- `webview-ui/src/components/Workspaces.tsx`

**Files to modify**:
- `webview-ui/src/App.tsx` - Enable Workspaces tab
- `src/webview/messageHandler.ts` - Add all workspace operations
- `webview-ui/src/messaging/vscodeApi.ts` - Already has workspace APIs

### Phase 5: Add Notes/Wiki Tab
**Estimate**: 3-4 hours

**Tasks**:
- [ ] Create `Wiki.tsx` component (copy from web app)
- [ ] Add markdown editor (react-markdown)
- [ ] Implement note CRUD operations
- [ ] Add search functionality
- [ ] Add wiki links support [[note-name]]
- [ ] Add templates (Architecture, API, Runbook, etc.)
- [ ] Add categories and tags

**Files to create**:
- `webview-ui/src/components/Wiki.tsx`

**Files to modify**:
- `webview-ui/src/App.tsx` - Enable Notes tab
- `src/webview/messageHandler.ts` - Add all notes operations
- `webview-ui/src/messaging/vscodeApi.ts` - Already has notes APIs
- `webview-ui/package.json` - Add react-markdown dependency

### Phase 6: Environment Variables (Future)
**Estimate**: 2-3 hours

**Tasks**:
- [ ] Create `Environment.tsx` component
- [ ] Add environment profiles UI
- [ ] Implement import/export .env files
- [ ] Add secret masking
- [ ] Connect to per-service env vars

**Files to create**:
- `webview-ui/src/components/Environment.tsx`

### Phase 7: v2.0 Advanced Features (Future)
**Estimate**: 4-5 hours

**Tasks**:
- [ ] Add Health Checks UI
- [ ] Add Log Persistence UI with filtering
- [ ] Add Service Groups UI
- [ ] Update Services component to show health status
- [ ] Add group-based service management

## Total Estimate

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Fix Services | 30 min | 🔴 CRITICAL |
| Phase 2: Dashboard | 2-3 hrs | 🔴 HIGH |
| Phase 3: Docker | 3-4 hrs | 🟡 MEDIUM |
| Phase 4: Workspaces | 3-4 hrs | 🟡 MEDIUM |
| Phase 5: Notes/Wiki | 3-4 hrs | 🟡 MEDIUM |
| Phase 6: Environment | 2-3 hrs | 🟢 LOW |
| Phase 7: v2.0 Features | 4-5 hrs | 🟢 LOW |
| **TOTAL** | **18-23 hours** | |

## Implementation Strategy

### Approach 1: Copy from Web App (RECOMMENDED)
- **Pros**: Fast, proven UI, consistent with web version
- **Cons**: Need to adapt axios calls to message passing
- **Time**: Faster (use estimates above)

### Approach 2: Build from Scratch
- **Pros**: VSCode-native UI patterns
- **Cons**: Slow, need to reimplement all logic
- **Time**: 2-3x longer

**Recommendation**: Use Approach 1 for speed.

## File Structure After Implementation

```
webview-ui/src/
├── components/
│   ├── Dashboard.tsx          # NEW - Repository scanner
│   ├── Services.tsx           # EXISTING - Fix data display
│   ├── Docker.tsx             # NEW - Docker management
│   ├── Environment.tsx        # NEW - Env variables
│   ├── Workspaces.tsx         # NEW - Workspace snapshots
│   ├── Wiki.tsx               # NEW - Notes system
│   ├── HealthChecks.tsx       # NEW - Health monitoring
│   ├── LogViewer.tsx          # NEW - Log analysis
│   └── ServiceGroups.tsx      # NEW - Service groups
├── messaging/
│   └── vscodeApi.ts           # UPDATE - Add missing APIs
├── styles/
│   ├── App.css
│   ├── Dashboard.css          # NEW
│   ├── Docker.css             # NEW
│   ├── Workspaces.css         # NEW
│   └── Wiki.css               # NEW
├── App.tsx                    # UPDATE - Add all tabs
└── main.tsx
```

## Testing Plan

After each phase:
1. Build extension: `npm run build:extension`
2. Package: `npm run package`
3. Install: `code --install-extension devhub-*.vsix`
4. Reload VSCode
5. Test all CRUD operations for new feature
6. Check console for errors (View → Output → Extension Host)

## Dependencies to Add

For webview-ui/package.json:
```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",    // For Wiki/Notes
    "remark-gfm": "^4.0.0"         // GitHub Flavored Markdown
  }
}
```

## Quick Start Commands

```bash
# Start implementation
cd /home/nnguyen/playground/devhub/packages/vscode-extension

# Phase 1: Debug Services tab
npm run watch:webview  # Terminal 1 - watch webview changes
npm run watch          # Terminal 2 - watch extension changes

# Test in VSCode
code --install-extension devhub-*.vsix
# Open DevHub dashboard and check browser console (Help → Toggle Developer Tools)

# Phase 2+: Copy components from web app
cp ../../frontend/src/components/Dashboard.tsx webview-ui/src/components/
# Then adapt axios calls to vscodeApi calls
```

## Success Criteria

Extension is complete when:
- ✅ Services tab shows and manages services
- ✅ Dashboard shows scanned repositories
- ✅ Docker tab manages images and containers
- ✅ Workspaces tab manages snapshots
- ✅ Notes tab allows creating/editing markdown notes
- ✅ All features work identically to web app
- ✅ No console errors
- ✅ Package size under 20 MB per platform

## Maintenance

After implementation:
- Update DEVELOPMENT.md with new components
- Add screenshots to README.md
- Test on Windows/Mac if possible
- Publish to marketplace

## Next Steps

1. Fix Services tab first (Phase 1) - CRITICAL
2. Add Dashboard tab (Phase 2) - HIGH priority since you just scanned repos
3. Then add other tabs based on your needs

Would you like me to start with Phase 1 (fix Services tab) or proceed to Phase 2 (add Dashboard)?
