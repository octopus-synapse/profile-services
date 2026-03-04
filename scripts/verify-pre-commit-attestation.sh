#!/bin/bash
# =============================================================================
# Pre-Commit Attestation Verifier
# =============================================================================
#
# Verifies that pre-commit checks ran and weren't bypassed (--no-verify).
# Runs in O(1) - only hash comparisons, no re-execution of checks.
#
# Exit codes:
#   0 - Attestation valid
#   1 - Attestation missing (pre-commit bypassed)
#   2 - Tree hash mismatch (code changed after pre-commit)
#   3 - Swagger hash mismatch (swagger.json out of sync)
#   4 - Integrity hash mismatch (attestation tampered)
#   5 - Required checks failed
#
# =============================================================================

set -e

ATTESTATION_FILE=".pre-commit-attestation.json"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verifying pre-commit attestation..."
echo ""

# Check if attestation file exists
if [ ! -f "$ATTESTATION_FILE" ]; then
    echo -e "${RED}❌ Attestation file not found: $ATTESTATION_FILE${NC}"
    echo ""
    echo "This means pre-commit hooks were bypassed (--no-verify)."
    echo "Please run: git commit --amend (after running pre-commit checks)"
    exit 1
fi

# Extract values from attestation
ATTESTED_TREE=$(jq -r '.tree_hash' "$ATTESTATION_FILE")
ATTESTED_SWAGGER=$(jq -r '.swagger_hash' "$ATTESTATION_FILE")
ATTESTED_INTEGRITY=$(jq -r '.integrity' "$ATTESTATION_FILE")
ATTESTED_TIMESTAMP=$(jq -r '.timestamp' "$ATTESTATION_FILE")

# 1. Verify tree hash (proves code hasn't changed since pre-commit)
# Must use same method as generation: git ls-files -s excluding attestation file, then sha256sum
CURRENT_TREE=$(git ls-files -s | grep -v "$ATTESTATION_FILE" | sha256sum | cut -d' ' -f1)
if [ "$CURRENT_TREE" != "$ATTESTED_TREE" ]; then
    echo -e "${RED}❌ Tree hash mismatch${NC}"
    echo "   Attested: $ATTESTED_TREE"
    echo "   Current:  $CURRENT_TREE"
    echo ""
    echo "Code was modified after pre-commit ran, or attestation is from different commit."
    exit 2
fi
echo -e "${GREEN}✓${NC} Tree hash matches"

# 2. Verify swagger hash (proves swagger.json is in sync)
if [ -f "swagger.json" ] && [ "$ATTESTED_SWAGGER" != "null" ] && [ -n "$ATTESTED_SWAGGER" ]; then
    CURRENT_SWAGGER=$(sha256sum swagger.json | cut -d' ' -f1)
    if [ "$CURRENT_SWAGGER" != "$ATTESTED_SWAGGER" ]; then
        echo -e "${RED}❌ Swagger hash mismatch${NC}"
        echo "   Attested: $ATTESTED_SWAGGER"
        echo "   Current:  $CURRENT_SWAGGER"
        echo ""
        echo "swagger.json was modified after pre-commit ran."
        exit 3
    fi
    echo -e "${GREEN}✓${NC} Swagger hash matches"
fi

# 3. Verify integrity hash (proves attestation wasn't tampered)
# Must use same format as generation: compact JSON without integrity field
CONTENT_WITHOUT_INTEGRITY=$(jq -c 'del(.integrity)' "$ATTESTATION_FILE")
CALCULATED_INTEGRITY=$(echo -n "$CONTENT_WITHOUT_INTEGRITY" | sha256sum | cut -d' ' -f1)
if [ "$CALCULATED_INTEGRITY" != "$ATTESTED_INTEGRITY" ]; then
    echo -e "${RED}❌ Integrity hash mismatch${NC}"
    echo "   Attested:   $ATTESTED_INTEGRITY"
    echo "   Calculated: $CALCULATED_INTEGRITY"
    echo ""
    echo "Attestation file was tampered with."
    exit 4
fi
echo -e "${GREEN}✓${NC} Integrity hash valid"

# 4. Verify all required checks passed
REQUIRED_CHECKS=("swagger" "typecheck" "lint" "unit_tests" "arch_tests" "contract_tests")
FAILED_CHECKS=()

for check in "${REQUIRED_CHECKS[@]}"; do
    CHECK_RESULT=$(jq -r ".checks.$check // false" "$ATTESTATION_FILE")
    if [ "$CHECK_RESULT" != "true" ]; then
        FAILED_CHECKS+=("$check")
    fi
done

if [ ${#FAILED_CHECKS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Required checks failed: ${FAILED_CHECKS[*]}${NC}"
    exit 5
fi
echo -e "${GREEN}✓${NC} All required checks passed"

# Summary
echo ""
echo -e "${GREEN}✅ Pre-commit attestation verified successfully${NC}"
echo "   Timestamp: $ATTESTED_TIMESTAMP"
echo "   Tree hash: ${CURRENT_TREE:0:12}..."

exit 0
