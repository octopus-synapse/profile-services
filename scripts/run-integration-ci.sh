#!/bin/bash
#
# CI-tuned integration runner. Mirror of `scripts/run-e2e-ci.sh`:
# pre-seeds catalogs once and fans the spec list across N parallel
# `bun test` workers, all sharing the same Postgres + Redis from
# the workflow's `services:` block.
#
# Defaults to `SHARDS=2` because GitHub-hosted runners are 2 vCPUs;
# 3+ shards there usually thrash. Override via `SHARDS=N` env.

set -euo pipefail

SHARDS="${SHARDS:-2}"

mapfile -t ALL_FILES < <(find test/infrastructure/integration -name "*.spec.ts" | sort)
TOTAL_FILES=${#ALL_FILES[@]}

if [[ $TOTAL_FILES -eq 0 ]]; then
    echo "[integration:ci] No spec files found under test/infrastructure/integration/" >&2
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

echo "[integration:ci] Pre-seeding catalogs..."
bun scripts/_e2e-preseed.ts
export E2E_SKIP_SEED=1

if [[ $SHARDS -eq 1 ]]; then
    echo "[integration:ci] Running ${TOTAL_FILES} spec file(s) in a single process..."
    bun test --config=bunfig.integration.toml "${ALL_FILES[@]}"
    EXIT_CODE=$?
else
    echo "[integration:ci] Sharding ${TOTAL_FILES} spec file(s) across ${SHARDS} process(es)..."
    declare -a SHARD_PIDS=()
    declare -a SHARD_LOGS=()

    for ((i=0; i<SHARDS; i++)); do
        SHARD_FILES=()
        for ((j=i; j<TOTAL_FILES; j+=SHARDS)); do
            SHARD_FILES+=("${ALL_FILES[$j]}")
        done

        log_file=$(mktemp)
        SHARD_LOGS+=("$log_file")

        (bun test --config=bunfig.integration.toml \
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
    echo "[integration:ci] All Integration tests passed!  (total wall-clock: $(fmt_elapsed))"
else
    echo "[integration:ci] Integration tests failed!  (total wall-clock: $(fmt_elapsed))"
fi
exit $EXIT_CODE
