#!/bin/bash
# generate-ci-card.sh - Generate CI Pipeline SVG card from attestation and CI metrics
#
# Usage: ./generate-ci-card.sh <attestation-json> <ci-metrics-json>
#
# Inputs:
#   $1: Path to .attestation JSON file (pre-commit metrics)
#   $2: Path to CI metrics JSON file (from workflow outputs)
#
# Environment:
#   GITHUB_SHA, GITHUB_REF_NAME, GITHUB_RUN_NUMBER (optional, from GitHub Actions)
#
# Output: SVG to stdout

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="${SCRIPT_DIR}/../templates/ci-card-template.svg"

# Colors
COLOR_SUCCESS="#22c55e"
COLOR_FAIL="#ef4444"
COLOR_WARNING="#f59e0b"
COLOR_SKIP="#f59e0b"
COLOR_PENDING="#44403c"
COLOR_MUTED="#44403c"
COLOR_TEXT="#e7e5e4"
COLOR_TEXT_MUTED="#78716c"
COLOR_TIME="#a8a29e"

# Validate inputs
if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <attestation-json> <ci-metrics-json>" >&2
  exit 1
fi

ATTESTATION_FILE="$1"
CI_METRICS_FILE="$2"

if [[ ! -f "$ATTESTATION_FILE" ]]; then
  echo "Error: Attestation file not found: $ATTESTATION_FILE" >&2
  exit 1
fi

if [[ ! -f "$CI_METRICS_FILE" ]]; then
  echo "Error: CI metrics file not found: $CI_METRICS_FILE" >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "Error: Template file not found: $TEMPLATE_PATH" >&2
  exit 1
fi

# Helper: Format milliseconds to human readable
format_time() {
  local ms="$1"
  if [[ "$ms" == "null" || -z "$ms" || "$ms" == "0" ]]; then
    echo "—"
    return
  fi

  local seconds=$((ms / 1000))
  local minutes=$((seconds / 60))
  local remaining_seconds=$((seconds % 60))

  if [[ $minutes -gt 0 ]]; then
    echo "${minutes}:$(printf '%02d' $remaining_seconds)"
  else
    local decimal_part=$((ms % 1000 / 100))
    echo "${seconds}.${decimal_part}s"
  fi
}

# Helper: Get status color
get_status_color() {
  local status="$1"
  case "$status" in
    "ok"|"success"|"passed") echo "$COLOR_SUCCESS" ;;
    "fail"|"failed"|"error") echo "$COLOR_FAIL" ;;
    "running"|"in_progress") echo "$COLOR_WARNING" ;;
    "skip"|"skipped"|"pending") echo "$COLOR_PENDING" ;;
    *) echo "$COLOR_PENDING" ;;
  esac
}

# Helper: Get fail color (red if > 0, muted otherwise)
get_fail_color() {
  local count="$1"
  if [[ "$count" == "null" || -z "$count" || "$count" == "0" ]]; then
    echo "$COLOR_MUTED"
  else
    echo "$COLOR_FAIL"
  fi
}

# Helper: Get skip color (yellow if > 0, muted otherwise)
get_skip_color() {
  local count="$1"
  if [[ "$count" == "null" || -z "$count" || "$count" == "0" ]]; then
    echo "$COLOR_MUTED"
  else
    echo "$COLOR_SKIP"
  fi
}

# Helper: Safe jq extraction with default
jq_safe() {
  local json="$1"
  local path="$2"
  local default="${3:-0}"
  local result
  result=$(printf '%s' "$json" | jq -r "$path // \"$default\"" 2>/dev/null || printf '%s' "$default")
  printf '%s' "${result:-$default}"
}

# Read JSON files
ATTESTATION=$(cat "$ATTESTATION_FILE")
CI_METRICS=$(cat "$CI_METRICS_FILE")

# === PARSE ATTESTATION (PRE-COMMIT) ===

# Swagger
SWAGGER_STATUS=$(jq_safe "$ATTESTATION" '.metrics.swagger.status' 'pending')
SWAGGER_TIME_MS=$(jq_safe "$ATTESTATION" '.metrics.swagger.time_ms' '0')
SWAGGER_TIME=$(format_time "$SWAGGER_TIME_MS")
SWAGGER_STATUS_COLOR=$(get_status_color "$SWAGGER_STATUS")

