#!/usr/bin/env bash
# CI Comment Management Script
# Philosophy: "One comment per workflow run" - Each CI run gets its own status comment
#
# Usage: ./ci-comment.sh <action> <args...>
#
# Actions:
#   init                    - Create comment for this CI run (all checks pending)
#   update <check> <status> <desc> <time> - Update check status
#   skip <check> <reason>   - Mark check as skipped
#   finalize <success>      - Set final CI result

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

log() { echo "::notice::$*" >&2; }
warn() { echo "::warning::$*" >&2; }
error() { echo "::error::$*" >&2; exit 1; }

# Get marker for this CI run - uses GITHUB_RUN_ID which is unique per workflow execution
get_marker() {
  local run_id="${GITHUB_RUN_ID:?GITHUB_RUN_ID must be set}"
  echo "<!-- CI_RUN_${run_id} -->"
}

get_comment_id() {
  local marker
  marker=$(get_marker)
  log "Looking for marker: ${marker} (RUN_ID: ${GITHUB_RUN_ID})"

  # Find comment for THIS specific CI run
  # IMPORTANT: Use --paginate because GitHub API paginates results
  local result
  result=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
    --paginate \
    --jq ".[] | select(.body | contains(\"${marker}\")) | .id" \
    2>/dev/null | head -1 || echo "")

  if [[ -z "$result" ]]; then
    warn "No comment found with marker: ${marker}"
  else
    log "Found comment ID: ${result}"
  fi

  echo "$result"
}

status_emoji() {
  local status="$1"
  case "$status" in
    success)  echo "✅" ;;
    failure)  echo "❌" ;;
    skipped)  echo "⏭️" ;;
    cancelled) echo "🚫" ;;
    *)        echo "⏳" ;;
  esac
}

# ─────────────────────────────────────────────────────────────
# Actions
# ─────────────────────────────────────────────────────────────

init_comment() {
  local run_id="${GITHUB_RUN_ID:?GITHUB_RUN_ID must be set}"
  local sha="${COMMIT_SHA:?COMMIT_SHA must be set}"
  local short_sha="${sha:0:7}"
  local marker="<!-- CI_RUN_${run_id} -->"

  log "Creating comment with marker: ${marker} for commit ${short_sha}"

  # Get commit message
  local commit_msg
  commit_msg=$(gh api "repos/${GITHUB_REPOSITORY}/commits/${sha}" --jq '.commit.message' 2>/dev/null | head -1 | cut -c1-72 || echo "...")

  local body
  body=$(cat <<EOF
${marker}
## 🔄 CI Status

**Commit:** [\`${short_sha}\`](https://github.com/${GITHUB_REPOSITORY}/commit/${sha}) — _${commit_msg}_

| Check | Status | Description | Time |
|:------|:------:|:------------|-----:|
| **Attestation** | ⏳ | Verifying... | — |
| **Build** | ⏳ | Waiting... | — |
| **Integration** | ⏳ | Waiting... | — |
| **E2E** | ⏳ | Waiting... | — |
| **Security** | ⏳ | Waiting... | — |

---
_Started: $(date -u '+%Y-%m-%d %H:%M:%S') UTC_
EOF
)

  # Always create new comment for this CI run
  gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
    -X POST -f body="$body" --silent
  log "Created new CI comment for run ${run_id}"
}

update_check() {
  local check_name="$1"
  local status="$2"
  local description="${3:-}"
  local time="${4:-—}"

  local emoji
  emoji=$(status_emoji "$status")

  # Use description or capitalize status
  local desc="${description:-${status^}}"

  local comment_id
  comment_id=$(get_comment_id)

  if [[ -z "$comment_id" ]]; then
    log "Warning: No CI comment found for commit ${GITHUB_SHA:-unknown}, skipping update for ${check_name}"
    return 0
  fi

  local current_body
  current_body=$(gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" --jq '.body' 2>/dev/null || echo "")

  if [[ -z "$current_body" ]]; then
    log "Warning: Could not fetch comment body"
    return 0
  fi

  # Build new row with 4 columns: Check | Status | Description | Time
  local new_row="| **${check_name}** | ${emoji} | ${desc} | ${time} |"

  # Replace the row for this check (match pattern with 4 columns)
  local updated_body
  updated_body=$(echo "$current_body" | sed -E "s/\| \*\*${check_name}\*\* \| [^|]+ \| [^|]+ \| [^|]+ \|/${new_row}/")

  gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" \
    -X PATCH -f body="$updated_body" --silent

  log "Updated ${check_name}: ${status} (${time})"
}

skip_check() {
  local check_name="$1"
  local reason="${2:-Skipped}"

  update_check "$check_name" "skipped" "$reason" "—"
}

finalize_comment() {
  local success="$1"

  local comment_id
  comment_id=$(get_comment_id)

  if [[ -z "$comment_id" ]]; then
    log "Warning: No CI comment found for commit ${GITHUB_SHA:-unknown}, skipping finalize"
    return 0
  fi

  local current_body
  current_body=$(gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" --jq '.body' 2>/dev/null || echo "")

  if [[ -z "$current_body" ]]; then
    log "Warning: Could not fetch comment body"
    return 0
  fi

  local title footer
  if [[ "$success" == "true" ]]; then
    title="## ✅ CI Passed"
    footer="_All checks passed. Ready to merge._"
  else
    title="## ❌ CI Failed"
    footer="_Some checks failed. Please review above._"
  fi

  local updated_body
  updated_body=$(echo "$current_body" | sed "s/## 🔄 CI Status/${title}/")
  updated_body=$(echo "$updated_body" | sed "s/_Started:.*UTC_/${footer}/")

  gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" \
    -X PATCH -f body="$updated_body" --silent

  log "Finalized CI comment: success=${success}"
}

# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

main() {
  local action="${1:-}"
  shift || true

  # Validate required env vars
  : "${GITHUB_RUN_ID:?GITHUB_RUN_ID env var is required}"
  : "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY env var is required}"
  : "${PR_NUMBER:?PR_NUMBER env var is required}"
  : "${GH_TOKEN:?GH_TOKEN env var is required}"

  log "Action: ${action}, RUN_ID: ${GITHUB_RUN_ID}"

  case "$action" in
    init)     init_comment ;;
    update)   update_check "$@" ;;
    skip)     skip_check "$@" ;;
    finalize) finalize_comment "$@" ;;
    *)        error "Unknown action: ${action}. Use: init, update, skip, finalize" ;;
  esac
}

main "$@"
