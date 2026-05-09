#!/bin/bash
#
# Shared library for the test runners (`run-e2e.sh`, `run-integration.sh`).
#
# Each runner sources this library and calls `tr_run` after declaring the
# suite-specific knobs documented under "Caller-provided variables" below.
# The library handles every concern that is identical across suites:
#
#   - colored loggers + wall-clock timer
#   - CLI flag parsing (`dev|e2e|test|prod`, --no-cleanup, --filter,
#     --verbose, --fresh, --help)
#   - docker-compose environment detection
#   - PostgreSQL / Redis / backend health probes with timeout
#   - exporting test-time `DATABASE_URL` / `REDIS_*` / `JWT_SECRET` etc.
#   - sharded `bun test` execution (with optional filter pattern)
#   - cleanup trap when we started the containers ourselves
#
# Callers must NOT reimplement any of the above — the whole point is one
# canonical implementation. If something looks suite-specific, extend the
# library with a hook (a shell function callers may override) instead of
# forking the orchestration.
#
# Caller-provided variables (set BEFORE sourcing this file):
#
#   TR_LABEL           Short label printed in log lines (e.g. "e2e",
#                      "integration"). Drives the `[$label]` prefix and
#                      the help text fallback.
#   TR_SPEC_DIR        Directory the runner scans for `*.spec.ts` files
#                      (e.g. `test/infrastructure/e2e`).
#   TR_BUNFIG          `bunfig.toml` to pass to `bun test --config=`
#                      (e.g. `bunfig.e2e.toml`).
#   TR_DEFAULT_SHARDS  Default value of $SHARDS when the user does not
#                      override it. Use 3 for e2e, 1 for integration.
#   TR_DEFAULT_ENV     Environment chosen automatically when no
#                      containers are running and the shell is
#                      non-interactive (CI) — typically "e2e".
#   TR_PRESEED_CMD     Command run once (bash-eval'd) before sharded
#                      execution to seed catalogs. Empty string skips
#                      pre-seeding entirely.
#
# Hooks (override after sourcing if needed):
#
#   tr_extra_env_exports  Called after the standard env exports; lets
#                         callers set extra variables a suite needs.

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Loggers ─────────────────────────────────────────────────────────
log_info()   { echo -e "${GREEN}[${TR_LABEL}]${NC} $1"; }
log_warn()   { echo -e "${YELLOW}[${TR_LABEL}]${NC} $1"; }
log_error()  { echo -e "${RED}[${TR_LABEL}]${NC} $1"; }
log_step()   { echo -e "${BLUE}[${TR_LABEL}]${NC} $1"; }
log_detect() { echo -e "${CYAN}[detect]${NC} $1" >&2; }

# ─── Wall-clock timer ────────────────────────────────────────────────
SCRIPT_START_NS=$(date +%s%N)
fmt_elapsed() {
    local end_ns
    end_ns=$(date +%s%N)
    local elapsed_ms=$(( (end_ns - SCRIPT_START_NS) / 1000000 ))
    if (( elapsed_ms < 1000 )); then
        printf '%dms' "$elapsed_ms"
    else
        local secs=$(( elapsed_ms / 1000 ))
        local rem=$(( elapsed_ms % 1000 ))
        printf '%d.%03ds' "$secs" "$rem"
    fi
}

# ─── Compose environment registry ────────────────────────────────────
# Format: COMPOSE_FILE|PG_CONTAINER|REDIS_CONTAINER|BACKEND_CONTAINER|DB_NAME
declare -A ENV_CONFIG=(
    ["dev"]="docker-compose.dev.yml|profile-postgres-dev|profile-redis-dev|profile-backend-dev|profile_dev"
    ["e2e"]="docker-compose.e2e.yml|profile-postgres-e2e|profile-redis-e2e|profile-services-e2e|profile_test"
    ["test"]="docker-compose.test.yml|profile-postgres-test|profile-redis-test||profile_test"
    ["prod"]="docker-compose.yml|profile-postgres|profile-redis|profile-backend|profile"
)