# TypeCheck
TYPECHECK_STATUS=$(jq_safe "$ATTESTATION" '.metrics.typecheck.status' 'pending')
TYPECHECK_TIME_MS=$(jq_safe "$ATTESTATION" '.metrics.typecheck.time_ms' '0')
TYPECHECK_TIME=$(format_time "$TYPECHECK_TIME_MS")
TYPECHECK_STATUS_COLOR=$(get_status_color "$TYPECHECK_STATUS")
TYPECHECK_ERRORS=$(jq_safe "$ATTESTATION" '.metrics.typecheck.errors' '0')
TYPECHECK_FAIL_COLOR=$(get_fail_color "$TYPECHECK_ERRORS")

# Lint
LINT_STATUS=$(jq_safe "$ATTESTATION" '.metrics.lint.status' 'pending')
LINT_TIME_MS=$(jq_safe "$ATTESTATION" '.metrics.lint.time_ms' '0')
LINT_TIME=$(format_time "$LINT_TIME_MS")
LINT_STATUS_COLOR=$(get_status_color "$LINT_STATUS")
LINT_FILES=$(jq_safe "$ATTESTATION" '.metrics.lint.files' '—')
LINT_ERRORS=$(jq_safe "$ATTESTATION" '.metrics.lint.errors' '0')
LINT_FAIL_COLOR=$(get_fail_color "$LINT_ERRORS")

# Unit tests
UNIT_STATUS=$(jq_safe "$ATTESTATION" '.metrics.unit.status' 'pending')
UNIT_TIME_MS=$(jq_safe "$ATTESTATION" '.metrics.unit.time_ms' '0')
UNIT_TIME=$(format_time "$UNIT_TIME_MS")
UNIT_STATUS_COLOR=$(get_status_color "$UNIT_STATUS")
UNIT_PASSED=$(jq_safe "$ATTESTATION" '.metrics.unit.passed' '0')
UNIT_FAILED=$(jq_safe "$ATTESTATION" '.metrics.unit.failed' '0')
UNIT_SKIPPED=$(jq_safe "$ATTESTATION" '.metrics.unit.skipped' '0')
UNIT_TOTAL=$((UNIT_PASSED + UNIT_FAILED + UNIT_SKIPPED))
UNIT_SUITES=$(jq_safe "$ATTESTATION" '.metrics.unit.suites' '—')
UNIT_FAIL_COLOR=$(get_fail_color "$UNIT_FAILED")

# Arch tests
ARCH_STATUS=$(jq_safe "$ATTESTATION" '.metrics.arch.status' 'pending')
ARCH_TIME_MS=$(jq_safe "$ATTESTATION" '.metrics.arch.time_ms' '0')
ARCH_TIME=$(format_time "$ARCH_TIME_MS")
ARCH_STATUS_COLOR=$(get_status_color "$ARCH_STATUS")
ARCH_PASSED=$(jq_safe "$ATTESTATION" '.metrics.arch.passed' '0')
ARCH_FAILED=$(jq_safe "$ATTESTATION" '.metrics.arch.failed' '0')
ARCH_SKIPPED=$(jq_safe "$ATTESTATION" '.metrics.arch.skipped' '0')
ARCH_TOTAL=$((ARCH_PASSED + ARCH_FAILED + ARCH_SKIPPED))
ARCH_SUITES=$(jq_safe "$ATTESTATION" '.metrics.arch.suites' '—')
ARCH_FAIL_COLOR=$(get_fail_color "$ARCH_FAILED")

# Contracts tests
CONTRACTS_STATUS=$(jq_safe "$ATTESTATION" '.metrics.contracts.status' 'pending')
CONTRACTS_TIME_MS=$(jq_safe "$ATTESTATION" '.metrics.contracts.time_ms' '0')
CONTRACTS_TIME=$(format_time "$CONTRACTS_TIME_MS")
CONTRACTS_STATUS_COLOR=$(get_status_color "$CONTRACTS_STATUS")
CONTRACTS_PASSED=$(jq_safe "$ATTESTATION" '.metrics.contracts.passed' '0')
CONTRACTS_FAILED=$(jq_safe "$ATTESTATION" '.metrics.contracts.failed' '0')
CONTRACTS_SKIPPED=$(jq_safe "$ATTESTATION" '.metrics.contracts.skipped' '0')
CONTRACTS_TOTAL=$((CONTRACTS_PASSED + CONTRACTS_FAILED + CONTRACTS_SKIPPED))
CONTRACTS_SUITES=$(jq_safe "$ATTESTATION" '.metrics.contracts.suites' '—')
CONTRACTS_FAIL_COLOR=$(get_fail_color "$CONTRACTS_FAILED")

