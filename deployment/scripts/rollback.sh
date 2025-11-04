#!/bin/bash
# deployment/scripts/rollback.sh
# Rollback script - reverts to previous working version

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_ROOT="/opt/scada-system"
CURRENT_LINK="${APP_ROOT}/current"
RELEASES_DIR="${APP_ROOT}/releases"

echo -e "${YELLOW}🔄 Starting rollback procedure...${NC}"

# Function to print colored output
log_info() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 1. Check if current deployment exists
if [ ! -L "${CURRENT_LINK}" ]; then
    log_error "No current deployment found at ${CURRENT_LINK}"
    log_error "Cannot rollback without an active deployment"
    exit 1
fi

# 2. Get current release
CURRENT_RELEASE=$(readlink -f ${CURRENT_LINK})
CURRENT_NAME=$(basename ${CURRENT_RELEASE})

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Current release: ${CURRENT_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 3. Find previous release
echo ""
log_info "Searching for previous release..."

# List all releases sorted by date (newest first), excluding current
PREVIOUS_RELEASE=$(ls -1dt ${RELEASES_DIR}/* 2>/dev/null | grep -v "${CURRENT_NAME}" | head -n 1)

if [ -z "${PREVIOUS_RELEASE}" ]; then
    log_error "No previous release found for rollback"
    log_error "Available releases:"
    ls -lt ${RELEASES_DIR}/ || echo "  (none)"
    exit 1
fi

PREVIOUS_NAME=$(basename ${PREVIOUS_RELEASE})

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Rolling back to: ${PREVIOUS_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 4. Verify previous release has necessary files
if [ ! -f "${PREVIOUS_RELEASE}/docker-compose.prod.yml" ]; then
    log_error "Previous release is incomplete (missing docker-compose.prod.yml)"
    exit 1
fi

if [ ! -d "${PREVIOUS_RELEASE}/artifacts" ]; then
    log_warn "Previous release missing artifacts directory (might be old format)"
fi

log_info "Previous release verified"

# 5. Stop current release
echo ""
log_info "Stopping current release..."
cd ${CURRENT_RELEASE}

if [ -f "docker-compose.prod.yml" ]; then
    docker compose -f docker-compose.prod.yml down --timeout 30 || log_warn "Failed to stop current release gracefully"
    log_info "Current release stopped"
else
    log_warn "No docker-compose.prod.yml found in current release"
fi

# 6. Start previous release
echo ""
log_info "Starting previous release..."
cd ${PREVIOUS_RELEASE}

# Check if .env exists, create if not
if [ ! -f ".env" ]; then
    log_warn "No .env file in previous release, copying from current if available"
    if [ -f "${CURRENT_RELEASE}/.env" ]; then
        cp ${CURRENT_RELEASE}/.env .env
        log_info ".env file copied from current release"
    else
        log_error "No .env file available. Rollback aborted."
        log_error "Please create .env file manually and retry"
        exit 1
    fi
fi

# Start Docker Compose
docker compose -f docker-compose.prod.yml up -d --remove-orphans
log_info "Previous release services starting..."

# 7. Wait for services to be ready
echo ""
log_info "Waiting for services to start..."
sleep 15

# Check if at least core services are running
MAX_HEALTH_RETRIES=20
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_HEALTH_RETRIES ]; do
    RUNNING_COUNT=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null | jq -s 'length' || echo 0)

    if [ "$RUNNING_COUNT" -gt 0 ]; then
        HEALTHY_COUNT=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null | \
            jq -r '.[] | select(.Health=="healthy" or .Health=="") | .Name' | wc -l || echo 0)

        echo -ne "\r⏳ Waiting for services... ${HEALTHY_COUNT}/${RUNNING_COUNT} healthy (${RETRY_COUNT}/${MAX_HEALTH_RETRIES})"

        if [ "$HEALTHY_COUNT" -ge 3 ]; then
            HEALTHY=true
            echo ""
            break
        fi
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

echo ""

if [ "${HEALTHY}" = false ]; then
    log_error "Previous release failed to start properly"
    log_error "Service status:"
    docker compose -f docker-compose.prod.yml ps

    log_error "Rollback failed! System may be in inconsistent state."
    log_error "Manual intervention required."
    exit 1
fi

# 8. Run health checks on previous release
echo ""
log_info "Running health checks on previous release..."

# Simple health check
BACKEND_HEALTHY=false
FRONTEND_HEALTHY=false

# Check backend (with retries)
for i in {1..10}; do
    if curl -sf http://localhost:8080/health > /dev/null 2>&1 || \
       curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
        BACKEND_HEALTHY=true
        break
    fi
    sleep 2
done

# Check frontend
if curl -sf http://localhost:80/ > /dev/null 2>&1; then
    FRONTEND_HEALTHY=true
fi

if [ "${BACKEND_HEALTHY}" = true ]; then
    log_info "Backend health check passed"
else
    log_warn "Backend health check failed (might not be critical)"
fi

if [ "${FRONTEND_HEALTHY}" = true ]; then
    log_info "Frontend health check passed"
else
    log_warn "Frontend health check failed"
fi

# 9. Update 'current' symlink to point to previous release
echo ""
log_info "Updating current symlink to previous release..."
ln -sfn ${PREVIOUS_RELEASE} ${CURRENT_LINK}
log_info "Symlink updated: ${CURRENT_LINK} → ${PREVIOUS_RELEASE}"

# 10. Display rollback summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Rollback completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Rollback Summary:"
echo "  From: ${CURRENT_NAME}"
echo "  To:   ${PREVIOUS_NAME}"
echo ""
echo "📍 Active release: ${PREVIOUS_RELEASE}"
echo "🔗 Current symlink: ${CURRENT_LINK}"
echo ""
echo "📋 Service Status:"
docker compose -f ${CURRENT_LINK}/docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "⚠️  Failed release preserved at: ${CURRENT_RELEASE}"
echo "    You can investigate logs and remove it manually when ready"
echo ""
echo "🕐 Rollback completed at: $(date)"
echo ""
log_warn "Note: Review the failed deployment to understand what went wrong"
log_warn "Consider running: docker compose -f ${CURRENT_RELEASE}/docker-compose.prod.yml logs"
