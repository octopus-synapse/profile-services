#!/bin/bash
#
# Smart Integration Test Runner
#
# Auto-detects running docker-compose environment and runs integration tests.
# If no environment is detected, starts the test environment.
#
# Usage:
#   ./scripts/run-integration.sh [options]
#   ./scripts/run-integration.sh [environment] [options]
#
# Auto-detect mode (recommended):
#   ./scripts/run-integration.sh              # Detects running containers, runs tests
#
# Manual mode:
#   ./scripts/run-integration.sh dev          # Force dev environment
#   ./scripts/run-integration.sh test         # Force test environment
#   ./scripts/run-integration.sh e2e          # Force e2e environment
#   ./scripts/run-integration.sh prod         # Force prod environment
#
# Options:
#   --no-cleanup    Don't stop containers after tests (only for manual mode)
#   --filter <pat>  Run only tests matching pattern
#   --file <path>   Run specific test file (relative to integration root)
#   --verbose       Show more output
#
# Examples:
#   docker compose -f docker-compose.test.yml up -d
#   ./scripts/run-integration.sh              # Auto-detects test, runs integration tests
#
#   ./scripts/run-integration.sh test         # Starts test env, runs tests, stops
#   ./scripts/run-integration.sh --filter auth
#   ./scripts/run-integration.sh --file auth.integration.spec.ts

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[integration]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[integration]${NC} $1"; }
log_error() { echo -e "${RED}[integration]${NC} $1"; }
log_step() { echo -e "${BLUE}[integration]${NC} $1"; }
log_detect() { echo -e "${CYAN}[detect]${NC} $1" >&2; }

# Defaults
ENVIRONMENT=""
CLEANUP=true
VERBOSE=false
FILTER=""
FILE=""
AUTO_DETECT=true
STARTED_BY_US=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dev|e2e|test|prod)
            ENVIRONMENT="$1"
            AUTO_DETECT=false
            shift
            ;;
        --no-cleanup) CLEANUP=false; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --filter) FILTER="$2"; shift 2 ;;
        --file) FILE="$2"; shift 2 ;;
        --help|-h)
            head -35 "$0" | tail -33
            exit 0
            ;;
        *) log_error "Unknown option: $1"; exit 1 ;;
    esac
done

# Environment configurations
# Format: COMPOSE_FILE|PG_CONTAINER|REDIS_CONTAINER|BACKEND_CONTAINER|DB_NAME
declare -A ENV_CONFIG=(
    ["dev"]="docker-compose.dev.yml|profile-postgres-dev|profile-redis-dev|profile-backend-dev|profile_dev"
    ["e2e"]="docker-compose.e2e.yml|profile-postgres-e2e|profile-redis-e2e|profile-services-e2e|profile_test"
    ["test"]="docker-compose.test.yml|profile-postgres-test|profile-redis-test||profile_test"
    ["prod"]="docker-compose.yml|profile-postgres|profile-redis|profile-backend|profile"
)

# Get exposed port from a running container
get_container_port() {
    local container=$1
    local internal_port=$2
    docker port "$container" "$internal_port" 2>/dev/null | head -1 | cut -d: -f2 || echo ""
}

# Check if container is running
is_container_running() {
    docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$1$"
}

# Detection: Check which containers are running
detect_environment() {
    [[ "$VERBOSE" == "true" ]] && log_detect "Scanning for running containers..."

    # Check each environment's containers
    for env in test dev e2e prod; do
        IFS='|' read -r _ pg_container redis_container _ _ <<< "${ENV_CONFIG[$env]}"

        if is_container_running "$pg_container" && is_container_running "$redis_container"; then
            [[ "$VERBOSE" == "true" ]] && log_detect "Found $env containers running"
            echo "$env"
            return 0
        fi
    done

    echo ""
}

# Get connection info for a detected environment
get_connection_info() {
    local env=$1
    IFS='|' read -r compose_file pg_container redis_container backend_container db_name <<< "${ENV_CONFIG[$env]}"

    # Get actual exposed ports from running containers
    PG_PORT=$(get_container_port "$pg_container" 5432)
    REDIS_PORT=$(get_container_port "$redis_container" 6379)

    if [[ -n "$backend_container" ]] && is_container_running "$backend_container"; then
        BACKEND_PORT=$(get_container_port "$backend_container" 3001)
    else
        BACKEND_PORT=""
    fi

    COMPOSE_FILE="$compose_file"
    DB_NAME="$db_name"
    PG_CONTAINER="$pg_container"
    REDIS_CONTAINER="$redis_container"
    BACKEND_CONTAINER="$backend_container"
}

# Wait for service to be ready
wait_for_postgres() {
    local port=$1
    local max_retries=30
    local retry=0

    # Use pg_isready if available, otherwise fall back to nc
    if command -v pg_isready > /dev/null 2>&1; then
        while ! pg_isready -h localhost -p "$port" -U postgres > /dev/null 2>&1; do
            retry=$((retry + 1))
            if [[ $retry -ge $max_retries ]]; then
                return 1
            fi
            sleep 1
        done
    else
        while ! nc -z localhost "$port" > /dev/null 2>&1; do
            retry=$((retry + 1))
            if [[ $retry -ge $max_retries ]]; then
                return 1
            fi
            sleep 1
        done
    fi
    return 0
}

