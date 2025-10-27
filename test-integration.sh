#!/bin/bash

# DevHub MVP v1.0 - Comprehensive Integration Test
# Tests all features end-to-end to verify functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_section() {
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  $1${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check if backend is running
check_backend() {
    log_section "Checking Prerequisites"

    if curl -s http://localhost:5000/api/services > /dev/null 2>&1; then
        log_success "Backend is running on port 5000"
    else
        log_error "Backend is not running. Please start with: npm run dev"
        exit 1
    fi

    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend is running on port 3000"
    else
        log_error "Frontend is not running. Please start with: npm run dev"
        exit 1
    fi
}

# Test 1: Repository Scanner
test_repository_scanner() {
    log_section "Test 1: Repository Scanner"

    log_info "Scanning /home/user/devhub repository..."
    RESULT=$(curl -s "http://localhost:5000/api/repos/scan?path=/home/user/devhub&depth=1")

    if echo "$RESULT" | grep -q "success.*true"; then
        REPO_COUNT=$(echo "$RESULT" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['repositories']))" 2>/dev/null)
        if [ "$REPO_COUNT" -gt 0 ]; then
            log_success "Repository scanner found $REPO_COUNT repository(ies)"
        else
            log_error "Repository scanner found 0 repositories"
        fi
    else
        log_error "Repository scanner API failed"
    fi
}

# Test 2: Service Management
test_service_management() {
    log_section "Test 2: Service Management"

    # Create service
    log_info "Creating test service..."
    SERVICE=$(curl -s -X POST http://localhost:5000/api/services \
        -H "Content-Type: application/json" \
        -d '{"name":"Integration Test Service","repoPath":"/tmp","command":"sleep 10"}' \
        | python3 -c "import json,sys; print(json.load(sys.stdin)['service']['id'])" 2>/dev/null)

    if [ -n "$SERVICE" ]; then
        log_success "Service created: $SERVICE"
    else
        log_error "Failed to create service"
        return
    fi

    # Start service
    log_info "Starting service..."
    START_RESULT=$(curl -s -X POST "http://localhost:5000/api/services/$SERVICE/start")
    if echo "$START_RESULT" | grep -q "success.*true"; then
        log_success "Service started successfully"
        sleep 1
    else
        log_error "Failed to start service"
    fi

    # Check service status
    log_info "Checking service status..."
    STATUS=$(curl -s http://localhost:5000/api/services | python3 -c "
import json, sys
data = json.load(sys.stdin)
for s in data['services']:
    if s['id'] == '$SERVICE' and s.get('running'):
        print('running')
        break
" 2>/dev/null)

    if [ "$STATUS" = "running" ]; then
        log_success "Service is running"
    else
        log_error "Service is not running"
    fi

    # Get logs
    log_info "Fetching service logs..."
    LOGS=$(curl -s "http://localhost:5000/api/services/$SERVICE/logs")
    if echo "$LOGS" | grep -q "success.*true"; then
        log_success "Service logs retrieved"
    else
        log_error "Failed to retrieve service logs"
    fi

    # Stop service
    log_info "Stopping service..."
    STOP_RESULT=$(curl -s -X POST "http://localhost:5000/api/services/$SERVICE/stop")
    if echo "$STOP_RESULT" | grep -q "success.*true"; then
        log_success "Service stopped successfully"
    else
        log_error "Failed to stop service"
    fi

    # Delete service
    log_info "Deleting service..."
    DELETE_RESULT=$(curl -s -X DELETE "http://localhost:5000/api/services/$SERVICE")
    if echo "$DELETE_RESULT" | grep -q "success.*true"; then
        log_success "Service deleted successfully"
    else
        log_error "Failed to delete service"
    fi
}

# Test 3: Environment Variables Manager
test_environment_variables() {
    log_section "Test 3: Environment Variables Manager"

    # Create profile
    log_info "Creating environment profile..."
    PROFILE=$(curl -s -X POST http://localhost:5000/api/env/profiles \
        -H "Content-Type: application/json" \
        -d '{"name":"Integration Test Profile","description":"Test profile"}' \
        | python3 -c "import json,sys; print(json.load(sys.stdin)['profile']['id'])" 2>/dev/null)

    if [ -n "$PROFILE" ]; then
        log_success "Environment profile created: $PROFILE"
    else
        log_error "Failed to create environment profile"
        return
    fi

    # Add variable
    log_info "Adding environment variable..."
    VAR=$(curl -s -X POST http://localhost:5000/api/env/variables \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"TEST_VAR\",\"value\":\"test123\",\"profileId\":\"$PROFILE\",\"isSecret\":false}" \
        | python3 -c "import json,sys; print(json.load(sys.stdin)['variable']['id'])" 2>/dev/null)

    if [ -n "$VAR" ]; then
        log_success "Environment variable added"
    else
        log_error "Failed to add environment variable"
    fi

    # Add secret variable
    log_info "Adding secret variable..."
    SECRET=$(curl -s -X POST http://localhost:5000/api/env/variables \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"SECRET_KEY\",\"value\":\"secret123\",\"profileId\":\"$PROFILE\",\"isSecret\":true}" \
        | python3 -c "import json,sys; print(json.load(sys.stdin)['variable']['id'])" 2>/dev/null)

    if [ -n "$SECRET" ]; then
        log_success "Secret variable added (encrypted)"
    else
        log_error "Failed to add secret variable"
    fi

    # Get variables
    log_info "Retrieving profile variables..."
    VARS=$(curl -s "http://localhost:5000/api/env/profiles/$PROFILE/variables")
    VAR_COUNT=$(echo "$VARS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['variables']))" 2>/dev/null)

    if [ "$VAR_COUNT" -eq 2 ]; then
        log_success "Retrieved $VAR_COUNT variables from profile"
    else
        log_error "Variable count mismatch (expected 2, got $VAR_COUNT)"
    fi

    # Export to .env
    log_info "Exporting profile to .env file..."
    EXPORT_RESULT=$(curl -s -X POST "http://localhost:5000/api/env/profiles/$PROFILE/export" \
        -H "Content-Type: application/json" \
        -d '{"filePath":"/tmp/integration-test.env"}')

    if echo "$EXPORT_RESULT" | grep -q "success.*true" && [ -f "/tmp/integration-test.env" ]; then
        log_success "Profile exported to .env file"
        rm -f /tmp/integration-test.env
    else
        log_error "Failed to export profile to .env"
    fi

    # Cleanup
    log_info "Cleaning up environment profile..."
    curl -s -X DELETE "http://localhost:5000/api/env/profiles/$PROFILE" > /dev/null
}

# Test 4: Docker Management
test_docker_management() {
    log_section "Test 4: Docker Management"

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_info "Docker not available - skipping Docker tests"
        return
    fi

    # List images
    log_info "Listing Docker images..."
    IMAGES=$(curl -s http://localhost:5000/api/docker/images)
    if echo "$IMAGES" | grep -q "success.*true"; then
        IMAGE_COUNT=$(echo "$IMAGES" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('images', [])))" 2>/dev/null)
        log_success "Docker images API working ($IMAGE_COUNT images found)"
    else
        log_error "Docker images API failed"
    fi

    # List containers
    log_info "Listing Docker containers..."
    CONTAINERS=$(curl -s "http://localhost:5000/api/docker/containers?all=true")
    if echo "$CONTAINERS" | grep -q "success.*true"; then
        CONTAINER_COUNT=$(echo "$CONTAINERS" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('containers', [])))" 2>/dev/null)
        log_success "Docker containers API working ($CONTAINER_COUNT containers found)"
    else
        log_error "Docker containers API failed"
    fi
}

