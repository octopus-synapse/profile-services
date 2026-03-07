#!/bin/bash
# =============================================================================
# Pre-Commit Attestation Generator (Content-Addressed)
# =============================================================================
#
# Generates a cryptographic attestation proving pre-commit checks ran.
# Uses content-addressed storage: .attestations/<tree_hash>.json
#
# Benefits:
#   - No merge conflicts: each tree has its own attestation file
#   - Immutable: attestation represents one specific code snapshot
#   - O(1) verification in CI
#
# Usage: ./scripts/generate-pre-commit-attestation.sh [check_results...]
# Example: ./scripts/generate-pre-commit-attestation.sh typecheck:pass lint:pass
#
# =============================================================================

set -e

ATTESTATION_DIR=".attestations"

# Ensure attestation directory exists
mkdir -p "$ATTESTATION_DIR"

# Calculate tree hash (represents staged files EXCLUDING attestation directory)
# This is the content address - unique per code snapshot
TREE_HASH=$(git ls-files -s | grep -v "^.*$ATTESTATION_DIR" | sha256sum | cut -d' ' -f1)

# Attestation file is named by its tree hash
ATTESTATION_FILE="$ATTESTATION_DIR/$TREE_HASH.json"

# Clean up ALL previous attestation files (keep only current)
# This prevents accumulation and ensures only one attestation exists
find "$ATTESTATION_DIR" -name "*.json" -type f -delete 2>/dev/null || true

# Calculate swagger hash specifically (critical for API contracts)
SWAGGER_HASH=""
if [ -f "swagger.json" ]; then
    SWAGGER_HASH=$(sha256sum swagger.json | cut -d' ' -f1)
fi

# Get tool versions (deterministic metadata)
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

# Build checks JSON
CHECKS_JSON=$(jq -n \
    --argjson swagger "${CHECKS[swagger]:-false}" \
    --argjson typecheck "${CHECKS[typecheck]:-false}" \
    --argjson lint "${CHECKS[lint]:-false}" \
    --argjson unit_tests "${CHECKS[unit_tests]:-false}" \
    --argjson arch_tests "${CHECKS[arch_tests]:-false}" \
    --argjson contract_tests "${CHECKS[contract_tests]:-false}" \
    '{swagger: $swagger, typecheck: $typecheck, lint: $lint, unit_tests: $unit_tests, arch_tests: $arch_tests, contract_tests: $contract_tests}')

# Generate attestation (deterministic - no timestamp for reproducibility)
# The tree_hash in the filename IS the integrity guarantee
jq -n \
    --arg tree_hash "$TREE_HASH" \
    --arg swagger_hash "$SWAGGER_HASH" \
    --argjson checks "$CHECKS_JSON" \
    --arg bun "$BUN_VERSION" \
    --arg node "$NODE_VERSION" \
    '{tree_hash: $tree_hash, swagger_hash: $swagger_hash, checks: $checks, tool_versions: {bun: $bun, node: $node}}' > "$ATTESTATION_FILE"

echo "✅ Attestation generated: $ATTESTATION_FILE"
echo "   Tree hash: ${TREE_HASH:0:16}..."
echo "   Swagger hash: ${SWAGGER_HASH:0:16}..."
