<!--
  Keep this file in sync with patch-careers-ui/.github/pull_request_template.md.
  Both are deliberately the same — the cross-repo invariants matter on every PR.
-->

## Summary

<!-- 1–3 bullets describing what changed and why. Link the audit Q-code if relevant (Q41, Q57, etc.). -->

## Schema changes

- [ ] No schema changes
- [ ] Prisma migration included (`prisma/migrations/<timestamp>_<name>`)
  - [ ] Migration is **forward-only** (no destructive column drops without 3-phase deprecation)
  - [ ] Backfill strategy documented for non-null adds on populated tables
  - [ ] Rollback plan documented if not trivially reversible
  - [ ] Local migration applied + tested against representative data
- [ ] DB trigger / constraint changes? Reviewed by someone other than author.

## Cross-repo impact

- [ ] No HTTP surface change — frontend untouched
- [ ] HTTP surface changed → `bun run swagger:generate` ran here, `client-swagger.json` committed in this PR
  - [ ] Companion PR opened in `patch-careers-ui` with `bun run sdk:generate` + caller refactor (link below)
  - [ ] Companion PR link: <!-- https://github.com/octopus-synapse/patch-careers-ui/pull/NNN -->
- [ ] Deprecation strategy chosen: dual-support (`@deprecated`) / hard cutover / additive only
- [ ] Spectral ruleset passes locally (`bun run lint:spec`)

## Destructive operations checklist

Tick every line that applies. Each is something a reviewer needs to think
about before approving — leave unticked if not applicable.

- [ ] **Data loss risk:** rows / columns / files deleted that are not
      restorable from backups within the SLA
- [ ] **Downtime risk:** migration acquires a long lock / requires
      maintenance window
- [ ] **Idempotency:** the change can be re-applied if a deploy half-fails
- [ ] **Feature flag:** gated behind a flag that defaults OFF
- [ ] **Rollback plan:** documented in PR body (single sentence is fine)
- [ ] **Audit trail:** lifecycle events are emitted via `AuditLogPort`
      (strict mode) for any user-visible state change
- [ ] **PII redaction:** new fields run through `redactEmail` / `redactPhone`
      / etc. before reaching `logger.*` (or the `lint-allow-pii-extended`
      escape carries a justification)

## Test plan

<!-- Bullet list. Mention which test tier the change is covered by:
     unit / arch / contract / integration / e2e. If a tier is not covered,
     state why (e.g. "internal refactor, behaviour unchanged"). -->

- [ ] `bun test src` (unit) green
- [ ] `bun test ./test/static-analysis/architecture` green
- [ ] Pre-commit attestation passed locally
- [ ] If routes touched: contract probes either pass or `DRIFT_BASE_URL`-gated `todo` left unchanged

## Observability

- [ ] New cron worker? `expectedDurationMs` set from p99 evidence (or default 30s + revisit ticket linked)
- [ ] New event handler? Classification documented (audit / state-mutating → rethrow; telemetry → swallow with `logger.error`)
- [ ] New external HTTP call? Goes through `SafeFetchPort` (or `SafeFetchStrictAdapter` for repeated outbound)

## Notes for reviewer

<!-- Anything that needs a second pair of eyes specifically. Leave blank if nothing. -->
