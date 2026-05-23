#!/bin/bash
#
# Smart Integration Test Runner
#
# Auto-detects the running docker-compose environment and runs the
# integration suite (`test/infrastructure/integration/`). Mirrors
# `run-e2e.sh`; both scripts share `_test-runner-lib.sh` so detection,
# health probes, env exports, sharding, and cleanup live in one place.
#
# Usage:
#   ./scripts/run-integration.sh [environment] [options]
#
# Auto-detect mode (recommended):
#   ./scripts/run-integration.sh
#
# Manual mode:
#   ./scripts/run-integration.sh dev|e2e|test|prod
#
# Options:
#   --no-cleanup    Don't stop containers after tests
#   --filter <pat>  Run only tests matching pattern
#   --verbose       Show more output
#   --fresh         Tear down + rebuild detected env before running
#   --help          Print this help

# Suite-specific knobs (the rest is in `_test-runner-lib.sh`).
TR_LABEL="integration"
TR_SPEC_DIR="test/infrastructure/integration"
TR_BUNFIG="config/bunfig.integration.toml"
# The integration suite is small enough that the fork+collect overhead
# of sharding outweighs the gain. Override via
# `SHARDS=N bun run test:integration` if a future suite grows large
# enough to benefit.
TR_DEFAULT_SHARDS=1
# Auto-detect default when no containers are running and the shell is
# non-interactive (CI). The `e2e` compose stack ships everything we need
# (Postgres + Redis + MinIO) and is what `bun run test:e2e` already uses,
# so reusing it keeps CI parity tight.
TR_DEFAULT_ENV="e2e"
TR_PRESEED_CMD=""

# shellcheck disable=SC1091
source "$(dirname "$0")/_test-runner-lib.sh"

tr_run "$@"