# Pre-commit totals
PRECOMMIT_TOTAL_TIME_MS=$((SWAGGER_TIME_MS + TYPECHECK_TIME_MS + LINT_TIME_MS + UNIT_TIME_MS + ARCH_TIME_MS + CONTRACTS_TIME_MS))
PRECOMMIT_TOTAL_TIME=$(format_time "$PRECOMMIT_TOTAL_TIME_MS")
PRECOMMIT_TOTAL_TESTS=$((UNIT_TOTAL + ARCH_TOTAL + CONTRACTS_TOTAL))
PRECOMMIT_TOTAL_PASS=$((UNIT_PASSED + ARCH_PASSED + CONTRACTS_PASSED))
PRECOMMIT_TOTAL_FAIL=$((UNIT_FAILED + ARCH_FAILED + CONTRACTS_FAILED))
PRECOMMIT_TOTAL_SUITES="—"
if [[ "$UNIT_SUITES" != "—" ]]; then
  PRECOMMIT_TOTAL_SUITES=$((UNIT_SUITES + ARCH_SUITES + CONTRACTS_SUITES))
fi
PRECOMMIT_TOTAL_FAIL_COLOR=$(get_fail_color "$PRECOMMIT_TOTAL_FAIL")

# Attestation hash
ATTESTATION_HASH=$(jq_safe "$ATTESTATION" '.tree_hash' '')
ATTESTATION_HASH="${ATTESTATION_HASH:0:32}"

# === PARSE CI METRICS ===

# Build
BUILD_STATUS=$(jq_safe "$CI_METRICS" '.build.status' 'pending')
BUILD_TIME_MS=$(jq_safe "$CI_METRICS" '.build.duration_ms' '0')
BUILD_TIME=$(format_time "$BUILD_TIME_MS")
BUILD_STATUS_COLOR=$(get_status_color "$BUILD_STATUS")
BUILD_TEXT_COLOR="$COLOR_TEXT"
BUILD_TIME_COLOR="$COLOR_TIME"
if [[ "$BUILD_STATUS" == "pending" ]]; then
  BUILD_TEXT_COLOR="$COLOR_TEXT_MUTED"
  BUILD_TIME="—"
  BUILD_TIME_COLOR="$COLOR_PENDING"
elif [[ "$BUILD_STATUS" == "running" ]]; then
  BUILD_TIME="..."
  BUILD_TIME_COLOR="$COLOR_WARNING"
fi

# Integration
INTEGRATION_STATUS=$(jq_safe "$CI_METRICS" '.integration.status' 'pending')
INTEGRATION_TIME_MS=$(jq_safe "$CI_METRICS" '.integration.duration_ms' '0')
INTEGRATION_TIME=$(format_time "$INTEGRATION_TIME_MS")
INTEGRATION_STATUS_COLOR=$(get_status_color "$INTEGRATION_STATUS")
INTEGRATION_PASSED=$(jq_safe "$CI_METRICS" '.integration.passed' '0')
INTEGRATION_FAILED=$(jq_safe "$CI_METRICS" '.integration.failed' '0')
INTEGRATION_TOTAL=$((INTEGRATION_PASSED + INTEGRATION_FAILED))
INTEGRATION_SUITES=$(jq_safe "$CI_METRICS" '.integration.suites' '—')
INTEGRATION_TEXT_COLOR="$COLOR_TEXT"
INTEGRATION_TIME_COLOR="$COLOR_TIME"
INTEGRATION_FAIL_COLOR=$(get_fail_color "$INTEGRATION_FAILED")
INTEGRATION_FAIL_WEIGHT=""
if [[ "$INTEGRATION_FAILED" -gt 0 ]]; then
  INTEGRATION_FAIL_WEIGHT='font-weight="600"'
fi
if [[ "$INTEGRATION_STATUS" == "pending" ]]; then
  INTEGRATION_TEXT_COLOR="$COLOR_TEXT_MUTED"
  INTEGRATION_TIME="—"
  INTEGRATION_TIME_COLOR="$COLOR_PENDING"
  INTEGRATION_SUITES="—"
  INTEGRATION_TOTAL="—"
  INTEGRATION_PASSED="—"
  INTEGRATION_FAILED="—"
elif [[ "$INTEGRATION_STATUS" == "running" ]]; then
  INTEGRATION_TIME="..."
  INTEGRATION_TIME_COLOR="$COLOR_WARNING"
  INTEGRATION_SUITES="—"
  INTEGRATION_TOTAL="—"
  INTEGRATION_PASSED="—"
  INTEGRATION_FAILED="—"