# Default host ports per environment (fallback when the container does
# not publish a port — i.e. only joined to a private docker network and
# accessed via host networking through another mapping like a sibling
# stack publishing the same internal port).
declare -A DEFAULT_PG_PORT=(
    ["dev"]="5432" ["e2e"]="5433" ["test"]="5433" ["prod"]="5432"
)
declare -A DEFAULT_REDIS_PORT=(
    ["dev"]="6379" ["e2e"]="6380" ["test"]="6380" ["prod"]="6379"
)
declare -A DEFAULT_BACKEND_PORT=(
    ["dev"]="3001" ["e2e"]="3001" ["prod"]="3001"
)

# ─── Container helpers ───────────────────────────────────────────────
get_container_port() {
    local container=$1
    local internal_port=$2
    docker port "$container" "$internal_port" 2>/dev/null | head -1 | cut -d: -f2 || echo ""
}

is_container_running() {
    docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$1$"
}

detect_environment() {
    [[ "$VERBOSE" == "true" ]] && log_detect "Scanning for running containers..."
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

get_connection_info() {
    local env=$1
    IFS='|' read -r compose_file pg_container redis_container backend_container db_name <<< "${ENV_CONFIG[$env]}"

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

# ─── Service waiters ─────────────────────────────────────────────────
wait_for_postgres() {
    local port=$1
    local max_retries=30
    local retry=0
    if command -v pg_isready > /dev/null 2>&1; then
        while ! pg_isready -h localhost -p "$port" -U postgres > /dev/null 2>&1; do
            retry=$((retry + 1))
            (( retry >= max_retries )) && return 1
            sleep 1
        done
    else
        while ! nc -z localhost "$port" > /dev/null 2>&1; do
            retry=$((retry + 1))
            (( retry >= max_retries )) && return 1
            sleep 1
        done
    fi
    return 0
}

wait_for_redis() {
    local port=$1
    local max_retries=30
    local retry=0
    while ! nc -z localhost "$port" > /dev/null 2>&1; do
        retry=$((retry + 1))
        (( retry >= max_retries )) && return 1
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
        (( retry >= max_retries )) && return 1
        sleep 1
    done
    return 0
}

# ─── CLI parsing ─────────────────────────────────────────────────────
# Sets ENVIRONMENT / CLEANUP / VERBOSE / FILTER / AUTO_DETECT / FRESH
# from the runner's positional + flag args.
tr_parse_args() {
    ENVIRONMENT=""
    CLEANUP=true
    VERBOSE=false
    FILTER=""
    AUTO_DETECT=true
    STARTED_BY_US=false
    FRESH=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|e2e|test|prod)
                ENVIRONMENT="$1"; AUTO_DETECT=false; shift ;;
            --no-cleanup) CLEANUP=false; shift ;;
            --verbose)    VERBOSE=true; shift ;;
            --filter)     FILTER="$2"; shift 2 ;;
            --fresh)      FRESH=true; shift ;;
            --help|-h)
                cat <<EOF
${TR_LABEL} test runner

Usage:
  ./scripts/run-${TR_LABEL}.sh [environment] [options]

Environments (omit for auto-detect):
  dev   development containers (docker-compose.dev.yml)
  e2e   isolated e2e env       (docker-compose.e2e.yml)
  test  postgres-only test     (docker-compose.test.yml)
  prod  production-like        (docker-compose.yml)

Options:
  --no-cleanup    Don't stop containers after tests
  --filter <pat>  Run only tests whose name matches <pat>
  --verbose       Verbose detection logging
  --fresh         Tear down + rebuild detected env before running
EOF
                exit 0 ;;
            *) log_error "Unknown option: $1"; exit 1 ;;
        esac
    done
}

# ─── Cleanup trap ────────────────────────────────────────────────────
tr_cleanup() {
    if [[ "${STARTED_BY_US:-false}" == "true" ]] && [[ "${CLEANUP:-true}" == "true" ]]; then
        log_step "Stopping containers we started..."
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
    fi
}

