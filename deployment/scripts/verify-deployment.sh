#!/bin/bash
# deployment/scripts/verify-deployment.sh
# Comprehensive deployment verification script

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_ROOT="/opt/scada-system/current"
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:80"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

echo -e "${BLUE}🔍 Starting comprehensive deployment verification...${NC}"
echo ""

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

# Function to track check results
check_passed() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    log_info "$1"
}

check_failed() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    log_error "$1"
}

check_warning() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    log_warn "$1"
}

# Verification functions
verify_deployment_exists() {
    if [ -d "${APP_ROOT}" ]; then
        check_passed "Deployment directory exists"
        return 0
    else
        check_failed "Deployment directory not found"
        return 1
    fi
}

verify_docker_services() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Docker Services Verification"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    cd ${APP_ROOT}

    # Check if docker-compose file exists
    if [ ! -f "docker-compose.prod.yml" ]; then
        check_failed "docker-compose.prod.yml not found"
        return 1
    fi

    # Get list of all services
    ALL_SERVICES=$(docker compose -f docker-compose.prod.yml config --services)

    echo ""
    echo "Service Status:"
    docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}\t{{.Ports}}"
    echo ""

    # Define required services
    REQUIRED_SERVICES=("postgres" "mqtt-broker" "backend" "nginx")

    # Check each required service
    for service in "${REQUIRED_SERVICES[@]}"; do
        SERVICE_STATE=$(docker compose -f docker-compose.prod.yml ps ${service} --format json 2>/dev/null | jq -r '.State' || echo "not_found")

        if [ "${SERVICE_STATE}" = "running" ]; then
            check_passed "Service '${service}' is running"
        else
            check_failed "Service '${service}' is NOT running (state: ${SERVICE_STATE})"
        fi
    done

    # Check optional services
    OPTIONAL_SERVICES=("redis" "prometheus" "grafana")
    for service in "${OPTIONAL_SERVICES[@]}"; do
        if echo "${ALL_SERVICES}" | grep -q "^${service}$"; then
            SERVICE_STATE=$(docker compose -f docker-compose.prod.yml ps ${service} --format json 2>/dev/null | jq -r '.State' || echo "not_found")

            if [ "${SERVICE_STATE}" = "running" ]; then
                check_passed "Optional service '${service}' is running"
            else
                check_warning "Optional service '${service}' is not running"
            fi
        fi
    done
}

verify_backend_endpoints() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Backend Endpoints Verification"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Health endpoint
    if curl -sf "${BACKEND_URL}/health" > /dev/null 2>&1; then
        check_passed "Backend /health endpoint is accessible"

        # Get health details
        HEALTH_JSON=$(curl -s "${BACKEND_URL}/health" 2>/dev/null)
        echo "  Health status: ${HEALTH_JSON}" | jq '.' 2>/dev/null || echo "${HEALTH_JSON}"
    elif curl -sf "${BACKEND_URL}/actuator/health" > /dev/null 2>&1; then
        check_passed "Backend /actuator/health endpoint is accessible"

        HEALTH_JSON=$(curl -s "${BACKEND_URL}/actuator/health" 2>/dev/null)
        echo "  Health status: ${HEALTH_JSON}" | jq '.' 2>/dev/null || echo "${HEALTH_JSON}"
    else
        check_failed "Backend health endpoint is not accessible"
    fi

    # Actuator info endpoint
    if curl -sf "${BACKEND_URL}/actuator/info" > /dev/null 2>&1; then
        check_passed "Backend /actuator/info endpoint is accessible"
    else
        check_warning "Backend /actuator/info endpoint not accessible (might be disabled)"
    fi

    # API endpoints (check if they respond, even with 404)
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/measurements/latest" 2>/dev/null || echo "000")
    if [ "${API_STATUS}" = "200" ] || [ "${API_STATUS}" = "404" ]; then
        check_passed "Backend API endpoints are accessible (status: ${API_STATUS})"
    else
        check_failed "Backend API not responding correctly (status: ${API_STATUS})"
    fi

    # WebSocket endpoint (should return 426 Upgrade Required or 200)
    WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/ws" 2>/dev/null || echo "000")
    if [ "${WS_STATUS}" = "426" ] || [ "${WS_STATUS}" = "200" ] || [ "${WS_STATUS}" = "404" ]; then
        check_passed "WebSocket endpoint available (status: ${WS_STATUS})"
    else
        check_warning "WebSocket endpoint status unexpected: ${WS_STATUS}"
    fi
}

