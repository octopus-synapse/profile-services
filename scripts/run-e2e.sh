#!/bin/bash
#
# Smart E2E Test Runner
#
# Auto-detects running docker-compose environment and runs E2E tests.
# If no environment is detected, starts the e2e environment.
#
# Usage:
#   ./scripts/run-e2e.sh [options]
#   ./scripts/run-e2e.sh [environment] [options]
#
# Auto-detect mode (recommended):
#   ./scripts/run-e2e.sh              # Detects running containers, runs tests
#
# Manual mode:
#   ./scripts/run-e2e.sh dev          # Force dev environment
#   ./scripts/run-e2e.sh e2e          # Force e2e environment
#   ./scripts/run-e2e.sh prod         # Force prod environment
#
# Options:
#   --no-cleanup    Don't stop containers after tests (only for manual mode)
#   --filter <pat>  Run only tests matching pattern
#   --verbose       Show more output
#
# Examples:
#   docker compose -f docker-compose.dev.yml up -d
#   ./scripts/run-e2e.sh              # Auto-detects dev, runs tests
#
#   ./scripts/run-e2e.sh e2e          # Starts e2e env, runs tests, stops
#   ./scripts/run-e2e.sh --filter auth

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[e2e]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[e2e]${NC} $1"; }
log_error() { echo -e "${RED}[e2e]${NC} $1"; }
log_step() { echo -e "${BLUE}[e2e]${NC} $1"; }
log_detect() { echo -e "${CYAN}[detect]${NC} $1" >&2; }

# Defaults
ENVIRONMENT=""
CLEANUP=true
VERBOSE=false
FILTER=""
AUTO_DETECT=true
STARTED_BY_US=false
FRESH=false

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
        --fresh) FRESH=true; shift ;;
        --help|-h)
            head -30 "$0" | tail -28
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
    for env in dev e2e test prod; do
        IFS='|' read -r _ pg_container redis_container _ _ <<< "${ENV_CONFIG[$env]}"

        if is_container_running "$pg_container" && is_container_running "$redis_container"; then
            [[ "$VERBOSE" == "true" ]] && log_detect "Found $env containers running"
            echo "$env"
            return 0
        fi
    done

    echo ""
}

# Default host ports per environment (fallback when the container does
# not publish a port — i.e. only joined to a private docker network and
# accessed via host networking through another mapping like a sibling
# stack publishing the same internal port).
declare -A DEFAULT_PG_PORT=(
    ["dev"]="5432"
    ["e2e"]="5433"
    ["test"]="5433"
    ["prod"]="5432"
)
declare -A DEFAULT_REDIS_PORT=(
    ["dev"]="6379"
    ["e2e"]="6380"
    ["test"]="6380"
    ["prod"]="6379"
)
declare -A DEFAULT_BACKEND_PORT=(
    ["dev"]="3001"
    ["e2e"]="3001"
    ["prod"]="3001"
)

# Get connection info for a detected environment
get_connection_info() {
    local env=$1
    IFS='|' read -r compose_file pg_container redis_container backend_container db_name <<< "${ENV_CONFIG[$env]}"

    # Get actual exposed ports from running containers; fall back to the
    # environment's canonical default port when the container is on a
    # private network without a host mapping.
    PG_PORT=$(get_container_port "$pg_container" 5432)
    [[ -z "$PG_PORT" ]] && PG_PORT="${DEFAULT_PG_PORT[$env]:-5432}"
    REDIS_PORT=$(get_container_port "$redis_container" 6379)
    [[ -z "$REDIS_PORT" ]] && REDIS_PORT="${DEFAULT_REDIS_PORT[$env]:-6379}"

    if [[ -n "$backend_container" ]] && is_container_running "$backend_container"; then
        BACKEND_PORT=$(get_container_port "$backend_container" 3001)
        [[ -z "$BACKEND_PORT" ]] && BACKEND_PORT="${DEFAULT_BACKEND_PORT[$env]:-3001}"
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

wait_for_backend() {
    local port=$1
    local max_retries=60
    local retry=0

    while ! curl -sf "http://localhost:${port}/api/health" > /dev/null 2>&1; do
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
        if [[ -t 0 ]] && [[ -t 1 ]]; then
            # Interactive terminal: present arrow-key menu via `select`.
            log_warn "No running environment detected"
            log_info "Pick an environment to start (↑/↓ + Enter, Ctrl-C to abort):"
            PS3="> "
            select choice in "dev (development containers)" "e2e (isolated e2e env)" "test (postgres-only test)" "prod (production-like)"; do
                case $REPLY in
                    1) ENVIRONMENT="dev"; break ;;
                    2) ENVIRONMENT="e2e"; break ;;
                    3) ENVIRONMENT="test"; break ;;
                    4) ENVIRONMENT="prod"; break ;;
                    *) echo "Invalid choice. Try again." ;;
                esac
            done
        else
            # Non-interactive (CI): default to e2e.
            log_warn "No running environment detected; defaulting to e2e"
            ENVIRONMENT="e2e"
        fi
        STARTED_BY_US=true
    else
        log_info "Detected environment: $ENVIRONMENT"
        if [[ "$FRESH" == "true" ]]; then
            log_warn "--fresh requested: tearing down running $ENVIRONMENT before re-starting"
            STARTED_BY_US=true
        else
            CLEANUP=false  # Don't cleanup containers we didn't start
        fi
    fi
else
    log_info "Using specified environment: $ENVIRONMENT"
    STARTED_BY_US=true
fi

