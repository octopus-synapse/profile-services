#!/bin/bash
# =============================================================================
# Pre-Commit Attestation Generator
# =============================================================================
#
# Generates a cryptographic attestation proving pre-commit checks ran.
# This allows CI to verify compliance in O(1) instead of re-running checks.
#
# Usage: ./scripts/generate-pre-commit-attestation.sh [check_results...]
# Example: ./scripts/generate-pre-commit-attestation.sh typecheck:pass lint:pass tests:pass
#
# =============================================================================

set -e

ATTESTATION_FILE=".pre-commit-attestation.json"

# Calculate tree hash (represents staged files EXCLUDING the attestation itself)
# This avoids chicken-and-egg: attestation contains tree hash, but adding attestation changes tree hash
# We use git ls-files -s to get staged file info, exclude attestation, and hash the result
TREE_HASH=$(git ls-files -s | grep -v "$ATTESTATION_FILE" | sha256sum | cut -d' ' -f1)

# Calculate swagger hash specifically (critical for API contracts)
SWAGGER_HASH=""
if [ -f "swagger.json" ]; then
    SWAGGER_HASH=$(sha256sum swagger.json | cut -d' ' -f1)
fi

# Get metadata
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUN_VERSION=$(bun --version 2>/dev/null || echo "unknown")
NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")

# Parse check results from arguments
# Format: check_name:status (e.g., typecheck:pass, lint:pass)
declare -A CHECKS
for arg in "$@"; do
    CHECK_NAME=$(echo "$arg" | cut -d: -f1)
    CHECK_STATUS=$(echo "$arg" | cut -d: -f2)
    if [ "$CHECK_STATUS" = "pass" ]; then
        CHECKS[$CHECK_NAME]="true"
    else
        CHECKS[$CHECK_NAME]="false"
    fi
done

# Build checks JSON using jq for consistent formatting
CHECKS_JSON=$(jq -n \
    --argjson swagger "${CHECKS[swagger]:-false}" \
    --argjson typecheck "${CHECKS[typecheck]:-false}" \
    --argjson lint "${CHECKS[lint]:-false}" \
    --argjson unit_tests "${CHECKS[unit_tests]:-false}" \
    --argjson arch_tests "${CHECKS[arch_tests]:-false}" \
    --argjson contract_tests "${CHECKS[contract_tests]:-false}" \
    '{swagger: $swagger, typecheck: $typecheck, lint: $lint, unit_tests: $unit_tests, arch_tests: $arch_tests, contract_tests: $contract_tests}')

# Generate attestation JSON without integrity (for hash calculation)
ATTESTATION_WITHOUT_INTEGRITY=$(jq -n -c \
    --arg tree_hash "$TREE_HASH" \
    --arg swagger_hash "$SWAGGER_HASH" \
    --argjson checks "$CHECKS_JSON" \
    --arg timestamp "$TIMESTAMP" \
    --arg bun "$BUN_VERSION" \
    --arg node "$NODE_VERSION" \
    '{tree_hash: $tree_hash, swagger_hash: $swagger_hash, checks: $checks, timestamp: $timestamp, tool_versions: {bun: $bun, node: $node}}')

# Calculate integrity hash of the compact JSON
INTEGRITY_HASH=$(echo -n "$ATTESTATION_WITHOUT_INTEGRITY" | sha256sum | cut -d' ' -f1)

# Generate final attestation with integrity hash (pretty printed for readability)
jq -n \
    --arg tree_hash "$TREE_HASH" \
    --arg swagger_hash "$SWAGGER_HASH" \
    --argjson checks "$CHECKS_JSON" \
    --arg timestamp "$TIMESTAMP" \
    --arg bun "$BUN_VERSION" \
    --arg node "$NODE_VERSION" \
    --arg integrity "$INTEGRITY_HASH" \
    '{tree_hash: $tree_hash, swagger_hash: $swagger_hash, checks: $checks, timestamp: $timestamp, tool_versions: {bun: $bun, node: $node}, integrity: $integrity}' > "$ATTESTATION_FILE"

echo "✅ Attestation generated: $ATTESTATION_FILE"
echo "   Tree hash: $TREE_HASH"
echo "   Swagger hash: ${SWAGGER_HASH:0:16}..."
