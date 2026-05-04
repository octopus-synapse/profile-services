# `scripts/` — operational and CI helpers

Q66 in the duplication audit. Scripts are split into three buckets:

## Public CLI scripts

Run by humans / CI directly.

| Script | What it does |
|---|---|
| `run-e2e.sh` | Boot e2e DB + run e2e suite locally |
| `run-e2e-ci.sh` | Same as above, sharded for CI |
| `run-integration.sh` | Boot integration DB + run integration suite locally |
| `run-integration-ci.sh` | Same as above, sharded for CI |
| `setup-release-labels.sh` | One-shot label seeder for the release-please repo |
| `mec-download.ts` | Download the MEC institutions CSV |
| `seed-i18n-catalogs.ts` | Seed the i18n notification/error/enum catalogs |
| `generate-swagger-from-decorators.ts` | Build `swagger.json` and `client-swagger.json` |
| `diff-swagger.ts` | Diff two swagger snapshots into a markdown report |
| `extract-error-codes.ts` | Extract `code` literals from domain exceptions (used by tests) |
| `extract-prisma-enums.ts` | Extract Prisma enum values for parity tests |
| `i18n-audit.ts` | Audit i18n catalogs against discovered codes |
| `check-file-size.ts` | CI guard against accidentally enormous files |
| `lint-cache-direct-delete.ts` | Q32 lint — forbid `cache.delete*` outside CacheInvalidationService |

## Internal helpers (`_*` prefix)

Optional one-shot utilities. Document the purpose in the script header.

| Script | What it does |
|---|---|
| `_e2e-preseed.ts` | Pre-seed catalogs once for sharded e2e workers (skipped after first run) |
| `_walk-bc-deps.ts` | Static dep-graph dump for human inspection |

## Shared libraries (`scripts/lib/`)

| Module | Used by |
|---|---|
| `lib/walk-source.ts` | TypeScript scripts needing recursive `.ts` discovery |
| `lib/test-orchestration.sh` | Bash runners — readiness probes + round-robin sharding |

## Conventions

- Underscore-prefixed scripts are internal one-off helpers; do not invoke from CI.
- TypeScript scripts run via Bun directly: `bun run scripts/foo.ts`.
- Bash scripts source `scripts/lib/test-orchestration.sh` for shared logic — do not duplicate cluster/wait/sharding code inline.