# Test 5: Workspace Snapshots
test_workspace_snapshots() {
    log_section "Test 5: Workspace Snapshots"

    # Create a service first
    log_info "Creating service for workspace test..."
    SERVICE=$(curl -s -X POST http://localhost:5000/api/services \
        -H "Content-Type: application/json" \
        -d '{"name":"Workspace Test Service","repoPath":"/home/user/devhub","command":"sleep 15"}' \
        | python3 -c "import json,sys; print(json.load(sys.stdin)['service']['id'])" 2>/dev/null)

    # Start service
    curl -s -X POST "http://localhost:5000/api/services/$SERVICE/start" > /dev/null
    sleep 1

    # Create workspace
    log_info "Creating workspace snapshot..."
    WORKSPACE=$(curl -s -X POST http://localhost:5000/api/workspaces \
        -H "Content-Type: application/json" \
        -d '{"name":"Integration Test Workspace","description":"Test workspace","repoPaths":["/home/user/devhub"],"tags":["test"]}' \
        | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('workspace', d.get('snapshot', {})).get('id', ''))" 2>/dev/null)

    if [ -n "$WORKSPACE" ]; then
        log_success "Workspace snapshot created: $WORKSPACE"
    else
        log_error "Failed to create workspace snapshot"
        curl -s -X POST "http://localhost:5000/api/services/$SERVICE/stop" > /dev/null
        curl -s -X DELETE "http://localhost:5000/api/services/$SERVICE" > /dev/null
        return
    fi

    # Stop service
    curl -s -X POST "http://localhost:5000/api/services/$SERVICE/stop" > /dev/null
    sleep 1

    # Restore workspace
    log_info "Restoring workspace snapshot..."
    RESTORE=$(curl -s -X POST "http://localhost:5000/api/workspaces/$WORKSPACE/restore")
    SERVICES_STARTED=$(echo "$RESTORE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('servicesStarted', 0))" 2>/dev/null)

    if [ "$SERVICES_STARTED" -gt 0 ]; then
        log_success "Workspace restored ($SERVICES_STARTED services started)"
    else
        log_error "Workspace restore failed"
    fi

    sleep 1

    # List workspaces
    log_info "Listing all workspaces..."
    WORKSPACES=$(curl -s http://localhost:5000/api/workspaces)
    WS_COUNT=$(echo "$WORKSPACES" | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data.get('workspaces', data.get('snapshots', []))))" 2>/dev/null)

    if [ "$WS_COUNT" -gt 0 ]; then
        log_success "Found $WS_COUNT workspace(s)"
    else
        log_error "No workspaces found"
    fi

    # Cleanup
    log_info "Cleaning up workspace test..."
    curl -s -X POST "http://localhost:5000/api/services/$SERVICE/stop" > /dev/null
    curl -s -X DELETE "http://localhost:5000/api/services/$SERVICE" > /dev/null
    curl -s -X DELETE "http://localhost:5000/api/workspaces/$WORKSPACE" > /dev/null
}

