#!/bin/bash
# deployment/scripts/cleanup.sh
# Cleanup script - removes old releases and Docker resources

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_ROOT="/opt/scada-system"
RELEASES_DIR="${APP_ROOT}/releases"
KEEP_RELEASES=5  # Number of releases to keep
CURRENT_LINK="${APP_ROOT}/current"

echo -e "${BLUE}🧹 Starting cleanup procedure...${NC}"

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

# Function to format bytes to human readable
format_bytes() {
    local bytes=$1
    if [ $bytes -lt 1024 ]; then
        echo "${bytes}B"
    elif [ $bytes -lt 1048576 ]; then
        echo "$(( bytes / 1024 ))KB"
    elif [ $bytes -lt 1073741824 ]; then
        echo "$(( bytes / 1048576 ))MB"
    else
        echo "$(( bytes / 1073741824 ))GB"
    fi
}

# 1. Check releases directory
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Analyzing releases"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "${RELEASES_DIR}" ]; then
    log_error "Releases directory not found: ${RELEASES_DIR}"
    exit 1
fi

# Count total releases
TOTAL_RELEASES=$(ls -1d ${RELEASES_DIR}/* 2>/dev/null | wc -l)
echo "📊 Total releases found: ${TOTAL_RELEASES}"

if [ ${TOTAL_RELEASES} -eq 0 ]; then
    log_warn "No releases found. Nothing to clean up."
    exit 0
fi

# Get current release (if exists)
CURRENT_RELEASE=""
if [ -L "${CURRENT_LINK}" ]; then
    CURRENT_RELEASE=$(readlink -f ${CURRENT_LINK})
    CURRENT_NAME=$(basename ${CURRENT_RELEASE})
    echo "📍 Current active release: ${CURRENT_NAME}"
fi

# List all releases
echo ""
echo "Available releases (newest first):"
ls -ldt ${RELEASES_DIR}/* | awk '{print "  " $9}' | head -n 10

# 2. Determine releases to remove
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Determining releases to remove"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${TOTAL_RELEASES} -le ${KEEP_RELEASES} ]; then
    log_info "Only ${TOTAL_RELEASES} releases exist (keeping ${KEEP_RELEASES})"
    log_info "No release cleanup needed"
    RELEASES_TO_REMOVE=""
else
    # Get old releases (keep last N releases)
    RELEASES_TO_REMOVE=$(ls -1dt ${RELEASES_DIR}/* | tail -n +$((KEEP_RELEASES + 1)))
    REMOVE_COUNT=$(echo "${RELEASES_TO_REMOVE}" | wc -l)

    echo "📋 Will remove ${REMOVE_COUNT} old release(s):"
    for release in ${RELEASES_TO_REMOVE}; do
        RELEASE_NAME=$(basename ${release})
        RELEASE_SIZE=$(du -sh ${release} 2>/dev/null | cut -f1)
        echo "  - ${RELEASE_NAME} (${RELEASE_SIZE})"
    done
fi

# 3. Remove old releases
if [ -n "${RELEASES_TO_REMOVE}" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "3. Removing old releases"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    FREED_SPACE=0

    for release in ${RELEASES_TO_REMOVE}; do
        RELEASE_NAME=$(basename ${release})

        # Skip if it's the current release (safety check)
        if [ "${release}" = "${CURRENT_RELEASE}" ]; then
            log_warn "Skipping current release: ${RELEASE_NAME}"
            continue
        fi

        echo ""
        log_info "Removing release: ${RELEASE_NAME}"

        # Calculate size before removal
        RELEASE_SIZE_BYTES=$(du -sb ${release} 2>/dev/null | cut -f1)

        # Stop Docker services if running
        if [ -f "${release}/docker-compose.prod.yml" ]; then
            cd ${release}
            docker compose -f docker-compose.prod.yml down 2>/dev/null || log_warn "Failed to stop services for ${RELEASE_NAME}"
        fi

        # Remove the release directory
        rm -rf ${release}
        log_info "Removed: ${RELEASE_NAME}"

        FREED_SPACE=$((FREED_SPACE + RELEASE_SIZE_BYTES))
    done

    FREED_SPACE_HUMAN=$(format_bytes ${FREED_SPACE})
    log_info "Total space freed from releases: ${FREED_SPACE_HUMAN}"
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "3. No old releases to remove"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# 4. Docker cleanup
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Docker resources cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get disk usage before cleanup
DOCKER_BEFORE=$(docker system df --format "{{.Size}}" | head -n 1 || echo "0B")

echo "🐳 Cleaning up Docker resources..."

# Remove unused images (older than 72h)
echo ""
log_info "Removing unused Docker images (older than 72 hours)..."
REMOVED_IMAGES=$(docker image prune -af --filter "until=72h" 2>&1 | grep "Total reclaimed space" || echo "Total reclaimed space: 0B")
echo "  ${REMOVED_IMAGES}"

# Remove unused volumes (be careful with this!)
echo ""
log_info "Removing unused Docker volumes..."
REMOVED_VOLUMES=$(docker volume prune -f 2>&1 | grep "Total reclaimed space" || echo "Total reclaimed space: 0B")
echo "  ${REMOVED_VOLUMES}"

# Remove unused networks
echo ""
log_info "Removing unused Docker networks..."
docker network prune -f > /dev/null 2>&1
log_info "Unused networks removed"

# Remove build cache (optional, only if needed)
if [ "${1:-}" = "--aggressive" ]; then
    echo ""
    log_warn "Aggressive mode: Removing Docker build cache..."
    docker builder prune -af > /dev/null 2>&1
    log_info "Build cache removed"
fi

# Get disk usage after cleanup
DOCKER_AFTER=$(docker system df --format "{{.Size}}" | head -n 1 || echo "0B")

# 5. System logs cleanup (optional)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. System logs cleanup (optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Clean old journalctl logs (older than 7 days)
log_info "Cleaning system logs older than 7 days..."
sudo journalctl --vacuum-time=7d > /dev/null 2>&1 || log_warn "Failed to clean journalctl logs (needs sudo)"

# Clean old application logs if they exist
if [ -d "${APP_ROOT}/shared/logs" ]; then
    log_info "Cleaning old application logs..."
    find ${APP_ROOT}/shared/logs -name "*.log" -mtime +7 -delete 2>/dev/null || log_warn "Failed to clean old logs"
    find ${APP_ROOT}/shared/logs -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
    log_info "Old application logs cleaned"
fi

# 6. Disk space report
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Disk space report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "💾 Disk usage for /opt:"
df -h /opt | tail -1

echo ""
echo "📊 Application disk usage:"
du -sh ${APP_ROOT}/releases 2>/dev/null || echo "  releases: 0B"
du -sh ${APP_ROOT}/shared 2>/dev/null || echo "  shared: 0B"

echo ""
echo "🐳 Docker disk usage:"
docker system df

# 7. Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Cleanup completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Cleanup Summary:"
echo "  Releases kept: ${KEEP_RELEASES}"
echo "  Releases remaining: $(ls -1d ${RELEASES_DIR}/* 2>/dev/null | wc -l)"

if [ -n "${RELEASES_TO_REMOVE}" ]; then
    echo "  Releases removed: ${REMOVE_COUNT}"
    echo "  Space freed from releases: ${FREED_SPACE_HUMAN}"
else
    echo "  Releases removed: 0"
fi

echo ""
echo "🕐 Cleanup completed at: $(date)"
echo ""
log_info "Remaining releases:"
ls -1dt ${RELEASES_DIR}/* | head -n ${KEEP_RELEASES} | xargs -n 1 basename | sed 's/^/  - /'