fi

# E2E
E2E_STATUS=$(jq_safe "$CI_METRICS" '.e2e.status' 'pending')
E2E_TIME_MS=$(jq_safe "$CI_METRICS" '.e2e.duration_ms' '0')
E2E_TIME=$(format_time "$E2E_TIME_MS")
E2E_STATUS_COLOR=$(get_status_color "$E2E_STATUS")
E2E_PASSED=$(jq_safe "$CI_METRICS" '.e2e.passed' '0')
E2E_FAILED=$(jq_safe "$CI_METRICS" '.e2e.failed' '0')
E2E_TOTAL=$((E2E_PASSED + E2E_FAILED))
E2E_SUITES=$(jq_safe "$CI_METRICS" '.e2e.suites' '—')
E2E_TEXT_COLOR="$COLOR_TEXT"
E2E_TIME_COLOR="$COLOR_TIME"
E2E_SUITES_COLOR="$COLOR_TIME"
E2E_TOTAL_COLOR="$COLOR_TEXT"
E2E_TOTAL_WEIGHT=""
E2E_PASS_COLOR="$COLOR_SUCCESS"
E2E_FAIL_COLOR=$(get_fail_color "$E2E_FAILED")
E2E_FAIL_WEIGHT=""
if [[ "$E2E_FAILED" -gt 0 ]]; then
  E2E_FAIL_WEIGHT='font-weight="600"'
fi
if [[ "$E2E_TOTAL" -gt 0 ]]; then
  E2E_TOTAL_WEIGHT='font-weight="600"'
  E2E_TOTAL_COLOR="#fafaf9"
fi
if [[ "$E2E_STATUS" == "pending" ]]; then
  E2E_TEXT_COLOR="$COLOR_TEXT_MUTED"
  E2E_TIME="—"
  E2E_TIME_COLOR="$COLOR_PENDING"
  E2E_SUITES="—"
  E2E_SUITES_COLOR="$COLOR_PENDING"
  E2E_TOTAL="—"
  E2E_TOTAL_COLOR="$COLOR_PENDING"
  E2E_TOTAL_WEIGHT=""
  E2E_PASSED="—"
  E2E_PASS_COLOR="$COLOR_PENDING"
  E2E_FAILED="—"
  E2E_FAIL_COLOR="$COLOR_PENDING"
elif [[ "$E2E_STATUS" == "running" ]]; then
  E2E_TIME="..."
  E2E_TIME_COLOR="$COLOR_WARNING"
  E2E_SUITES="—"
  E2E_SUITES_COLOR="$COLOR_PENDING"
  E2E_TOTAL="—"
  E2E_TOTAL_COLOR="$COLOR_PENDING"
  E2E_TOTAL_WEIGHT=""
  E2E_PASSED="—"
  E2E_PASS_COLOR="$COLOR_PENDING"
  E2E_FAILED="—"
  E2E_FAIL_COLOR="$COLOR_PENDING"
fi

# Security
SECURITY_STATUS=$(jq_safe "$CI_METRICS" '.security.status' 'pending')
SECURITY_TIME_MS=$(jq_safe "$CI_METRICS" '.security.duration_ms' '0')
SECURITY_TIME=$(format_time "$SECURITY_TIME_MS")
SECURITY_STATUS_COLOR=$(get_status_color "$SECURITY_STATUS")
SECURITY_TEXT_COLOR="$COLOR_TEXT"
SECURITY_TIME_COLOR="$COLOR_TIME"
if [[ "$SECURITY_STATUS" == "pending" ]]; then
  SECURITY_TEXT_COLOR="$COLOR_TEXT_MUTED"
  SECURITY_TIME="—"
  SECURITY_TIME_COLOR="$COLOR_PENDING"
elif [[ "$SECURITY_STATUS" == "running" ]]; then
  SECURITY_TIME="..."
  SECURITY_TIME_COLOR="$COLOR_WARNING"
fi

# CI totals
CI_TOTAL_TIME_MS=$((BUILD_TIME_MS + INTEGRATION_TIME_MS + E2E_TIME_MS + SECURITY_TIME_MS))
CI_TOTAL_TIME=$(format_time "$CI_TOTAL_TIME_MS")
CI_TOTAL_TESTS=0
CI_TOTAL_PASS=0
CI_TOTAL_FAIL=0
CI_TOTAL_SUITES="—"

