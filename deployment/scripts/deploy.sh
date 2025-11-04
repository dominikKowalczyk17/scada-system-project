#!/bin/bash
# deployment/scripts/deploy.sh
# Main deployment script - deploys new version of the application

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RELEASE_DIR=$(pwd)
APP_ROOT="/opt/scada-system"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_LINK="${APP_ROOT}/current"

echo -e "${GREEN}🚀 Starting deployment: ${TIMESTAMP}${NC}"
echo "📍 Release directory: ${RELEASE_DIR}"

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

# 1. Stop previous version (if exists)
if [ -L "${CURRENT_LINK}" ]; then
    CURRENT_DIR=$(readlink -f ${CURRENT_LINK})
    CURRENT_NAME=$(basename ${CURRENT_DIR})
    log_info "Stopping current version: ${CURRENT_NAME}"

    cd ${CURRENT_DIR}
    if [ -f "docker-compose.prod.yml" ]; then
        docker compose -f docker-compose.prod.yml down --timeout 30 || log_warn "Failed to stop current version gracefully"
    fi
else
    log_info "No current deployment found (first deployment)"
fi

# 2. Go to new release directory
cd ${RELEASE_DIR}
log_info "Switched to new release directory"

# 3. Verify artifacts exist
if [ ! -d "artifacts/backend" ]; then
    log_error "Backend artifacts not found in ${RELEASE_DIR}/artifacts/backend"
    exit 1
fi

if [ ! -d "artifacts/frontend" ]; then
    log_error "Frontend artifacts not found in ${RELEASE_DIR}/artifacts/frontend"
    exit 1
fi

log_info "Artifacts verified"

# 4. Create .env file with configuration
log_info "Creating environment configuration"

cat > .env << 'EOF'
# Database Configuration
POSTGRES_USER=scada_user
POSTGRES_PASSWORD=${DB_PASSWORD:-scada_change_me_$(openssl rand -hex 16)}
POSTGRES_DB=scada_system

# MQTT Configuration
MQTT_USERNAME=scada_mqtt
MQTT_PASSWORD=${MQTT_PASSWORD:-mqtt_change_me_$(openssl rand -hex 16)}

# Application Ports
BACKEND_PORT=8080
FRONTEND_PORT=80
POSTGRES_PORT=5432
MQTT_PORT=1883
MQTT_WS_PORT=9001
REDIS_PORT=6379

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
GRAFANA_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin_$(openssl rand -hex 8)}

# Application Configuration
SPRING_PROFILES_ACTIVE=production
LOG_LEVEL=INFO

# Shared Data Directories
SHARED_DATA_DIR=${APP_ROOT}/shared/data
SHARED_LOGS_DIR=${APP_ROOT}/shared/logs
EOF

log_info "Environment file created"

# 5. Pull latest Docker images (if needed)
log_info "Pulling Docker images..."
docker compose -f docker-compose.prod.yml pull --quiet || log_warn "Some images couldn't be pulled (using cached versions)"

# 6. Start new version
log_info "Starting new version with Docker Compose..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 7. Wait for services to start
log_info "Waiting for services to start..."
sleep 10

# 8. Check service health with retries
MAX_RETRIES=30
RETRY_COUNT=0
ALL_HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Count running services
    RUNNING_COUNT=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null | jq -s 'length' || echo 0)

    if [ "$RUNNING_COUNT" -gt 0 ]; then
        # Check healthy services
        HEALTHY_COUNT=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null | \
            jq -r '.[] | select(.Health=="healthy" or .Health=="") | .Name' | wc -l || echo 0)

        echo -ne "\r⏳ Waiting for services... ${HEALTHY_COUNT}/${RUNNING_COUNT} healthy (attempt ${RETRY_COUNT}/${MAX_RETRIES})"

        # Consider healthy if at least core services (postgres, backend, nginx) are running
        if [ "$HEALTHY_COUNT" -ge 3 ]; then
            ALL_HEALTHY=true
            echo ""
            break
        fi
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

echo ""

if [ "$ALL_HEALTHY" = false ]; then
    log_error "Not enough services are healthy after ${MAX_RETRIES} retries"
    log_error "Deployment failed. Rolling back..."

    # Show service status
    docker compose -f docker-compose.prod.yml ps

    # Show logs for debugging
    log_warn "Last 50 lines of logs:"
    docker compose -f docker-compose.prod.yml logs --tail=50

    exit 1
fi

log_info "Services started successfully"

# 9. Update 'current' symlink
log_info "Updating current symlink..."
ln -sfn ${RELEASE_DIR} ${CURRENT_LINK}
log_info "Symlink updated: ${CURRENT_LINK} → ${RELEASE_DIR}"

# 10. Display service status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Deployment completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Active release: ${RELEASE_DIR}"
echo "🔗 Current symlink: ${CURRENT_LINK}"
echo ""
echo "📊 Service Status:"
docker compose -f ${CURRENT_LINK}/docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
log_info "Deployment timestamp: $(date)"
