#!/bin/bash
# deployment/scripts/health-check.sh
# Health check script - verifies application is running correctly

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_ROOT="/opt/scada-system/current"
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:80"
MAX_RETRIES=30
RETRY_DELAY=2

echo -e "${GREEN}🏥 Starting health checks...${NC}"

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

# Function to check URL health
check_url() {
    local url=$1
    local name=$2
    local retries=0

    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "${url}" > /dev/null 2>&1; then
            log_info "${name} is healthy (${url})"
            return 0
        fi

        retries=$((retries + 1))
        echo -ne "\r⏳ ${name} not ready yet... (${retries}/${MAX_RETRIES})"
        sleep $RETRY_DELAY
    done

    echo ""
    log_error "${name} health check failed after ${MAX_RETRIES} retries"
    return 1
}

# Check if current deployment exists
if [ ! -d "${APP_ROOT}" ]; then
    log_error "No current deployment found at ${APP_ROOT}"
    exit 1
fi

cd ${APP_ROOT}

# 1. Check Backend Health Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Backend Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! check_url "${BACKEND_URL}/health" "Backend"; then
    log_warn "Trying alternative health endpoint: /actuator/health"
    if ! check_url "${BACKEND_URL}/actuator/health" "Backend Actuator"; then
        exit 1
    fi
fi

# Get backend health details
BACKEND_HEALTH=$(curl -s "${BACKEND_URL}/health" 2>/dev/null || curl -s "${BACKEND_URL}/actuator/health" 2>/dev/null || echo '{}')
echo "Backend Health Details:"
echo "${BACKEND_HEALTH}" | jq '.' 2>/dev/null || echo "${BACKEND_HEALTH}"

# 2. Check Frontend Accessibility
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Frontend Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! check_url "${FRONTEND_URL}/" "Frontend"; then
    exit 1
fi

# Check if index.html is served
FRONTEND_CONTENT=$(curl -s "${FRONTEND_URL}/" 2>/dev/null)
if echo "${FRONTEND_CONTENT}" | grep -q "<html"; then
    log_info "Frontend is serving HTML content"
else
    log_warn "Frontend response doesn't look like HTML"
fi

# 3. Check Docker Services
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Docker Services Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if docker-compose file exists
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml not found in ${APP_ROOT}"
    exit 1
fi

# Display service status
echo "Service Status:"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"

# Check critical services
CRITICAL_SERVICES=("postgres" "mqtt-broker" "backend" "nginx")
ALL_CRITICAL_UP=true

for service in "${CRITICAL_SERVICES[@]}"; do
    # Check if service is running
    SERVICE_STATUS=$(docker compose -f docker-compose.prod.yml ps ${service} --format json 2>/dev/null | jq -r '.State' || echo "not_found")

    if [ "${SERVICE_STATUS}" = "running" ]; then
        log_info "Service '${service}' is running"
    else
        log_error "Service '${service}' is NOT running (status: ${SERVICE_STATUS})"
        ALL_CRITICAL_UP=false
    fi
done

if [ "${ALL_CRITICAL_UP}" = false ]; then
    log_error "Some critical services are not running"
    exit 1
fi

# 4. Check Database Connectivity
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Database Connectivity Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to connect to PostgreSQL
if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U scada_user > /dev/null 2>&1; then
    log_info "PostgreSQL is accepting connections"

    # Check database exists
    DB_EXISTS=$(docker compose -f docker-compose.prod.yml exec -T postgres \
        psql -U scada_user -tAc "SELECT 1 FROM pg_database WHERE datname='scada_system'" 2>/dev/null || echo "")

    if [ "${DB_EXISTS}" = "1" ]; then
        log_info "Database 'scada_system' exists"
    else
        log_warn "Database 'scada_system' not found"
    fi
else
    log_error "PostgreSQL is not ready"
    exit 1
fi

# 5. Check MQTT Broker
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. MQTT Broker Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to subscribe to MQTT topic (timeout 5 seconds)
if timeout 5 docker compose -f docker-compose.prod.yml exec -T mqtt-broker \
    mosquitto_sub -t "\$SYS/broker/version" -C 1 > /dev/null 2>&1; then
    log_info "MQTT broker is responding"

    # Get broker version
    MQTT_VERSION=$(timeout 5 docker compose -f docker-compose.prod.yml exec -T mqtt-broker \
        mosquitto_sub -t "\$SYS/broker/version" -C 1 2>/dev/null | tr -d '\r' || echo "unknown")
    echo "  MQTT Broker Version: ${MQTT_VERSION}"
else
    log_warn "MQTT broker health check timed out or failed"
fi

# 6. Check Redis (if running)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Redis Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker compose -f docker-compose.prod.yml ps redis --format json 2>/dev/null | jq -r '.State' | grep -q "running"; then
    if docker compose -f docker-compose.prod.yml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_info "Redis is responding"
    else
        log_warn "Redis is running but not responding to ping"
    fi
else
    log_warn "Redis service not running (optional)"
fi

# 7. Check Application Metrics (if available)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Application Metrics Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Prometheus endpoint
PROMETHEUS_URL="http://localhost:9090/-/healthy"
if curl -sf "${PROMETHEUS_URL}" > /dev/null 2>&1; then
    log_info "Prometheus is healthy"
else
    log_warn "Prometheus health check failed (optional service)"
fi

# Check Grafana endpoint
GRAFANA_URL="http://localhost:3000/api/health"
if curl -sf "${GRAFANA_URL}" > /dev/null 2>&1; then
    log_info "Grafana is healthy"
else
    log_warn "Grafana health check failed (optional service)"
fi

# 8. Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "All critical health checks passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Deployment Summary:"
echo "  Backend:    ${BACKEND_URL}"
echo "  Frontend:   ${FRONTEND_URL}"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana:    http://localhost:3000"
echo ""
echo "🕐 Health check completed at: $(date)"