verify_frontend() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Frontend Verification"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check if frontend is accessible
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/" 2>/dev/null || echo "000")

    if [ "${FRONTEND_STATUS}" = "200" ]; then
        check_passed "Frontend is accessible (status: ${FRONTEND_STATUS})"

        # Check if it's returning HTML
        FRONTEND_CONTENT=$(curl -s "${FRONTEND_URL}/" 2>/dev/null)
        if echo "${FRONTEND_CONTENT}" | grep -q "<html"; then
            check_passed "Frontend is serving HTML content"
        else
            check_warning "Frontend is not returning HTML content"
        fi
    else
        check_failed "Frontend is not accessible (status: ${FRONTEND_STATUS})"
    fi
}

verify_database() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Database Verification"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd ${APP_ROOT}

    # Check if PostgreSQL is ready
    if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U scada_user > /dev/null 2>&1; then
        check_passed "PostgreSQL is accepting connections"
    else
        check_failed "PostgreSQL is not ready"
        return 1
    fi

    # Check if database exists
    DB_EXISTS=$(docker compose -f docker-compose.prod.yml exec -T postgres \
        psql -U scada_user -tAc "SELECT 1 FROM pg_database WHERE datname='scada_system'" 2>/dev/null || echo "")

    if [ "${DB_EXISTS}" = "1" ]; then
        check_passed "Database 'scada_system' exists"

        # Count tables in database
        TABLE_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres \
            psql -U scada_user -d scada_system -tAc \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")

        if [ "${TABLE_COUNT}" -gt 0 ]; then
            check_passed "Database has ${TABLE_COUNT} table(s)"
        else
            check_warning "Database exists but has no tables yet"
        fi
    else
        check_failed "Database 'scada_system' does not exist"
    fi

    # Check database size
    DB_SIZE=$(docker compose -f docker-compose.prod.yml exec -T postgres \
        psql -U scada_user -d scada_system -tAc \
        "SELECT pg_size_pretty(pg_database_size('scada_system'))" 2>/dev/null | tr -d ' \r' || echo "unknown")

    echo "  Database size: ${DB_SIZE}"
}

verify_mqtt() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "MQTT Broker Verification"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd ${APP_ROOT}

    # Check if MQTT broker is responding
    if timeout 5 docker compose -f docker-compose.prod.yml exec -T mqtt-broker \
        mosquitto_sub -t "\$SYS/broker/version" -C 1 > /dev/null 2>&1; then
        check_passed "MQTT broker is responding"

        # Get broker version
        MQTT_VERSION=$(timeout 5 docker compose -f docker-compose.prod.yml exec -T mqtt-broker \
            mosquitto_sub -t "\$SYS/broker/version" -C 1 2>/dev/null | tr -d '\r' || echo "unknown")
        echo "  MQTT Broker Version: ${MQTT_VERSION}"

        # Test publish/subscribe
        TEST_TOPIC="test/verification/$(date +%s)"
        TEST_MESSAGE="verification_test"

        # Start subscriber in background and publish
        if timeout 5 docker compose -f docker-compose.prod.yml exec -T mqtt-broker sh -c \
            "mosquitto_pub -t '${TEST_TOPIC}' -m '${TEST_MESSAGE}' -q 1" > /dev/null 2>&1; then
            check_passed "MQTT publish test successful"
        else
            check_warning "MQTT publish test failed"
        fi
    else
        check_failed "MQTT broker is not responding"
    fi
}