# Test 6: Wiki/Notes System
test_wiki_notes() {
    log_section "Test 6: Wiki/Notes System"

    # Get templates
    log_info "Getting note templates..."
    TEMPLATES=$(curl -s http://localhost:5000/api/notes/meta/templates)
    TEMPLATE_COUNT=$(echo "$TEMPLATES" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['templates']))" 2>/dev/null)

    if [ "$TEMPLATE_COUNT" -eq 5 ]; then
        log_success "Found 5 note templates"
    else
        log_error "Template count mismatch (expected 5, got $TEMPLATE_COUNT)"
    fi

    # Create note
    log_info "Creating test note..."
    NOTE=$(curl -s -X POST http://localhost:5000/api/notes \
        -H "Content-Type: application/json" \
        -d '{"title":"Integration Test Note","content":"# Test Note\n\nThis is a test note with [[Another Note]] link.","category":"Test","tags":["integration","test"]}' \
        | python3 -c "import json,sys; print(json.load(sys.stdin)['note']['id'])" 2>/dev/null)

    if [ -n "$NOTE" ]; then
        log_success "Note created: $NOTE"
    else
        log_error "Failed to create note"
        return
    fi

    # Create linked note
    log_info "Creating linked note..."
    NOTE2=$(curl -s -X POST http://localhost:5000/api/notes \
        -H "Content-Type: application/json" \
        -d '{"title":"Another Note","content":"# Another Note\n\nLinked from [[Integration Test Note]].","category":"Test","tags":["test"]}' \
        | python3 -c "import json,sys; print(json.load(sys.stdin)['note']['id'])" 2>/dev/null)

    if [ -n "$NOTE2" ]; then
        log_success "Linked note created"
    else
        log_error "Failed to create linked note"
    fi

    # Search notes
    log_info "Searching notes..."
    SEARCH=$(curl -s "http://localhost:5000/api/notes/search/test")
    SEARCH_COUNT=$(echo "$SEARCH" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['notes']))" 2>/dev/null)

    if [ "$SEARCH_COUNT" -gt 0 ]; then
        log_success "Search found $SEARCH_COUNT note(s)"
    else
        log_error "Search found no notes"
    fi

    # Get links
    log_info "Getting linked notes..."
    LINKS=$(curl -s "http://localhost:5000/api/notes/$NOTE/links")
    LINK_COUNT=$(echo "$LINKS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['links']))" 2>/dev/null)

    if [ "$LINK_COUNT" -gt 0 ]; then
        log_success "Found $LINK_COUNT linked note(s)"
    else
        log_error "No linked notes found"
    fi

    # Get backlinks
    log_info "Getting backlinks..."
    BACKLINKS=$(curl -s "http://localhost:5000/api/notes/$NOTE2/backlinks")
    BACKLINK_COUNT=$(echo "$BACKLINKS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['backlinks']))" 2>/dev/null)

    if [ "$BACKLINK_COUNT" -gt 0 ]; then
        log_success "Found $BACKLINK_COUNT backlink(s)"
    else
        log_error "No backlinks found"
    fi

    # Cleanup
    log_info "Cleaning up test notes..."
    curl -s -X DELETE "http://localhost:5000/api/notes/$NOTE" > /dev/null
    curl -s -X DELETE "http://localhost:5000/api/notes/$NOTE2" > /dev/null
}

# Main test execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║          DevHub MVP v1.0 - Integration Test Suite             ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    check_backend
    test_repository_scanner
    test_service_management
    test_environment_variables
    test_docker_management
    test_workspace_snapshots
    test_wiki_notes

    # Summary
    log_section "Test Summary"
    echo ""
    echo "  Total Tests:   $TOTAL_TESTS"
    echo -e "  ${GREEN}Passed:        $PASSED_TESTS${NC}"
    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "  ${RED}Failed:        $FAILED_TESTS${NC}"
    else
        echo -e "  ${GREEN}Failed:        $FAILED_TESTS${NC}"
    fi
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                                                                ║${NC}"
        echo -e "${GREEN}║                   ✓ ALL TESTS PASSED ✓                        ║${NC}"
        echo -e "${GREEN}║                                                                ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                                                                ║${NC}"
        echo -e "${RED}║                   ✗ SOME TESTS FAILED ✗                       ║${NC}"
        echo -e "${RED}║                                                                ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
        exit 1
    fi
}

# Run tests
main
