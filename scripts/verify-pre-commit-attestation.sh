#!/bin/bash
# =============================================================================
# Pre-Commit Attestation Verifier (Content-Addressed)
# =============================================================================
#
# Verifies that pre-commit checks ran and weren't bypassed (--no-verify).
# Looks up attestation by tree hash: .attestations/<current_tree_hash>.json
#
# Runs in O(1) - calculates hash, checks file exists, validates contents.
#
# Exit codes:
#   0 - Attestation valid
#   1 - Attestation missing (pre-commit bypassed or code changed)
#   2 - Swagger hash mismatch (swagger.json out of sync)
#   3 - Required checks failed
#
# =============================================================================

set -e

ATTESTATION_DIR=".attestations"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verifying pre-commit attestation..."
echo ""

# Calculate current tree hash (same method as generator)
CURRENT_TREE=$(git ls-files -s | grep -v "^.*$ATTESTATION_DIR" | sha256sum | cut -d' ' -f1)

# Attestation file is named by the tree hash
ATTESTATION_FILE="$ATTESTATION_DIR/$CURRENT_TREE.json"

echo "   Looking for: ${CURRENT_TREE:0:16}..."

# Check if attestation file exists for this exact tree
if [ ! -f "$ATTESTATION_FILE" ]; then
    echo -e "${RED}❌ Attestation not found for current code snapshot${NC}"
    echo ""
    echo "   Expected: $ATTESTATION_FILE"
    echo ""
    echo "This means either:"
    echo "  1. Pre-commit hooks were bypassed (--no-verify)"
    echo "  2. Code was modified after pre-commit ran"
    echo "  3. Attestation was not committed"
    echo ""
    echo "Please run: git commit --amend (after running pre-commit checks)"
    exit 1
fi
echo -e "${GREEN}✓${NC} Attestation file found"

# Verify tree hash inside file matches filename (sanity check)
ATTESTED_TREE=$(jq -r '.tree_hash' "$ATTESTATION_FILE")
if [ "$CURRENT_TREE" != "$ATTESTED_TREE" ]; then
    echo -e "${RED}❌ Tree hash inside attestation doesn't match filename${NC}"
    echo "   Filename implies: $CURRENT_TREE"
    echo "   File contains:    $ATTESTED_TREE"
    exit 1
fi
echo -e "${GREEN}✓${NC} Tree hash verified"

# Verify swagger hash (proves swagger.json is in sync)
ATTESTED_SWAGGER=$(jq -r '.swagger_hash' "$ATTESTATION_FILE")
if [ -f "swagger.json" ] && [ "$ATTESTED_SWAGGER" != "null" ] && [ -n "$ATTESTED_SWAGGER" ]; then
    CURRENT_SWAGGER=$(sha256sum swagger.json | cut -d' ' -f1)
    if [ "$CURRENT_SWAGGER" != "$ATTESTED_SWAGGER" ]; then
        echo -e "${RED}❌ Swagger hash mismatch${NC}"
        echo "   Attested: $ATTESTED_SWAGGER"
        echo "   Current:  $CURRENT_SWAGGER"
        echo ""
        echo "swagger.json was modified after pre-commit ran."
        exit 2
    fi
    echo -e "${GREEN}✓${NC} Swagger hash matches"
fi

# Verify all required checks passed
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
    exit 3
fi
echo -e "${GREEN}✓${NC} All required checks passed"

# Summary
echo ""
echo -e "${GREEN}✅ Pre-commit attestation verified successfully${NC}"
echo "   Tree hash: ${CURRENT_TREE:0:16}..."

exit 0