verify_redis() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Redis Verification (Optional)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd ${APP_ROOT}

    # Check if Redis is running
    if docker compose -f docker-compose.prod.yml ps redis --format json 2>/dev/null | jq -r '.State' | grep -q "running"; then
        # Test Redis connection
        if docker compose -f docker-compose.prod.yml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
            check_passed "Redis is responding"

            # Get Redis info
            REDIS_VERSION=$(docker compose -f docker-compose.prod.yml exec -T redis redis-cli INFO server 2>/dev/null | grep "redis_version" | cut -d: -f2 | tr -d '\r' || echo "unknown")
            echo "  Redis Version: ${REDIS_VERSION}"
        else
            check_warning "Redis is running but not responding"
        fi
    else
        check_warning "Redis is not running (optional service)"
    fi
}

verify_disk_space() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Disk Space Verification"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check disk usage for /opt
    DISK_USAGE=$(df /opt | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "  Disk usage for /opt: ${DISK_USAGE}%"

    if [ ${DISK_USAGE} -lt 70 ]; then
        check_passed "Disk usage is healthy (${DISK_USAGE}%)"
    elif [ ${DISK_USAGE} -lt 85 ]; then
        check_warning "Disk usage is moderate (${DISK_USAGE}%)"
    else
        check_failed "Disk usage is high (${DISK_USAGE}%) - cleanup recommended"
    fi

    # Check available space
    AVAILABLE=$(df -h /opt | tail -1 | awk '{print $4}')
    echo "  Available space: ${AVAILABLE}"
}

verify_logs() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Log Verification"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd ${APP_ROOT}

    # Check for recent errors in backend logs
    BACKEND_ERRORS=$(docker compose -f docker-compose.prod.yml logs backend --tail=100 2>/dev/null | grep -i "error" | wc -l)

    if [ ${BACKEND_ERRORS} -eq 0 ]; then
        check_passed "No errors in recent backend logs"
    elif [ ${BACKEND_ERRORS} -lt 5 ]; then
        check_warning "Found ${BACKEND_ERRORS} error(s) in backend logs (review recommended)"
    else
        check_failed "Found ${BACKEND_ERRORS} error(s) in backend logs (investigation required)"
    fi

    # Check for nginx errors
    NGINX_ERRORS=$(docker compose -f docker-compose.prod.yml logs nginx --tail=100 2>/dev/null | grep -i "error" | wc -l)

    if [ ${NGINX_ERRORS} -eq 0 ]; then
        check_passed "No errors in recent nginx logs"
    elif [ ${NGINX_ERRORS} -lt 5 ]; then
        check_warning "Found ${NGINX_ERRORS} error(s) in nginx logs"
    else
        check_warning "Found ${NGINX_ERRORS} error(s) in nginx logs"
    fi
}

# ============================================
# Main Verification Flow
# ============================================

# 1. Check deployment exists
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deployment Structure Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
verify_deployment_exists || exit 1

# 2. Verify Docker services
verify_docker_services

# 3. Verify backend endpoints
verify_backend_endpoints

# 4. Verify frontend
verify_frontend

# 5. Verify database
verify_database

# 6. Verify MQTT
verify_mqtt

# 7. Verify Redis
verify_redis

# 8. Verify disk space
verify_disk_space

# 9. Verify logs
verify_logs

# ============================================
# Summary
# ============================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Results:"
echo "  Total checks: ${TOTAL_CHECKS}"
echo "  ✅ Passed: ${PASSED_CHECKS}"
echo "  ⚠️  Warnings: ${WARNING_CHECKS}"
echo "  ❌ Failed: ${FAILED_CHECKS}"
echo ""

# Calculate success percentage
if [ ${TOTAL_CHECKS} -gt 0 ]; then
    SUCCESS_PERCENTAGE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
    echo "  Success rate: ${SUCCESS_PERCENTAGE}%"
fi

echo ""
echo "🕐 Verification completed at: $(date)"
echo ""

# Exit with appropriate code
if [ ${FAILED_CHECKS} -gt 0 ]; then
    log_error "Deployment verification failed with ${FAILED_CHECKS} failed check(s)"
    exit 1
elif [ ${WARNING_CHECKS} -gt 0 ]; then
    log_warn "Deployment verification passed with ${WARNING_CHECKS} warning(s)"
    exit 0
else
    log_info "Deployment verification passed all checks!"
    exit 0
fi