wait_for_redis() {
    local port=$1
    local max_retries=30
    local retry=0

    # Use nc to check if Redis port is accepting connections
    while ! nc -z localhost "$port" > /dev/null 2>&1; do
        retry=$((retry + 1))
        if [[ $retry -ge $max_retries ]]; then
            return 1
        fi
        sleep 1
    done
    return 0
}

# Cleanup function
cleanup() {
    if [[ "$STARTED_BY_US" == "true" ]] && [[ "$CLEANUP" == "true" ]]; then
        log_step "Stopping containers we started..."
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Main logic
if [[ "$AUTO_DETECT" == "true" ]]; then
    ENVIRONMENT=$(detect_environment)

    if [[ -z "$ENVIRONMENT" ]]; then
        log_warn "No running environment detected"
        log_info "Starting test environment..."
        ENVIRONMENT="test"
        STARTED_BY_US=true
    else
        log_info "Detected environment: $ENVIRONMENT"
        CLEANUP=false  # Don't cleanup containers we didn't start
    fi
else
    log_info "Using specified environment: $ENVIRONMENT"
    STARTED_BY_US=true
fi

# Validate environment
if [[ ! -v ENV_CONFIG[$ENVIRONMENT] ]]; then
    log_error "Unknown environment: $ENVIRONMENT"
    log_error "Valid environments: dev, test, e2e, prod"
    exit 1
fi

# Get connection info
get_connection_info "$ENVIRONMENT"

# Start containers if we need to
if [[ "$STARTED_BY_US" == "true" ]]; then
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    # Clean up any existing containers
    log_step "Cleaning up previous containers..."
    docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true

    # Start containers
    log_step "Starting containers..."
    docker compose -f "$COMPOSE_FILE" up -d 2>&1 | grep -v "^$" || true

    # Re-fetch connection info after containers start
    sleep 2
    get_connection_info "$ENVIRONMENT"

    # Wait for services
    log_step "Waiting for PostgreSQL (port $PG_PORT)..."
    if ! wait_for_postgres "$PG_PORT"; then
        log_error "PostgreSQL failed to start"
        docker compose -f "$COMPOSE_FILE" logs "$PG_CONTAINER" 2>/dev/null || true
        exit 1
    fi

    log_step "Waiting for Redis (port $REDIS_PORT)..."
    if ! wait_for_redis "$REDIS_PORT"; then
        log_error "Redis failed to start"
        docker compose -f "$COMPOSE_FILE" logs "$REDIS_CONTAINER" 2>/dev/null || true
        exit 1
    fi

    log_info "All services ready"
else
    # Verify services are actually responding
    log_step "Verifying services..."

    if [[ -z "$PG_PORT" ]]; then
        log_error "Could not determine PostgreSQL port"
        exit 1
    fi

    if [[ -z "$REDIS_PORT" ]]; then
        log_error "Could not determine Redis port"
        exit 1
    fi

    if ! wait_for_postgres "$PG_PORT"; then
        log_error "PostgreSQL not responding on port $PG_PORT"
        exit 1
    fi

    if ! wait_for_redis "$REDIS_PORT"; then
        log_error "Redis not responding on port $REDIS_PORT"
        exit 1
    fi

    log_info "Services verified"
fi

# Load .env file if it exists (for dev/prod credentials)
if [[ -f ".env" ]] && [[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "prod" ]]; then
    set -a
    source .env
    set +a

    # Override DB_NAME with value from .env if set
    [[ -n "$POSTGRES_DB" ]] && DB_NAME="$POSTGRES_DB"
fi

# Set environment variables for tests
export DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@localhost:${PG_PORT}/${DB_NAME}"
export REDIS_HOST="localhost"
export REDIS_PORT="$REDIS_PORT"
export JWT_SECRET="${JWT_SECRET:-integration_test_secret_key_minimum_32_characters_long}"
export NODE_ENV="test"
[[ -n "$BACKEND_PORT" ]] && export API_BASE_URL="http://localhost:${BACKEND_PORT}"

echo ""
log_info "Configuration:"
log_info "  Environment:  $ENVIRONMENT"
log_info "  Compose:      $COMPOSE_FILE"
log_info "  PostgreSQL:   localhost:$PG_PORT (user: ${POSTGRES_USER:-postgres})"
log_info "  Redis:        localhost:$REDIS_PORT"
log_info "  Database:     $DB_NAME"
echo ""

log_step "Running Integration tests..."
echo ""

# Build test command
TEST_CMD="bun test --config=bunfig.integration.toml"
if [[ -n "$FILTER" ]]; then
    TEST_CMD="$TEST_CMD --test-name-pattern '$FILTER'"
fi
if [[ -n "$FILE" ]]; then
    TEST_CMD="$TEST_CMD ./test/infrastructure/integration/$FILE"
fi

# Run tests
if eval "$TEST_CMD"; then
    echo ""
    log_info "All Integration tests passed!"
    EXIT_CODE=0
else
    echo ""
    log_error "Integration tests failed!"
    EXIT_CODE=1
fi

exit $EXIT_CODE