# Only count completed jobs
if [[ "$INTEGRATION_STATUS" == "success" || "$INTEGRATION_STATUS" == "fail" ]]; then
  CI_TOTAL_TESTS=$((CI_TOTAL_TESTS + $(jq_safe "$CI_METRICS" '.integration.passed' '0') + $(jq_safe "$CI_METRICS" '.integration.failed' '0')))
  CI_TOTAL_PASS=$((CI_TOTAL_PASS + $(jq_safe "$CI_METRICS" '.integration.passed' '0')))
  CI_TOTAL_FAIL=$((CI_TOTAL_FAIL + $(jq_safe "$CI_METRICS" '.integration.failed' '0')))
  if [[ "$CI_TOTAL_SUITES" == "—" ]]; then CI_TOTAL_SUITES=0; fi
  CI_TOTAL_SUITES=$((CI_TOTAL_SUITES + $(jq_safe "$CI_METRICS" '.integration.suites' '0')))
fi
if [[ "$E2E_STATUS" == "success" || "$E2E_STATUS" == "fail" ]]; then
  CI_TOTAL_TESTS=$((CI_TOTAL_TESTS + $(jq_safe "$CI_METRICS" '.e2e.passed' '0') + $(jq_safe "$CI_METRICS" '.e2e.failed' '0')))
  CI_TOTAL_PASS=$((CI_TOTAL_PASS + $(jq_safe "$CI_METRICS" '.e2e.passed' '0')))
  CI_TOTAL_FAIL=$((CI_TOTAL_FAIL + $(jq_safe "$CI_METRICS" '.e2e.failed' '0')))
  if [[ "$CI_TOTAL_SUITES" == "—" ]]; then CI_TOTAL_SUITES=0; fi
  CI_TOTAL_SUITES=$((CI_TOTAL_SUITES + $(jq_safe "$CI_METRICS" '.e2e.suites' '0')))
fi

CI_TOTAL_FAIL_COLOR=$(get_fail_color "$CI_TOTAL_FAIL")
CI_TOTAL_FAIL_WEIGHT=""
if [[ "$CI_TOTAL_FAIL" -gt 0 ]]; then
  CI_TOTAL_FAIL_WEIGHT='font-weight="600"'
fi

# === OVERALL STATS ===

TOTAL_TESTS=$((PRECOMMIT_TOTAL_TESTS + CI_TOTAL_TESTS))
TOTAL_PASSED=$((PRECOMMIT_TOTAL_PASS + CI_TOTAL_PASS))
TOTAL_FAILED=$((PRECOMMIT_TOTAL_FAIL + CI_TOTAL_FAIL))
TOTAL_SKIPPED=$((UNIT_SKIPPED + ARCH_SKIPPED + CONTRACTS_SKIPPED))
TOTAL_ERRORS=0  # Could add error tracking later

# Pass rate
if [[ $TOTAL_TESTS -gt 0 ]]; then
  PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_PASSED / $TOTAL_TESTS) * 100}")
else
  PASS_RATE="—"
fi

# Pass rate color based on thresholds
PASS_RATE_COLOR="$COLOR_SUCCESS"
if [[ "$PASS_RATE" != "—" ]]; then
  PASS_RATE_NUM=$(echo "$PASS_RATE" | tr -d '%')
  if (( $(echo "$PASS_RATE_NUM < 80" | bc -l) )); then
    PASS_RATE_COLOR="$COLOR_FAIL"
  elif (( $(echo "$PASS_RATE_NUM < 95" | bc -l) )); then
    PASS_RATE_COLOR="$COLOR_WARNING"
  fi
  PASS_RATE="${PASS_RATE}%"
fi

# Total duration
TOTAL_DURATION_MS=$((PRECOMMIT_TOTAL_TIME_MS + CI_TOTAL_TIME_MS))
TOTAL_DURATION=$(format_time "$TOTAL_DURATION_MS")

# Overall status
OVERALL_STATUS="pending"
OVERALL_STATUS_TEXT="WAIT"
if [[ "$BUILD_STATUS" == "running" || "$INTEGRATION_STATUS" == "running" || "$E2E_STATUS" == "running" || "$SECURITY_STATUS" == "running" ]]; then
  OVERALL_STATUS="running"
  OVERALL_STATUS_TEXT="RUN"
elif [[ "$TOTAL_FAILED" -gt 0 ]]; then
  OVERALL_STATUS="fail"
  OVERALL_STATUS_TEXT="FAIL"