# Validate environment
if [[ ! -v ENV_CONFIG[$ENVIRONMENT] ]]; then
    log_error "Unknown environment: $ENVIRONMENT"
    log_error "Valid environments: dev, e2e, test, prod"
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

    # Wait for backend if it exists in this compose
    if [[ -n "$BACKEND_CONTAINER" ]] && [[ -n "$BACKEND_PORT" ]]; then
        log_step "Waiting for Backend (port $BACKEND_PORT)..."
        if ! wait_for_backend "$BACKEND_PORT"; then
            log_error "Backend failed to start"
            docker compose -f "$COMPOSE_FILE" logs "$BACKEND_CONTAINER" 2>/dev/null || true
            exit 1
        fi
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

    if [[ -n "$BACKEND_CONTAINER" ]] && [[ -n "$BACKEND_PORT" ]]; then
        if ! curl -sf "http://localhost:${BACKEND_PORT}/api/health" > /dev/null 2>&1; then
            log_warn "Backend not responding on port $BACKEND_PORT - tests may fail if they need the API"
        fi
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
export JWT_SECRET="${JWT_SECRET:-e2e_test_secret_key_minimum_32_characters_long}"
export NODE_ENV="test"
[[ -n "$BACKEND_PORT" ]] && export API_BASE_URL="http://localhost:${BACKEND_PORT}"

echo ""
log_info "Configuration:"
log_info "  Environment:  $ENVIRONMENT"
log_info "  Compose:      $COMPOSE_FILE"
log_info "  PostgreSQL:   localhost:$PG_PORT (user: ${POSTGRES_USER:-postgres})"
log_info "  Redis:        localhost:$REDIS_PORT"
[[ -n "$BACKEND_PORT" ]] && log_info "  Backend:      localhost:$BACKEND_PORT"
log_info "  Database:     $DB_NAME"
echo ""

log_step "Running E2E tests..."
echo ""

# Multi-process sharding. Bun is single-process per `bun test`
# invocation, so wall-clock time is dominated by the longest file
# in the suite. We split the spec list across $SHARDS workers,
# each with its own Bun process, all hitting the same shared
# Postgres / Redis. Fixtures use `freshUser()` (random emails) to
# avoid cross-process row collisions; the admin singleton is
# upserted (`ensureAdminUser`) so 4 workers booting at once don't
# race on the unique constraint.
#
# Override via `SHARDS=N bun run test:e2e` (default 3, which is the
# sweet spot on a 4-core box: 3 workers + Postgres + I/O leaves a
# core idle so the kernel scheduler doesn't thrash). Set `SHARDS=1`
# to disable sharding entirely.
#
# Within each shard we still pass `--concurrent --max-concurrency=8`
# so tests inside a file run in parallel where they can.
SHARDS="${SHARDS:-3}"

mapfile -t ALL_FILES < <(find test/infrastructure/e2e -name "*.spec.ts" | sort)
TOTAL_FILES=${#ALL_FILES[@]}

if [[ $TOTAL_FILES -eq 0 ]]; then
    log_error "No e2e spec files found under test/infrastructure/e2e/"
    exit 1
fi

# Cap shard count by file count — splitting 10 files into 16 shards
# leaves shards with nothing to run.
if (( SHARDS > TOTAL_FILES )); then
    SHARDS=$TOTAL_FILES
fi

# Pre-seed once before fanning out workers (only if sharding) so
# they don't fight over the catalog upserts at boot.
if [[ $SHARDS -gt 1 ]]; then
    log_info "Pre-seeding catalogs..."
    if ! bun scripts/_e2e-preseed.ts; then
        log_error "Pre-seed failed"
        exit 1
    fi
    export E2E_SKIP_SEED=1
fi

if [[ $SHARDS -eq 1 ]]; then
    log_info "Running ${TOTAL_FILES} spec file(s) in a single process..."
    if [[ -n "$FILTER" ]]; then
        bun test --config=bunfig.e2e.toml --concurrent --max-concurrency=8 \
            --test-name-pattern "$FILTER" "${ALL_FILES[@]}"
    else
        bun test --config=bunfig.e2e.toml --concurrent --max-concurrency=8 "${ALL_FILES[@]}"
    fi
    EXIT_CODE=$?
else
    log_info "Sharding ${TOTAL_FILES} spec file(s) across ${SHARDS} process(es)..."
    declare -a SHARD_PIDS=()
    declare -a SHARD_LOGS=()

    for ((i=0; i<SHARDS; i++)); do
        # Round-robin distribution: file N goes to shard (N mod SHARDS).
        # Tends to balance better than chunked when files have very
        # different runtimes.
        SHARD_FILES=()
        for ((j=i; j<TOTAL_FILES; j+=SHARDS)); do
            SHARD_FILES+=("${ALL_FILES[$j]}")
        done

        log_file=$(mktemp)
        SHARD_LOGS+=("$log_file")

        if [[ -n "$FILTER" ]]; then
            (bun test --config=bunfig.e2e.toml --concurrent --max-concurrency=8 \
                --test-name-pattern "$FILTER" "${SHARD_FILES[@]}" >"$log_file" 2>&1) &
        else
            (bun test --config=bunfig.e2e.toml --concurrent --max-concurrency=8 \
                "${SHARD_FILES[@]}" >"$log_file" 2>&1) &
        fi
        SHARD_PIDS+=("$!")
    done

    EXIT_CODE=0
    for ((i=0; i<SHARDS; i++)); do
        if ! wait "${SHARD_PIDS[$i]}"; then
            EXIT_CODE=1
        fi
        echo ""
        echo "=============================================================="
        echo "  Shard $((i+1))/${SHARDS}"
        echo "=============================================================="
        cat "${SHARD_LOGS[$i]}"
        rm -f "${SHARD_LOGS[$i]}"
    done
fi

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
    log_info "All E2E tests passed!"
else
    log_error "E2E tests failed!"
fi

exit $EXIT_CODE
