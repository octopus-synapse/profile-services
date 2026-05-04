#!/bin/bash
# Shared bash helpers for run-e2e.sh / run-integration.sh and their CI
# variants. Q65 in the duplication audit — both runners had ~95%
# identical container detection / readiness / cleanup logic.
#
# Source from a runner:
#   source "$(dirname "$0")/lib/test-orchestration.sh"

# ─── Pretty-print helpers ──────────────────────────────────────────────
_color_red=$'\033[0;31m'
_color_green=$'\033[0;32m'
_color_yellow=$'\033[0;33m'
_color_blue=$'\033[0;34m'
_color_reset=$'\033[0m'

log_info()    { printf '%s[INFO]%s  %s\n' "$_color_blue"   "$_color_reset" "$*"; }
log_ok()      { printf '%s[OK]%s    %s\n' "$_color_green"  "$_color_reset" "$*"; }
log_warn()    { printf '%s[WARN]%s  %s\n' "$_color_yellow" "$_color_reset" "$*"; }
log_error()   { printf '%s[ERROR]%s %s\n' "$_color_red"    "$_color_reset" "$*" >&2; }

# ─── Container readiness ───────────────────────────────────────────────

# wait_for_postgres <host> <port> [<timeout-seconds>]
wait_for_postgres() {
  local host="$1" port="$2" timeout="${3:-30}"
  log_info "Waiting for Postgres on ${host}:${port} (timeout ${timeout}s)"
  local i
  for ((i = 0; i < timeout; i++)); do
    if pg_isready -h "$host" -p "$port" >/dev/null 2>&1; then
      log_ok "Postgres ready"
      return 0
    fi
    sleep 1
  done
  log_error "Postgres did not become ready within ${timeout}s"
  return 1
}

# wait_for_redis <host> <port> [<timeout-seconds>]
wait_for_redis() {
  local host="$1" port="$2" timeout="${3:-30}"
  log_info "Waiting for Redis on ${host}:${port} (timeout ${timeout}s)"
  local i
  for ((i = 0; i < timeout; i++)); do
    if redis-cli -h "$host" -p "$port" ping 2>/dev/null | grep -q PONG; then
      log_ok "Redis ready"
      return 0
    fi
    sleep 1
  done
  log_error "Redis did not become ready within ${timeout}s"
  return 1
}

# ─── Sharding ──────────────────────────────────────────────────────────

# distribute_files_round_robin <shard-index> <total-shards> <file...>
# Echoes the subset of files belonging to <shard-index>.
distribute_files_round_robin() {
  local shard="$1" total="$2"
  shift 2
  local i=0
  for f in "$@"; do
    if (( i % total == shard )); then
      printf '%s\n' "$f"
    fi
    i=$((i + 1))
  done
}
