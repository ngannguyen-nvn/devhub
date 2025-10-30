# DevHub v2.0 API Reference

Complete reference for all v2.0 API endpoints

**Base URL:** `http://localhost:5000/api`

**Total v2.0 Endpoints:** 48

---

## 🔗 Service Dependencies (6 endpoints)

### GET /dependencies/:serviceId
Get all dependencies for a service

**Response:**
```json
{
  "success": true,
  "dependencies": [
    {
      "id": "dep_123",
      "serviceId": "service_456",
      "dependsOnServiceId": "service_789",
      "waitForHealth": true,
      "startupDelay": 5,
      "createdAt": "2025-10-30T..."
    }
  ]
}
```

### POST /dependencies
Add a new dependency

**Body:**
```json
{
  "serviceId": "service_456",
  "dependsOnServiceId": "service_789",
  "waitForHealth": true,
  "startupDelay": 5
}
```

**Response:**
```json
{
  "success": true,
  "dependency": { ... }
}
```

### DELETE /dependencies/:id
Remove a dependency

### GET /dependencies/workspace/:workspaceId/all
Get all dependencies in a workspace

### GET /dependencies/workspace/:workspaceId/graph
Get dependency graph for visualization

**Response:**
```json
{
  "success": true,
  "graph": {
    "nodes": ["service_1", "service_2", "service_3"],
    "edges": [
      { "from": "service_1", "to": "service_2" },
      { "from": "service_2", "to": "service_3" }
    ]
  }
}
```

### POST /dependencies/workspace/:workspaceId/startup-order
Calculate optimal startup order

**Body:**
```json
{
  "serviceIds": ["api", "auth", "database"]
}
```

**Response:**
```json
{
  "success": true,
  "order": ["database", "auth", "api"],
  "cycles": []
}
```

---

## 🏥 Health Checks (5 endpoints)

### GET /health-checks/:serviceId
Get all health checks for a service

**Response:**
```json
{
  "success": true,
  "healthChecks": [
    {
      "id": "check_123",
      "serviceId": "service_456",
      "type": "http",
      "endpoint": "http://localhost:3000/health",
      "expectedStatus": 200,
      "interval": 30,
      "timeout": 5000,
      "retries": 3,
      "enabled": true
    }
  ]
}
```

### POST /health-checks
Create a health check

**HTTP Health Check:**
```json
{
  "serviceId": "service_456",
  "type": "http",
  "endpoint": "http://localhost:3000/health",
  "expectedStatus": 200,
  "expectedBody": "OK",
  "interval": 30,
  "timeout": 5000,
  "retries": 3,
  "enabled": true
}
```

**TCP Health Check:**
```json
{
  "serviceId": "service_456",
  "type": "tcp",
  "port": 5432,
  "interval": 10,
  "timeout": 3000,
  "enabled": true
}
```

**Command Health Check:**
```json
{
  "serviceId": "service_456",
  "type": "command",
  "command": "curl -f http://localhost:3000/health",
  "interval": 30,
  "timeout": 5000,
  "enabled": true
}
```

### PUT /health-checks/:id
Update a health check

### DELETE /health-checks/:id
Delete a health check

### POST /health-checks/:id/execute
Execute a health check immediately

**Response:**
```json
{
  "success": true,
  "result": {
    "healthy": true,
    "timestamp": "2025-10-30T..."
  }
}
```

---

## 🔌 Port Management (7 endpoints)

### GET /ports/used
Get all ports currently in use on the system

**Response:**
```json
{
  "success": true,
  "ports": [3000, 5000, 5432, 6379, 8080]
}
```

### GET /ports/available?start=3000
Find next available port starting from a number

**Query Params:**
- `start` (optional): Starting port number

**Response:**
```json
{
  "success": true,
  "port": 3001
}
```

### GET /ports/available/multiple?count=5&start=3000
Find multiple available ports

**Query Params:**
- `count` (required): Number of ports needed
- `start` (optional): Starting port number

**Response:**
```json
{
  "success": true,
  "ports": [3001, 3002, 3003, 3004, 3005]
}
```

### GET /ports/check/:port
Check if a specific port is available

**Response:**
```json
{
  "success": true,
  "port": 3000,
  "available": false
}
```

### GET /ports/conflicts
Detect all port conflicts

**Response:**
```json
{
  "success": true,
  "conflicts": [
    {
      "serviceId": "service_123",
      "serviceName": "API Server",
      "port": 3000,
      "conflict": "system",
      "conflictingService": null
    }
  ]
}
```

**Conflict Types:**
- `system`: Port used by another process
- `service`: Port assigned to multiple services
- `both`: Both system and service conflict

### POST /ports/auto-assign
Automatically fix port conflicts

**Body (optional):**
```json
{
  "serviceIds": ["service_123", "service_456"]
}
```

