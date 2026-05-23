#!/bin/bash
#
# Smart E2E Test Runner
#
# Auto-detects running docker-compose environment and runs E2E tests.
# If no environment is detected, starts the e2e environment.
#
# Usage:
#   ./scripts/run-e2e.sh [environment] [options]
#
# Auto-detect mode:
#   ./scripts/run-e2e.sh
#
# Manual mode:
#   ./scripts/run-e2e.sh dev|e2e|test|prod
#
# Options:
#   --no-cleanup    Don't stop containers after tests
#   --filter <pat>  Run only tests matching pattern
#   --verbose       Show more output
#   --fresh         Tear down + rebuild detected env before running
#   --help          Print this help

# Suite-specific knobs (the rest is in `_test-runner-lib.sh`).
TR_LABEL="e2e"
TR_SPEC_DIR="test/infrastructure/e2e"
TR_BUNFIG="config/bunfig.e2e.toml"
# 3 workers = sweet spot on a 4-core box: workers + Postgres + I/O leave a
# core idle so the kernel scheduler doesn't thrash. Override via
# `SHARDS=N bun run test:e2e`. SHARDS=1 disables sharding.
TR_DEFAULT_SHARDS=3
TR_DEFAULT_ENV="e2e"
TR_PRESEED_CMD="bun scripts/_e2e-preseed.ts"

# shellcheck disable=SC1091
source "$(dirname "$0")/_test-runner-lib.sh"

tr_run "$@"
