#!/bin/bash
#
# CI-tuned e2e runner. Mirrors `scripts/run-e2e.sh` but skips the
# docker-compose lifecycle (the workflow's `services:` block already
# provides Postgres + Redis as host-mapped services on
# `localhost:5433` / `localhost:6380`). Runs:
#
#   1. The migration deploy (template's run-test-suite action also
#      does this when `needs-db: true`, but we depend on the schema
#      being there before the pre-seed step below).
#   2. A one-shot catalog seed via `scripts/_e2e-preseed.ts`.
#   3. N parallel `bun test` workers, each with a slice of the spec
#      list, all sharing the same Postgres + Redis.
#
# Defaults to `SHARDS=2` because GitHub-hosted runners are 2 vCPUs
# in the free tier; 3+ shards there usually thrash. Override via env
# (e.g. `SHARDS=4` on a 4-vCPU runner) or by setting the variable in
# the workflow's `extra-env-vars`.

set -euo pipefail

SHARDS="${SHARDS:-2}"

mapfile -t ALL_FILES < <(find test/infrastructure/e2e -name "*.spec.ts" | sort)
TOTAL_FILES=${#ALL_FILES[@]}

if [[ $TOTAL_FILES -eq 0 ]]; then
    echo "[e2e:ci] No e2e spec files found under test/infrastructure/e2e/" >&2
    exit 1
fi
if (( SHARDS > TOTAL_FILES )); then
    SHARDS=$TOTAL_FILES
fi

SCRIPT_START_NS=$(date +%s%N)
fmt_elapsed() {
    local end_ns=$(date +%s%N)
    local elapsed_ms=$(( (end_ns - SCRIPT_START_NS) / 1000000 ))
    if (( elapsed_ms < 1000 )); then
        printf '%dms' "$elapsed_ms"
    else
        local secs=$(( elapsed_ms / 1000 ))
        local rem=$(( elapsed_ms % 1000 ))
        printf '%d.%03ds' "$secs" "$rem"
    fi
}

echo "[e2e:ci] Pre-seeding catalogs..."
bun scripts/_e2e-preseed.ts
export E2E_SKIP_SEED=1

if [[ $SHARDS -eq 1 ]]; then
    echo "[e2e:ci] Running ${TOTAL_FILES} spec file(s) in a single process..."
    bun test --config=config/bunfig.e2e.toml --concurrent --max-concurrency=8 "${ALL_FILES[@]}"
    EXIT_CODE=$?
else
    echo "[e2e:ci] Sharding ${TOTAL_FILES} spec file(s) across ${SHARDS} process(es)..."
    declare -a SHARD_PIDS=()
    declare -a SHARD_LOGS=()

    for ((i=0; i<SHARDS; i++)); do
        SHARD_FILES=()
        for ((j=i; j<TOTAL_FILES; j+=SHARDS)); do
            SHARD_FILES+=("${ALL_FILES[$j]}")
        done

        log_file=$(mktemp)
        SHARD_LOGS+=("$log_file")

        (bun test --config=config/bunfig.e2e.toml --concurrent --max-concurrency=8 \
            "${SHARD_FILES[@]}" >"$log_file" 2>&1) &
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
    echo "[e2e:ci] All E2E tests passed!  (total wall-clock: $(fmt_elapsed))"
else
    echo "[e2e:ci] E2E tests failed!  (total wall-clock: $(fmt_elapsed))"
fi
exit $EXIT_CODE