**Response:**
```json
{
  "success": true,
  "assignments": [
    {
      "serviceId": "service_123",
      "serviceName": "API Server",
      "oldPort": 3000,
      "newPort": 3001
    }
  ]
}
```

### GET /ports/stats
Get port usage statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSystemPorts": 25,
    "totalServicePorts": 10,
    "availableInRange": 6965,
    "conflicts": 2
  }
}
```

---

## 📋 Service Templates (7 endpoints)

### GET /templates
Get all service templates

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "template_123",
      "name": "Node.js - Express",
      "description": "Express.js REST API server",
      "icon": "🟢",
      "language": "nodejs",
      "framework": "express",
      "defaultCommand": "npm run dev",
      "defaultPort": 3000,
      "defaultEnvVars": {
        "NODE_ENV": "development",
        "PORT": "3000"
      },
      "healthCheckConfig": { ... },
      "detectFiles": ["package.json", "app.js", "server.js"],
      "isBuiltin": true
    }
  ]
}
```

### GET /templates/:id
Get a specific template

### GET /templates/language/:language
Get templates by language

**Languages:** `nodejs`, `python`, `go`, `ruby`, `java`, `rust`, `php`, `dotnet`

### POST /templates/detect
Auto-detect template from repository

**Body:**
```json
{
  "repoPath": "/home/user/my-project"
}
```

**Response:**
```json
{
  "success": true,
  "template": { ... }
}
```

### POST /templates
Create a custom template

**Body:**
```json
{
  "name": "Custom Node.js",
  "description": "My custom template",
  "icon": "🔵",
  "language": "nodejs",
  "framework": "custom",
  "defaultCommand": "node index.js",
  "defaultPort": 4000,
  "defaultEnvVars": { ... },
  "healthCheckConfig": { ... },
  "detectFiles": ["package.json", "index.js"]
}
```

### PUT /templates/:id
Update a custom template (built-in templates cannot be modified)

### DELETE /templates/:id
Delete a custom template (built-in templates cannot be deleted)

---

## 📝 Log Persistence (8 endpoints)

### GET /logs/sessions/:serviceId?limit=50
Get all log sessions for a service

**Query Params:**
- `limit` (optional): Max sessions to return (default: 50)

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session_123",
      "serviceId": "service_456",
      "startedAt": "2025-10-30T...",
      "stoppedAt": "2025-10-30T...",
      "exitCode": 0,
      "exitReason": "stopped",
      "logsCount": 1523
    }
  ]
}
```

### GET /logs/sessions/:serviceId/active
Get the currently active session for a running service

### GET /logs/session/:sessionId?level=error&search=timeout&limit=100&offset=0
Get logs for a specific session

**Query Params:**
- `level` (optional): Filter by level (info, warn, error, debug)
- `search` (optional): Search text in messages
- `limit` (optional): Max logs (default: 500)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "sessionId": "session_123",
      "serviceId": "service_456",
      "timestamp": "2025-10-30T...",
      "level": "info",
      "message": "Server started on port 3000"
    }
  ]
}
```

### GET /logs/service/:serviceId
Get all logs for a service across all sessions

**Query Params:** Same as `/logs/session/:sessionId` plus:
- `sessionId` (optional): Filter by specific session

### GET /logs/stats/:serviceId
Get log statistics for a service

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSessions": 15,
    "totalLogs": 45623,
    "activeSessions": 1,
    "logsByLevel": [
      { "level": "info", "count": 40000 },
      { "level": "warn", "count": 4500 },
      { "level": "error", "count": 1123 }
    ]
  }
}
```

### DELETE /logs/session/:sessionId
Delete a specific session and its logs

### DELETE /logs/service/:serviceId
Delete all logs for a service

### DELETE /logs/cleanup?days=30
Delete logs older than N days

**Query Params:**
- `days` (optional): Age threshold (default: 30)

**Response:**
```json
{
  "success": true,
  "deletedCount": 15642,
  "days": 30
}
```

---

## 📦 Service Groups (10 endpoints)

### GET /groups/:workspaceId
Get all groups in a workspace

**Response:**
```json
{
  "success": true,
  "groups": [
    {
      "id": "group_123",
      "workspaceId": "workspace_456",
      "name": "Backend Services",
      "description": "All backend microservices",
      "color": "#3B82F6",
      "icon": "🔧",
      "serviceIds": ["service_1", "service_2", "service_3"]
    }
  ]
}
```

### GET /groups/group/:groupId
Get a specific group with members

### POST /groups
Create a new group

**Body:**
```json
{
  "workspaceId": "workspace_456",
  "name": "Backend Services",
  "description": "All backend microservices",
  "color": "#3B82F6",
  "icon": "🔧"
}
```

### PUT /groups/:groupId
Update a group

**Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#10B981",
  "icon": "⚡"
}
```

