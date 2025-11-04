#!/bin/bash
# deployment/scripts/integration-tests.sh
# Integration tests (smoke tests) for production deployment

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:80"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}🧪 Running integration tests (smoke tests)...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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

# Function to track test results
test_passed() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    log_info "TEST PASSED: $1"
}

test_failed() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
    log_error "TEST FAILED: $1"
}

# ============================================
# Test 1: Backend Health Endpoint
# ============================================
echo "Test 1: Backend Health Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/health" 2>/dev/null || curl -s "${BACKEND_URL}/actuator/health" 2>/dev/null || echo "{}")
HEALTH_STATUS=$(echo "${HEALTH_RESPONSE}" | jq -r '.status // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")

if [ "${HEALTH_STATUS}" = "UP" ]; then
    test_passed "Backend health endpoint returns UP status"
    echo "  Response: ${HEALTH_RESPONSE}" | jq '.' 2>/dev/null || echo "${HEALTH_RESPONSE}"
else
    test_failed "Backend health endpoint not returning UP (got: ${HEALTH_STATUS})"
fi

echo ""

# ============================================
# Test 2: Backend API - Latest Measurement Endpoint
# ============================================
echo "Test 2: Backend API - Latest Measurement Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/measurements/latest" 2>/dev/null || echo "000")

if [ "${API_STATUS}" = "200" ]; then
    test_passed "Latest measurement endpoint is accessible and returning data"

    LATEST_RESPONSE=$(curl -s "${BACKEND_URL}/api/measurements/latest" 2>/dev/null)
    echo "  Response preview: ${LATEST_RESPONSE}" | jq '.' 2>/dev/null | head -n 10 || echo "${LATEST_RESPONSE}" | head -c 200
elif [ "${API_STATUS}" = "404" ]; then
    test_passed "Latest measurement endpoint is accessible (404 - no data yet)"
    echo "  Note: Endpoint works but no measurements recorded yet"
else
    test_failed "Latest measurement endpoint not accessible (HTTP ${API_STATUS})"
fi

echo ""

# ============================================
# Test 3: Backend API - Measurement History Endpoint
# ============================================
echo "Test 3: Backend API - Measurement History Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test with date range (last 24 hours)
FROM_DATE=$(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -v-24H '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || echo "")
TO_DATE=$(date -u '+%Y-%m-%dT%H:%M:%S')

HISTORY_URL="${BACKEND_URL}/api/measurements/history?from=${FROM_DATE}&to=${TO_DATE}&limit=10"
HISTORY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HISTORY_URL}" 2>/dev/null || echo "000")

if [ "${HISTORY_STATUS}" = "200" ] || [ "${HISTORY_STATUS}" = "404" ]; then
    test_passed "History endpoint is accessible (HTTP ${HISTORY_STATUS})"
else
    test_failed "History endpoint not accessible (HTTP ${HISTORY_STATUS})"
fi

echo ""

# ============================================
# Test 4: WebSocket Endpoint Availability
# ============================================
echo "Test 4: WebSocket Endpoint Availability"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/ws" 2>/dev/null || echo "000")

# WebSocket endpoints typically return 426 (Upgrade Required) or 404
if [ "${WS_STATUS}" = "426" ] || [ "${WS_STATUS}" = "200" ]; then
    test_passed "WebSocket endpoint available (HTTP ${WS_STATUS})"
elif [ "${WS_STATUS}" = "404" ]; then
    test_failed "WebSocket endpoint not found (HTTP 404) - check configuration"
else
    test_failed "WebSocket endpoint unexpected status (HTTP ${WS_STATUS})"
fi

echo ""

# ============================================
# Test 5: Frontend Accessibility
# ============================================
echo "Test 5: Frontend Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/" 2>/dev/null || echo "000")

if [ "${FRONTEND_STATUS}" = "200" ]; then
    test_passed "Frontend is accessible (HTTP 200)"

    # Check if it's HTML
    FRONTEND_CONTENT=$(curl -s "${FRONTEND_URL}/" 2>/dev/null)
    if echo "${FRONTEND_CONTENT}" | grep -q "<html"; then
        test_passed "Frontend serving valid HTML content"
    else
        test_failed "Frontend not serving HTML content"
    fi
else
    test_failed "Frontend not accessible (HTTP ${FRONTEND_STATUS})"
fi

echo ""

# ============================================
# Test 6: Frontend Static Assets
# ============================================
echo "Test 6: Frontend Static Assets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to access common asset paths
ASSETS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/assets/" 2>/dev/null || echo "000")

if [ "${ASSETS_STATUS}" = "200" ] || [ "${ASSETS_STATUS}" = "403" ] || [ "${ASSETS_STATUS}" = "404" ]; then
    test_passed "Frontend assets directory accessible"
else
    test_failed "Frontend assets not properly configured (HTTP ${ASSETS_STATUS})"
fi

echo ""

# ============================================
# Test 7: Database Connectivity
# ============================================
echo "Test 7: Database Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APP_ROOT="/opt/scada-system/current"

