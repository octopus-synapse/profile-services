# Migration Runbook — Scoring Refactor (Big-Bang PR)

This document is the operational runbook for the PR that deletes the dead ATS/theme contexts, renames `ResumeTheme` → `ResumeStyle`, drops `ResumeTemplate` enum, and stands up the new scoring subsystem.

**Target branch:** `fix/migrate-to-release-cli-package`

**Scope:** `profile-services` only. Frontend changes are out of scope for this PR and land separately.

## Preflight (before merging)

1. **Staging backup** — run `pg_dump` against staging and keep the `.sql.gz` on shared storage for at least 48h after deploy.
   ```bash
   pg_dump "$STAGING_DATABASE_URL" --format=custom --file=staging-pre-scoring-refactor.dump
   ```
2. **Smoke-test the migration on a staging clone** — restore the dump to a disposable DB and run `bun prisma migrate deploy` end-to-end. Verify `vector` extension creation, all renames, all new tables.
3. **Feature flag state** — the 4 new flags come seeded `defaultEnabled: true` except `scoring.match.daily-recommendations` which is `false`. Verify via the admin panel after deploy.
4. **Redis availability** — BullMQ queues will fail to boot if Redis isn't reachable. Confirm connection URL is set in staging and prod env.
5. **OpenAI key** — verify `OPENAI_API_KEY` is set. Without it, the `scoring.content-quality.enabled` flag should default to OFF.
6. **Psychometric seed review** — the 100-question pool is hardcoded in `prisma/seeds/fit-questions.seed.ts`. Have the psychometrics content reviewer sign off (in writing, stored in `docs/scoring/SIGNOFFS/`) before merging to main.

## Deployment order

1. **Database migration first** (`bun prisma migrate deploy`). The single migration file contains, in order:
   - `CREATE EXTENSION IF NOT EXISTS vector;`
   - Create new tables: `ResumeStyle`, `ResumeQualityScoreHistory`, `UserFitProfile`, `JobFitProfile`, `FitQuestion`, `FitAnswer`, `FitQuestionSet`, `FitRemapHistory`.
   - Copy all rows from `ResumeTheme` into `ResumeStyle` with a default `styleScore` (recomputed by the app on first boot via the Style Score calculator).
   - Add columns to `Job`: `requirementsStructured`, `requirementsEnrichedByAi`, `enrichedAt`, `enrichedBy`, `culturalProfileCaptured`, `embeddingVector vector(1536)`.
   - Rename `resume.activeThemeId` → `resume.styleId`.
   - Drop `enum ResumeTemplate` and column `resume.template`.
   - Drop score-related columns from `ResumeAnalytics`. Keep view-tracking columns.
   - Drop `ResumeTheme` (after data copy).
   - Create the `ResumeQualityScoreLatest` materialized view.
   - Install DB-level CHECK or trigger ensuring `ResumeStyle.styleScore` is non-decreasing on UPDATE.
2. **Deploy application** (NestJS).
3. **Run seeds** — `bun prisma db seed`. Populates `role_user_standard`, 2 system `ResumeStyle` entries, 100 `FitQuestion` rows.
4. **Backfill** — a one-shot script (`bun scripts/backfill-resume-quality.ts`) enqueues a `ResumeUpdated`-equivalent event for every existing resume so `resume-quality` workers compute a first `ResumeQualityScoreHistory` row for each. Expected runtime: ~5 min per 1000 resumes with Content Quality disabled; longer if IA is on.
5. **Smoke test** (see checklist below).
6. **Flip `scoring.match.daily-recommendations`** to ON once the cron has been observed running cleanly for at least one full cycle.

## Post-deploy checklist

Run these against staging before flipping production.

- [ ] `GET /v1/resume-styles` returns exactly 2 system styles, both with `styleScore ≥ 85`.
- [ ] `GET /v1/resumes/:id/quality` returns a `ResumeQualityScoreHistory`-backed payload (not the old `ResumeAnalytics` shape).
- [ ] `POST /v1/fit-profile/answers` with 25 fake answers persists, returns a vector, and sets `expiresAt = now + 90d`.
- [ ] `POST /v1/match` with a standard user who has no fit profile returns `403 fit_profile_required`.
- [ ] `POST /v1/admin/resume-styles` with a 2-column `styleConfig` returns 422.
- [ ] `PATCH /v1/admin/resume-styles/:id` lowering the score returns 422 from the trigger.
- [ ] `git grep -iE "ats-scoring|ats-validation|ResumeTemplate|ResumeTheme|templates-v2|serializer-v2|typst-wasm"` returns zero matches in `src/`.
- [ ] `bun run precommit` passes (typecheck, lint, unit, arch, contract).
- [ ] Prometheus `/metrics` exposes `score_computed_total`, `score_compute_duration_seconds`, `score_ai_cost_usd_micros_total`.
- [ ] Admin feature-flag panel lists all four new flags and they're togglable.

## Rollback

We intentionally ship without dual-write or shadow mode. Rollback = revert + restore.

1. **Revert the application** — `git revert <merge-sha>` on the target branch, redeploy the previous Docker image.
2. **Restore the database** from the pre-deploy dump:
   ```bash
   dropdb "$PROD_DB_NAME"
   createdb "$PROD_DB_NAME"
   pg_restore --dbname="$PROD_DB_NAME" staging-pre-scoring-refactor.dump
   ```
3. **Flush Redis** — `redis-cli FLUSHDB` on the scoring Redis instance to drop any cached results from the new code paths that the old code won't recognize.
4. **Drain BullMQ queues** — before restoring, let existing in-flight jobs drain (or `FLUSHDB` as above, which discards them).
5. **Notify** — push an incident note to the team channel and create a followup ticket describing the failure.

Rollback is destructive: any resumes, fit profiles, or matches created during the new-code window are lost after step 2. This is acceptable for early-stage with low-volume production; revisit the plan (shadow mode or dual-write) before volume grows.

## Known risks

- **`pgvector` extension install** requires the Postgres superuser. If the staging/prod DB user lacks `CREATE EXTENSION`, the migration will fail at line 1. Coordinate with DBA before deploying.
- **AI quota** — the backfill script will issue a Content Quality AI call per resume. With `SCORING_CONTENT_QUALITY_ENABLED=true`, this can be expensive. Default the flag to OFF during backfill, flip ON afterwards.
- **Typst template path changes** — if custom themes in prod reference `templates/` by hardcoded path, they break. Check `resume.primaryTypstTemplate` column for hardcoded strings before the migration.
- **Breaking SDK consumers** — the `api-client` package has not been regenerated in this PR. Consumers hitting the new endpoints via the SDK will fail to resolve types. Regenerate the SDK in a **follow-up PR** before shipping any UI that depends on it.

## After this PR

The follow-up PRs, in order:

1. SDK regen (`bun run swagger:generate` in profile-services, `bun run sdk:generate` in `api-client`).
2. Frontend UI for scoring (admin `/platform/admin/styles`, onboarding questionnaire, score displays in `/manage-resumes` and job detail pages).
3. MinIO cache for rendered PDFs (see `SCORES_TODO.md`).
4. Transactional emails (lockout warnings, recommendation digests, score improvement alerts).