# ─── Bring services up (or verify they're up) ────────────────────────
tr_ensure_services() {
    if [[ "$AUTO_DETECT" == "true" ]]; then
        ENVIRONMENT=$(detect_environment)
        if [[ -z "$ENVIRONMENT" ]]; then
            if [[ -t 0 ]] && [[ -t 1 ]]; then
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
                log_warn "No running environment detected; defaulting to ${TR_DEFAULT_ENV}"
                ENVIRONMENT="$TR_DEFAULT_ENV"
            fi
            STARTED_BY_US=true
        else
            log_info "Detected environment: $ENVIRONMENT"
            if [[ "$FRESH" == "true" ]]; then
                log_warn "--fresh requested: tearing down running $ENVIRONMENT before re-starting"
                STARTED_BY_US=true
            else
                CLEANUP=false
            fi
        fi
    else
        log_info "Using specified environment: $ENVIRONMENT"
        STARTED_BY_US=true
    fi

    if [[ ! -v ENV_CONFIG[$ENVIRONMENT] ]]; then
        log_error "Unknown environment: $ENVIRONMENT"
        log_error "Valid environments: dev, e2e, test, prod"
        exit 1
    fi

    get_connection_info "$ENVIRONMENT"

    if [[ "$STARTED_BY_US" == "true" ]]; then
        if [[ ! -f "$COMPOSE_FILE" ]]; then
            log_error "Compose file not found: $COMPOSE_FILE"
            exit 1
        fi

        log_step "Cleaning up previous containers..."
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true

        # `--renew-anon-volumes` discards the anonymous `/app/node_modules`
        # volume from the previous run so a freshly rebuilt backend image
        # isn't shadowed by stale dependencies.
        log_step "Starting containers..."
        docker compose -f "$COMPOSE_FILE" up -d --renew-anon-volumes 2>&1 | grep -v "^$" || true

        sleep 2
        get_connection_info "$ENVIRONMENT"

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
        log_step "Verifying services..."
        [[ -z "$PG_PORT" ]]    && { log_error "Could not determine PostgreSQL port"; exit 1; }
        [[ -z "$REDIS_PORT" ]] && { log_error "Could not determine Redis port"; exit 1; }

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
                log_warn "Backend not responding on port $BACKEND_PORT — tests may fail if they need the API"
            fi
        fi
        log_info "Services verified"
    fi
}

# ─── Export env vars consumed by the test process ────────────────────
tr_export_env() {
    if [[ -f ".env" ]] && [[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "prod" ]]; then
        set -a
        # shellcheck disable=SC1091
        source .env
        set +a
        [[ -n "${POSTGRES_DB:-}" ]] && DB_NAME="$POSTGRES_DB"
    fi

    export DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@localhost:${PG_PORT}/${DB_NAME}"
    export REDIS_HOST="localhost"
    export REDIS_PORT="$REDIS_PORT"
    export JWT_SECRET="${JWT_SECRET:-test_secret_key_minimum_32_characters_long_pad}"
    export NODE_ENV="test"
    [[ -n "$BACKEND_PORT" ]] && export API_BASE_URL="http://localhost:${BACKEND_PORT}"

    # Optional caller hook for suite-specific exports.
    if declare -F tr_extra_env_exports > /dev/null 2>&1; then
        tr_extra_env_exports
    fi
}

# ─── Print the resolved configuration banner ─────────────────────────
tr_print_banner() {
    echo ""
    log_info "Configuration:"
    log_info "  Environment:  $ENVIRONMENT"
    log_info "  Compose:      $COMPOSE_FILE"
    log_info "  PostgreSQL:   localhost:$PG_PORT (user: ${POSTGRES_USER:-postgres})"
    log_info "  Redis:        localhost:$REDIS_PORT"
    [[ -n "$BACKEND_PORT" ]] && log_info "  Backend:      localhost:$BACKEND_PORT"
    log_info "  Database:     $DB_NAME"
    log_info "  Bunfig:       $TR_BUNFIG"
    log_info "  Spec dir:     $TR_SPEC_DIR"
    echo ""
}