elif [[ "$BUILD_STATUS" == "success" && "$INTEGRATION_STATUS" == "success" && "$E2E_STATUS" == "success" && "$SECURITY_STATUS" == "success" ]]; then
  OVERALL_STATUS="success"
  OVERALL_STATUS_TEXT="PASS"
fi
OVERALL_STATUS_COLOR=$(get_status_color "$OVERALL_STATUS")

# Color helpers for stats
TOTAL_FAILED_COLOR=$(get_fail_color "$TOTAL_FAILED")
TOTAL_SKIPPED_COLOR=$(get_skip_color "$TOTAL_SKIPPED")
TOTAL_ERRORS_COLOR=$(get_fail_color "$TOTAL_ERRORS")

# Accent color based on overall status
ACCENT_COLOR="$COLOR_WARNING"
if [[ "$OVERALL_STATUS" == "success" ]]; then
  ACCENT_COLOR="$COLOR_SUCCESS"
elif [[ "$OVERALL_STATUS" == "fail" ]]; then
  ACCENT_COLOR="$COLOR_FAIL"
fi

# === GIT INFO ===

# Use environment variables or git commands
COMMIT_HASH="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"
COMMIT_HASH="${COMMIT_HASH:0:8}"
BRANCH="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}"
RUN_NUMBER="${GITHUB_RUN_NUMBER:-0}"
TIMESTAMP=$(date -u +"%H:%M UTC")