### DELETE /groups/:groupId
Delete a group (services are preserved)

### POST /groups/:groupId/services
Add service(s) to a group

**Single Service:**
```json
{
  "serviceId": "service_123"
}
```

**Multiple Services:**
```json
{
  "serviceIds": ["service_1", "service_2", "service_3"]
}
```

### DELETE /groups/:groupId/services/:serviceId
Remove a service from a group

### PUT /groups/:groupId/reorder
Reorder services in a group

**Body:**
```json
{
  "serviceIds": ["service_3", "service_1", "service_2"]
}
```

### GET /groups/:groupId/stats
Get group statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalServices": 5,
    "runningServices": 3,
    "healthyServices": 2
  }
}
```

### GET /groups/service/:serviceId/groups
Get all groups a service belongs to

---

## 🔄 Auto-Restart (5 endpoints)

### GET /auto-restart/:serviceId
Get auto-restart configuration

**Response:**
```json
{
  "success": true,
  "config": {
    "enabled": true,
    "maxRestarts": 5,
    "restartCount": 2,
    "backoffStrategy": "exponential"
  }
}
```

### PUT /auto-restart/:serviceId
Update auto-restart configuration

**Body:**
```json
{
  "autoRestart": true,
  "maxRestarts": 5,
  "backoffStrategy": "exponential"
}
```

**Backoff Strategies:**
- `immediate`: Restart instantly (0ms)
- `exponential`: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
- `fixed`: Always 5 seconds

### POST /auto-restart/:serviceId/reset-count
Reset the restart counter for a service

### POST /auto-restart/:serviceId/cancel
Cancel a pending restart

### GET /auto-restart/pending/all
Get all services with pending restarts

**Response:**
```json
{
  "success": true,
  "pending": ["service_123", "service_456"]
}
```

---

## 🔧 Common Response Patterns

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Bad request (missing/invalid parameters)
- `404`: Resource not found
- `500`: Server error

---

## 🚀 Quick Examples

### Example 1: Setup Service with Dependencies and Health Check

```bash
# 1. Create services
curl -X POST http://localhost:5000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "Database", "command": "docker run postgres", "port": 5432}'

curl -X POST http://localhost:5000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "API", "command": "npm start", "port": 3000}'

# 2. Add dependency (API depends on Database)
curl -X POST http://localhost:5000/api/dependencies \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "api_id", "dependsOnServiceId": "db_id", "waitForHealth": true}'

# 3. Add health check for Database
curl -X POST http://localhost:5000/api/health-checks \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "db_id", "type": "tcp", "port": 5432, "interval": 10}'

# 4. Calculate startup order
curl -X POST http://localhost:5000/api/dependencies/workspace/workspace_id/startup-order \
  -H "Content-Type: application/json" \
  -d '{"serviceIds": ["api_id", "db_id"]}'

# Result: ["db_id", "api_id"]
```

### Example 2: Auto-Detect Template and Create Service

```bash
# 1. Detect template from repository
curl -X POST http://localhost:5000/api/templates/detect \
  -H "Content-Type: application/json" \
  -d '{"repoPath": "/home/user/my-nextjs-app"}'

# 2. Use template defaults to create service
curl -X POST http://localhost:5000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Next.js App",
    "repoPath": "/home/user/my-nextjs-app",
    "command": "npm run dev",
    "port": 3000,
    "envVars": {"NODE_ENV": "development"}
  }'
```

### Example 3: Enable Auto-Restart with Exponential Backoff

```bash
curl -X PUT http://localhost:5000/api/auto-restart/service_id \
  -H "Content-Type: application/json" \
  -d '{
    "autoRestart": true,
    "maxRestarts": 5,
    "backoffStrategy": "exponential"
  }'

# Service will now auto-restart on crash with delays:
# 1st restart: 1 second
# 2nd restart: 2 seconds
# 3rd restart: 4 seconds
# 4th restart: 8 seconds
# 5th restart: 16 seconds
# After 5 restarts: stops trying
```

### Example 4: Query Historical Logs

```bash
# Get all sessions for a service
curl http://localhost:5000/api/logs/sessions/service_id

# Get logs from a specific session with error level only
curl "http://localhost:5000/api/logs/session/session_id?level=error&limit=100"

# Search for timeout errors
curl "http://localhost:5000/api/logs/service/service_id?search=timeout&level=error"
```

---

## 📚 Additional Resources

- **Complete Features Guide:** See `V2_FEATURES.md`
- **Implementation Details:** See `V2_IMPLEMENTATION_SUMMARY.md`
- **Development Guide:** See `CLAUDE.md`

**v2.0 API Complete:** 48 endpoints across 7 categories

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