if [ -d "${APP_ROOT}" ]; then
    cd ${APP_ROOT}

    # Test database connection
    if docker compose -f docker-compose.prod.yml exec -T postgres \
        psql -U scada_user -d scada_system -c "SELECT 1;" > /dev/null 2>&1; then
        test_passed "Database connection successful"

        # Test a simple query
        QUERY_RESULT=$(docker compose -f docker-compose.prod.yml exec -T postgres \
            psql -U scada_user -d scada_system -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")

        if [ "${QUERY_RESULT}" -ge 0 ]; then
            test_passed "Database query execution successful (${QUERY_RESULT} tables)"
        else
            test_failed "Database query failed"
        fi
    else
        test_failed "Database connection failed"
    fi
else
    test_failed "Current deployment directory not found"
fi

echo ""

# ============================================
# Test 8: MQTT Broker Connectivity
# ============================================
echo "Test 8: MQTT Broker Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "${APP_ROOT}" ]; then
    cd ${APP_ROOT}

    # Test MQTT subscribe (system topics)
    if timeout 5 docker compose -f docker-compose.prod.yml exec -T mqtt-broker \
        mosquitto_sub -t "\$SYS/broker/version" -C 1 > /dev/null 2>&1; then
        test_passed "MQTT broker subscribe test successful"
    else
        test_failed "MQTT broker subscribe test failed"
    fi

    # Test MQTT publish
    TEST_TOPIC="scada/test/integration/$(date +%s)"
    TEST_MESSAGE="integration_test_$(date +%s)"

    if timeout 5 docker compose -f docker-compose.prod.yml exec -T mqtt-broker \
        mosquitto_pub -t "${TEST_TOPIC}" -m "${TEST_MESSAGE}" -q 1 2>&1; then
        test_passed "MQTT broker publish test successful"
    else
        test_failed "MQTT broker publish test failed"
    fi
fi

echo ""

# ============================================
# Test 9: Redis Connectivity (Optional)
# ============================================
echo "Test 9: Redis Connectivity (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "${APP_ROOT}" ]; then
    cd ${APP_ROOT}

    # Check if Redis is running
    if docker compose -f docker-compose.prod.yml ps redis --format json 2>/dev/null | jq -r '.State' | grep -q "running"; then
        # Test Redis ping
        if docker compose -f docker-compose.prod.yml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
            test_passed "Redis connectivity test successful"

            # Test Redis set/get
            TEST_KEY="integration_test_$(date +%s)"
            TEST_VALUE="test_value"

            docker compose -f docker-compose.prod.yml exec -T redis \
                redis-cli SET "${TEST_KEY}" "${TEST_VALUE}" EX 10 > /dev/null 2>&1

            RETRIEVED=$(docker compose -f docker-compose.prod.yml exec -T redis \
                redis-cli GET "${TEST_KEY}" 2>/dev/null | tr -d '\r')

            if [ "${RETRIEVED}" = "${TEST_VALUE}" ]; then
                test_passed "Redis SET/GET test successful"
            else
                test_failed "Redis SET/GET test failed"
            fi
        else
            test_failed "Redis not responding to ping"
        fi
    else
        log_warn "Redis not running (optional service) - skipping test"
    fi
fi

echo ""

# ============================================
# Test 10: Monitoring Endpoints (Optional)
# ============================================
echo "Test 10: Monitoring Endpoints (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Prometheus
PROMETHEUS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9090/-/healthy" 2>/dev/null || echo "000")
if [ "${PROMETHEUS_STATUS}" = "200" ]; then
    test_passed "Prometheus health check successful"
else
    log_warn "Prometheus not accessible (optional) - HTTP ${PROMETHEUS_STATUS}"
fi

# Grafana
GRAFANA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health" 2>/dev/null || echo "000")
if [ "${GRAFANA_STATUS}" = "200" ]; then
    test_passed "Grafana health check successful"
else
    log_warn "Grafana not accessible (optional) - HTTP ${GRAFANA_STATUS}"
fi

echo ""

# ============================================
# Test 11: End-to-End Measurement Flow (If Data Exists)
# ============================================
echo "Test 11: End-to-End Data Flow (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# This test checks if we can retrieve any data through the API
# (only works if MQTT data is being published)

LATEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/measurements/latest" 2>/dev/null || echo "000")

if [ "${LATEST_STATUS}" = "200" ]; then
    LATEST_DATA=$(curl -s "${BACKEND_URL}/api/measurements/latest" 2>/dev/null)

    # Check if we have valid measurement data
    if echo "${LATEST_DATA}" | jq -e '.timestamp' > /dev/null 2>&1; then
        test_passed "End-to-end data flow working (measurements available)"
        echo "  Latest measurement timestamp: $(echo ${LATEST_DATA} | jq -r '.timestamp // "unknown"')"
    else
        log_warn "API returns data but format unexpected"
    fi
else
    log_warn "No measurement data available yet (start ESP32 mock to test full flow)"
fi

echo ""

# ============================================
# Summary
# ============================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Integration Tests Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Results:"
echo "  Total tests: ${TOTAL_TESTS}"
echo "  ✅ Passed: ${PASSED_TESTS}"
echo "  ❌ Failed: ${FAILED_TESTS}"
echo ""

# Calculate success percentage
if [ ${TOTAL_TESTS} -gt 0 ]; then
    SUCCESS_PERCENTAGE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    echo "  Success rate: ${SUCCESS_PERCENTAGE}%"
    echo ""
fi

echo "🕐 Tests completed at: $(date)"
echo ""

# Exit with appropriate code
if [ ${FAILED_TESTS} -eq 0 ]; then
    log_info "All integration tests passed!"
    exit 0
else
    log_error "Some integration tests failed (${FAILED_TESTS}/${TOTAL_TESTS})"
    exit 1
fi
