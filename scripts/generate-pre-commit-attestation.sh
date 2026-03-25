#!/bin/bash

set -euo pipefail

# Load environment from .env if it exists
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

ATTESTATION_DIR=".attestations"
WITNESS_URL="${ATTESTATION_WITNESS_URL:-http://localhost:3001/api/v1/attestation-witness/internal}"
INTERNAL_TOKEN="${INTERNAL_API_TOKEN:-}"
POLL_INTERVAL_SECONDS="${ATTESTATION_WITNESS_POLL_INTERVAL_SECONDS:-2}"
POLL_TIMEOUT_SECONDS="${ATTESTATION_WITNESS_POLL_TIMEOUT_SECONDS:-300}"

# Skip attestation if explicitly disabled or if we can't reach the witness service
if [ "${SKIP_ATTESTATION:-}" = "true" ]; then
    echo "⚠️  Attestation skipped (SKIP_ATTESTATION=true)"
    exit 0
fi

if [ -z "$INTERNAL_TOKEN" ]; then
    echo "❌ INTERNAL_API_TOKEN is required to request a witness attestation"
    exit 1
fi

mkdir -p "$ATTESTATION_DIR"
find "$ATTESTATION_DIR" -name "*.json" -type f -delete 2>/dev/null || true

SOURCE_TREE_HASH=$(git ls-files -s | grep -v "^.*$ATTESTATION_DIR" | sha256sum | cut -d' ' -f1)
GIT_TREE_OBJECT_ID=$(git write-tree)
ATTESTATION_FILE="$ATTESTATION_DIR/$SOURCE_TREE_HASH.json"
SNAPSHOT_FILE=$(mktemp "${TMPDIR:-/tmp}/witness-snapshot.XXXXXX.tar.gz")

cleanup() {
    rm -f "$SNAPSHOT_FILE"
}

trap cleanup EXIT

git archive --format=tar "$GIT_TREE_OBJECT_ID" | gzip > "$SNAPSHOT_FILE"

CREATE_RESPONSE=$(curl --silent --show-error --fail \
    -X POST "$WITNESS_URL/runs" \
    -H "x-internal-token: $INTERNAL_TOKEN" \
    -F "sourceTreeHash=$SOURCE_TREE_HASH" \
    -F "gitTreeObjectId=$GIT_TREE_OBJECT_ID" \
    -F "snapshot=@$SNAPSHOT_FILE;type=application/gzip")

RUN_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.runId')

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
    echo "❌ Witness service did not return a runId"
    exit 1
fi

echo "   Witness run: $RUN_ID"

elapsed=0
while [ "$elapsed" -lt "$POLL_TIMEOUT_SECONDS" ]; do
    STATUS_RESPONSE=$(curl --silent --show-error --fail \
        -H "x-internal-token: $INTERNAL_TOKEN" \
        "$WITNESS_URL/runs/$RUN_ID")
    RUN_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status')

    case "$RUN_STATUS" in
        SUCCEEDED)
            curl --silent --show-error --fail \
                -H "x-internal-token: $INTERNAL_TOKEN" \
                "$WITNESS_URL/attestations/$SOURCE_TREE_HASH" |
                jq '.data' > "$ATTESTATION_FILE"
            echo "✅ Witness attestation stored at $ATTESTATION_FILE"
            exit 0
            ;;
        FAILED)
            ERROR_MESSAGE=$(echo "$STATUS_RESPONSE" | jq -r '.data.errorMessage // "Witness execution failed"')
            echo "❌ $ERROR_MESSAGE"
            exit 1
            ;;
    esac

    sleep "$POLL_INTERVAL_SECONDS"
    elapsed=$((elapsed + POLL_INTERVAL_SECONDS))
done

echo "❌ Witness attestation timed out after ${POLL_TIMEOUT_SECONDS}s"
exit 1
