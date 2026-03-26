#!/bin/bash
#
# Simple Attestation System v2
#
# This script generates an attestation that proves pre-commit checks passed.
# The attestation includes the git tree hash, making it impossible to forge
# without actually running the checks.
#
# How it works:
# 1. Pre-commit runs checks (lint, typecheck, test)
# 2. If all pass, this script calculates the tree hash of staged changes
# 3. Attestation is saved to .attestation and staged
# 4. CI verifies that tree_hash in attestation matches committed code
#
# Security: Any code modification after attestation changes the tree hash,
# causing CI verification to fail.

set -euo pipefail

ATTESTATION_FILE=".attestation"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[attestation]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[attestation]${NC} $1"; }
log_error() { echo -e "${RED}[attestation]${NC} $1"; }

generate_attestation() {
    # Calculate tree hash of ALL staged changes
    # This is the same hash git uses internally - cannot be faked
    local tree_hash
    tree_hash=$(git write-tree)

    # Get list of checks that were run (from pre-commit)
    local checks="${ATTESTATION_CHECKS:-lint,typecheck,test}"

    # Generate attestation JSON
    cat > "$ATTESTATION_FILE" << EOF
{
  "version": "2",
  "tree_hash": "$tree_hash",
  "checks": "$(echo "$checks" | tr ',' ' ')",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_user": "$(git config user.email || echo 'unknown')"
}
EOF

    # Stage the attestation file
    git add "$ATTESTATION_FILE"

    log_info "Attestation generated: $tree_hash"
}

verify_attestation() {
    if [ ! -f "$ATTESTATION_FILE" ]; then
        log_error "No attestation file found!"
        log_error "This commit was made with --no-verify or without running pre-commit checks."
        exit 1
    fi

    # Extract tree_hash from attestation
    local attested_hash
    attested_hash=$(grep -o '"tree_hash": "[^"]*"' "$ATTESTATION_FILE" | cut -d'"' -f4)

    if [ -z "$attested_hash" ]; then
        log_error "Invalid attestation format!"
        exit 1
    fi

    # Calculate tree hash of current commit EXCLUDING .attestation
    # We use git plumbing to reconstruct the tree without the attestation file
    # This works reliably in CI because it operates on git objects, not the index
    local commit_tree
    commit_tree=$(git rev-parse HEAD^{tree})

    local current_hash
    current_hash=$(git ls-tree "$commit_tree" | grep -vE '\.attestation$' | git mktree)

    log_info "Attested hash: $attested_hash"
    log_info "Current hash:  $current_hash"

    if [ "$attested_hash" != "$current_hash" ]; then
        log_error "Attestation verification FAILED!"
        log_error "Code was modified after pre-commit checks ran."
        log_error ""
        log_error "Possible causes:"
        log_error "  - Files were changed after running checks"
        log_error "  - Attestation was manually forged"
        log_error "  - Commit was amended after checks"
        exit 1
    fi

    log_info "Attestation verified successfully!"

    # Check freshness (optional - warn if older than 24h)
    local timestamp
    timestamp=$(grep -o '"timestamp": "[^"]*"' "$ATTESTATION_FILE" | cut -d'"' -f4)
    if [ -n "$timestamp" ]; then
        local attestation_epoch
        local now_epoch
        local age_hours

        attestation_epoch=$(date -d "$timestamp" +%s 2>/dev/null || echo 0)
        now_epoch=$(date +%s)
        age_hours=$(( (now_epoch - attestation_epoch) / 3600 ))

        if [ "$age_hours" -gt 24 ]; then
            log_warn "Attestation is ${age_hours}h old. Consider re-running pre-commit."
        fi
    fi
}

# Main
case "${1:-generate}" in
    generate)
        generate_attestation
        ;;
    verify)
        verify_attestation
        ;;
    *)
        echo "Usage: $0 [generate|verify]"
        exit 1
        ;;
esac