# Commit message (title only, truncated to 45 chars)
COMMIT_MSG=$(git log -1 --format='%s' 2>/dev/null || echo 'Unknown commit')
# Truncate and add "..." if exceeds 45 chars
if [[ ${#COMMIT_MSG} -gt 45 ]]; then
  COMMIT_MSG="${COMMIT_MSG:0:42}..."
fi
# Escape special characters for SVG
COMMIT_MSG=$(echo "$COMMIT_MSG" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')

# Commit author
COMMIT_AUTHOR=$(git log -1 --format='%an' 2>/dev/null || echo 'unknown')
# Truncate if too long
if [[ ${#COMMIT_AUTHOR} -gt 20 ]]; then
  COMMIT_AUTHOR="${COMMIT_AUTHOR:0:17}..."
fi

# Co-authors
CO_AUTHORS=""
CO_AUTHOR_LIST=$(git log -1 --format='%b' 2>/dev/null | grep -oP 'Co-authored-by: \K[^<]+' | head -2 | tr '\n' ', ' | sed 's/, $//' || true)
if [[ -n "$CO_AUTHOR_LIST" ]]; then
  CO_AUTHORS="Co-authored-by: $CO_AUTHOR_LIST"
fi

# Format numbers with commas
format_number() {
  echo "$1" | sed ':a;s/\B[0-9]\{3\}\>/,&/;ta'
}

TOTAL_TESTS_FMT=$(format_number "$TOTAL_TESTS")
TOTAL_PASSED_FMT=$(format_number "$TOTAL_PASSED")

# === GENERATE SVG ===

# Read template and replace placeholders
cat "$TEMPLATE_PATH" | sed \
  -e "s|{{ACCENT_COLOR}}|$ACCENT_COLOR|g" \
  -e "s|{{COMMIT_MSG}}|$COMMIT_MSG|g" \
  -e "s|{{COMMIT_HASH}}|$COMMIT_HASH|g" \
  -e "s|{{COMMIT_AUTHOR}}|$COMMIT_AUTHOR|g" \
  -e "s|{{CO_AUTHORS}}|$CO_AUTHORS|g" \
  -e "s|{{BRANCH}}|$BRANCH|g" \
  -e "s|{{SWAGGER_STATUS_COLOR}}|$SWAGGER_STATUS_COLOR|g" \
  -e "s|{{SWAGGER_TIME}}|$SWAGGER_TIME|g" \
  -e "s|{{TYPECHECK_STATUS_COLOR}}|$TYPECHECK_STATUS_COLOR|g" \
  -e "s|{{TYPECHECK_TIME}}|$TYPECHECK_TIME|g" \
  -e "s|{{TYPECHECK_ERRORS}}|$TYPECHECK_ERRORS|g" \
  -e "s|{{TYPECHECK_FAIL_COLOR}}|$TYPECHECK_FAIL_COLOR|g" \
  -e "s|{{LINT_STATUS_COLOR}}|$LINT_STATUS_COLOR|g" \
  -e "s|{{LINT_TIME}}|$LINT_TIME|g" \
  -e "s|{{LINT_FILES}}|$LINT_FILES|g" \
  -e "s|{{LINT_ERRORS}}|$LINT_ERRORS|g" \
  -e "s|{{LINT_FAIL_COLOR}}|$LINT_FAIL_COLOR|g" \
  -e "s|{{UNIT_STATUS_COLOR}}|$UNIT_STATUS_COLOR|g" \
  -e "s|{{UNIT_TIME}}|$UNIT_TIME|g" \
  -e "s|{{UNIT_SUITES}}|$UNIT_SUITES|g" \
  -e "s|{{UNIT_TOTAL}}|$UNIT_TOTAL|g" \
  -e "s|{{UNIT_PASS}}|$UNIT_PASSED|g" \
  -e "s|{{UNIT_FAIL}}|$UNIT_FAILED|g" \
  -e "s|{{UNIT_FAIL_COLOR}}|$UNIT_FAIL_COLOR|g" \
  -e "s|{{ARCH_STATUS_COLOR}}|$ARCH_STATUS_COLOR|g" \
  -e "s|{{ARCH_TIME}}|$ARCH_TIME|g" \
  -e "s|{{ARCH_SUITES}}|$ARCH_SUITES|g" \
  -e "s|{{ARCH_TOTAL}}|$ARCH_TOTAL|g" \
  -e "s|{{ARCH_PASS}}|$ARCH_PASSED|g" \
  -e "s|{{ARCH_FAIL}}|$ARCH_FAILED|g" \
  -e "s|{{ARCH_FAIL_COLOR}}|$ARCH_FAIL_COLOR|g" \
  -e "s|{{CONTRACTS_STATUS_COLOR}}|$CONTRACTS_STATUS_COLOR|g" \
  -e "s|{{CONTRACTS_TIME}}|$CONTRACTS_TIME|g" \
  -e "s|{{CONTRACTS_SUITES}}|$CONTRACTS_SUITES|g" \
  -e "s|{{CONTRACTS_TOTAL}}|$CONTRACTS_TOTAL|g" \
  -e "s|{{CONTRACTS_PASS}}|$CONTRACTS_PASSED|g" \
  -e "s|{{CONTRACTS_FAIL}}|$CONTRACTS_FAILED|g" \
  -e "s|{{CONTRACTS_FAIL_COLOR}}|$CONTRACTS_FAIL_COLOR|g" \
  -e "s|{{PRECOMMIT_TOTAL_TIME}}|$PRECOMMIT_TOTAL_TIME|g" \
  -e "s|{{PRECOMMIT_TOTAL_SUITES}}|$PRECOMMIT_TOTAL_SUITES|g" \
  -e "s|{{PRECOMMIT_TOTAL_TESTS}}|$PRECOMMIT_TOTAL_TESTS|g" \
  -e "s|{{PRECOMMIT_TOTAL_PASS}}|$PRECOMMIT_TOTAL_PASS|g" \
  -e "s|{{PRECOMMIT_TOTAL_FAIL}}|$PRECOMMIT_TOTAL_FAIL|g" \
  -e "s|{{PRECOMMIT_TOTAL_FAIL_COLOR}}|$PRECOMMIT_TOTAL_FAIL_COLOR|g" \
  -e "s|{{ATTESTATION_HASH}}|$ATTESTATION_HASH|g" \
  -e "s|{{BUILD_STATUS_COLOR}}|$BUILD_STATUS_COLOR|g" \
  -e "s|{{BUILD_TEXT_COLOR}}|$BUILD_TEXT_COLOR|g" \
  -e "s|{{BUILD_TIME}}|$BUILD_TIME|g" \
  -e "s|{{BUILD_TIME_COLOR}}|$BUILD_TIME_COLOR|g" \
  -e "s|{{INTEGRATION_STATUS_COLOR}}|$INTEGRATION_STATUS_COLOR|g" \
  -e "s|{{INTEGRATION_TEXT_COLOR}}|$INTEGRATION_TEXT_COLOR|g" \
  -e "s|{{INTEGRATION_TIME}}|$INTEGRATION_TIME|g" \
  -e "s|{{INTEGRATION_TIME_COLOR}}|$INTEGRATION_TIME_COLOR|g" \
  -e "s|{{INTEGRATION_SUITES}}|$INTEGRATION_SUITES|g" \
  -e "s|{{INTEGRATION_TOTAL}}|$INTEGRATION_TOTAL|g" \
  -e "s|{{INTEGRATION_PASS}}|$INTEGRATION_PASSED|g" \
  -e "s|{{INTEGRATION_FAIL}}|$INTEGRATION_FAILED|g" \
  -e "s|{{INTEGRATION_FAIL_COLOR}}|$INTEGRATION_FAIL_COLOR|g" \
  -e "s|{{INTEGRATION_FAIL_WEIGHT}}|$INTEGRATION_FAIL_WEIGHT|g" \
  -e "s|{{E2E_STATUS_COLOR}}|$E2E_STATUS_COLOR|g" \
  -e "s|{{E2E_TEXT_COLOR}}|$E2E_TEXT_COLOR|g" \
  -e "s|{{E2E_TIME}}|$E2E_TIME|g" \
  -e "s|{{E2E_TIME_COLOR}}|$E2E_TIME_COLOR|g" \
  -e "s|{{E2E_SUITES}}|$E2E_SUITES|g" \
  -e "s|{{E2E_SUITES_COLOR}}|$E2E_SUITES_COLOR|g" \
  -e "s|{{E2E_TOTAL}}|$E2E_TOTAL|g" \
  -e "s|{{E2E_TOTAL_COLOR}}|$E2E_TOTAL_COLOR|g" \
  -e "s|{{E2E_TOTAL_WEIGHT}}|$E2E_TOTAL_WEIGHT|g" \
  -e "s|{{E2E_PASS}}|$E2E_PASSED|g" \
  -e "s|{{E2E_PASS_COLOR}}|$E2E_PASS_COLOR|g" \
  -e "s|{{E2E_FAIL}}|$E2E_FAILED|g" \
  -e "s|{{E2E_FAIL_COLOR}}|$E2E_FAIL_COLOR|g" \
  -e "s|{{E2E_FAIL_WEIGHT}}|$E2E_FAIL_WEIGHT|g" \
  -e "s|{{SECURITY_STATUS_COLOR}}|$SECURITY_STATUS_COLOR|g" \
  -e "s|{{SECURITY_TEXT_COLOR}}|$SECURITY_TEXT_COLOR|g" \
  -e "s|{{SECURITY_TIME}}|$SECURITY_TIME|g" \
  -e "s|{{SECURITY_TIME_COLOR}}|$SECURITY_TIME_COLOR|g" \
  -e "s|{{CI_TOTAL_TIME}}|$CI_TOTAL_TIME|g" \
  -e "s|{{CI_TOTAL_SUITES}}|$CI_TOTAL_SUITES|g" \
  -e "s|{{CI_TOTAL_TESTS}}|$CI_TOTAL_TESTS|g" \
  -e "s|{{CI_TOTAL_PASS}}|$CI_TOTAL_PASS|g" \
  -e "s|{{CI_TOTAL_FAIL}}|$CI_TOTAL_FAIL|g" \
  -e "s|{{CI_TOTAL_FAIL_COLOR}}|$CI_TOTAL_FAIL_COLOR|g" \
  -e "s|{{CI_TOTAL_FAIL_WEIGHT}}|$CI_TOTAL_FAIL_WEIGHT|g" \
  -e "s|{{PASS_RATE}}|$PASS_RATE|g" \
  -e "s|{{PASS_RATE_COLOR}}|$PASS_RATE_COLOR|g" \
  -e "s|{{TOTAL_TESTS}}|$TOTAL_TESTS_FMT|g" \
  -e "s|{{TOTAL_DURATION}}|$TOTAL_DURATION|g" \
  -e "s|{{OVERALL_STATUS_COLOR}}|$OVERALL_STATUS_COLOR|g" \
  -e "s|{{OVERALL_STATUS_TEXT}}|$OVERALL_STATUS_TEXT|g" \
  -e "s|{{TOTAL_PASSED}}|$TOTAL_PASSED_FMT|g" \
  -e "s|{{TOTAL_FAILED}}|$TOTAL_FAILED|g" \
  -e "s|{{TOTAL_FAILED_COLOR}}|$TOTAL_FAILED_COLOR|g" \
  -e "s|{{TOTAL_SKIPPED}}|$TOTAL_SKIPPED|g" \
  -e "s|{{TOTAL_SKIPPED_COLOR}}|$TOTAL_SKIPPED_COLOR|g" \
  -e "s|{{TOTAL_ERRORS}}|$TOTAL_ERRORS|g" \
  -e "s|{{TOTAL_ERRORS_COLOR}}|$TOTAL_ERRORS_COLOR|g" \
  -e "s|{{TIMESTAMP}}|$TIMESTAMP|g" \
  -e "s|{{RUN_NUMBER}}|$RUN_NUMBER|g"