# ─── Run the test suite (sharded if SHARDS>1) ────────────────────────
tr_run_tests() {
    local shards="${SHARDS:-$TR_DEFAULT_SHARDS}"

    mapfile -t ALL_FILES < <(find "$TR_SPEC_DIR" -name "*.spec.ts" | sort)
    local total=${#ALL_FILES[@]}

    if (( total == 0 )); then
        log_error "No spec files found under ${TR_SPEC_DIR}/"
        return 1
    fi

    # Cap shard count by file count.
    if (( shards > total )); then
        shards=$total
    fi

    # Pre-seed once before fanning out workers so they don't fight over
    # catalog upserts at boot. Skipped when sharding is disabled or the
    # caller has nothing to seed.
    if (( shards > 1 )) && [[ -n "${TR_PRESEED_CMD:-}" ]]; then
        log_info "Pre-seeding catalogs..."
        if ! eval "$TR_PRESEED_CMD"; then
            log_error "Pre-seed failed"
            return 1
        fi
        export E2E_SKIP_SEED=1
    fi

    log_step "Running ${TR_LABEL} tests..."
    echo ""

    local exit_code=0
    if (( shards == 1 )); then
        log_info "Running ${total} spec file(s) in a single process..."
        if [[ -n "$FILTER" ]]; then
            bun test --config="$TR_BUNFIG" --concurrent --max-concurrency=8 \
                --test-name-pattern "$FILTER" "${ALL_FILES[@]}" || exit_code=$?
        else
            bun test --config="$TR_BUNFIG" --concurrent --max-concurrency=8 \
                "${ALL_FILES[@]}" || exit_code=$?
        fi
    else
        log_info "Sharding ${total} spec file(s) across ${shards} process(es)..."
        local -a shard_pids=() shard_logs=()

        local i j
        for ((i=0; i<shards; i++)); do
            local -a shard_files=()
            for ((j=i; j<total; j+=shards)); do
                shard_files+=("${ALL_FILES[$j]}")
            done

            local log_file
            log_file=$(mktemp)
            shard_logs+=("$log_file")

            if [[ -n "$FILTER" ]]; then
                (bun test --config="$TR_BUNFIG" --concurrent --max-concurrency=8 \
                    --test-name-pattern "$FILTER" "${shard_files[@]}" >"$log_file" 2>&1) &
            else
                (bun test --config="$TR_BUNFIG" --concurrent --max-concurrency=8 \
                    "${shard_files[@]}" >"$log_file" 2>&1) &
            fi
            shard_pids+=("$!")
        done

        for ((i=0; i<shards; i++)); do
            if ! wait "${shard_pids[$i]}"; then
                exit_code=1
            fi
            echo ""
            echo "=============================================================="
            echo "  Shard $((i+1))/${shards}"
            echo "=============================================================="
            cat "${shard_logs[$i]}"
            rm -f "${shard_logs[$i]}"
        done
    fi

    return $exit_code
}

# ─── Main entry point ────────────────────────────────────────────────
tr_run() {
    : "${TR_LABEL:?TR_LABEL must be set}"
    : "${TR_SPEC_DIR:?TR_SPEC_DIR must be set}"
    : "${TR_BUNFIG:?TR_BUNFIG must be set}"
    : "${TR_DEFAULT_SHARDS:?TR_DEFAULT_SHARDS must be set}"
    : "${TR_DEFAULT_ENV:?TR_DEFAULT_ENV must be set}"
    : "${TR_PRESEED_CMD:=}"

    tr_parse_args "$@"
    trap tr_cleanup EXIT

    tr_ensure_services
    tr_export_env
    tr_print_banner

    local exit_code=0
    tr_run_tests || exit_code=$?

    echo ""
    if (( exit_code == 0 )); then
        log_info "All ${TR_LABEL} tests passed!  (total wall-clock: $(fmt_elapsed))"
    else
        log_error "${TR_LABEL} tests failed!  (total wall-clock: $(fmt_elapsed))"
    fi
    return $exit_code
}
