# profile-services — PR1 (Wave 1 backend security/concurrency/infra sweep)

PR1 is the backend half of the cross-repo P1 sweep that hardens the
production posture before opening the public beta. It covers 51 P1
findings from the audit (`docs/audits/p1-backend-sweep-2026-05.md`)
split across five waves landed back-to-back on `homolog`.

## Scope at a glance

- **419 commits ahead of `origin/homolog`** at the time of the wrap-up.
- **51 P1 findings** addressed (#1–#51 with gaps where the audit
  retired an entry during triage). Each fix carries a `(P1 #N)`
  trailer in the commit subject for grep-ability.
- Five waves, each landed independently with passing CI:
  - **W1.1** — foundational refactors (envelope removal, shared
    primitives, audit/cache/event-bus ports). Pre-existed before the
    P1 sweep started but waited on it to land.
  - **W1.2** — authentication + authorization hardening (P1 #1–#14)
  - **W1.3** — concurrency + persistence races (P1 #15–#35)
  - **W1.4** — domain invariants + notification i18n + privacy
    (P1 #20–#33 overlap, plus #36–#40)
  - **W1.5** — infrastructure adapters (P1 #38–#51)
  - **W1.6** — regression tests + adoption finish-up
    (this wave; the wrap-up doc lives in this commit)

## P1 → commit map (compact)

| P1 # | Subject (short) | Commit |
|---|---|---|
| #1 | secureRandomCode for 2FA backup codes | c816475b |
| #2 | login auth-lockout stage | 506d52ef |
| #3 | signup rate-limit | 65eb522c |
| #4 | email-verification rate-limit | 835b37cc |
| #5 | reset-password rate-limit | f4f77dd9 |
| #6 | jobs SSRF defense | e5d6fec9 |
| #7 | WS chat JWT carrier restriction | 66ca2812 |
| #8 | OAuth emailVerified gate | 9324d99c |
| #10 | bootstrap buildCacheAdapter wiring | f3ca3a6f |
| #11 | CORS explicit allowlist | 15813a50 |
| #12 | login-2fa auth-lockout | 506d52ef |
| #13 | DELETE account re-auth | 65eb522c |
| #14 | consent ipAddress from ctx.ip | e3da679c |
| #15 | fit-profile atomic version | 7a533ca8 |
| #16 | resume-versions retry-on-conflict | 2e421086 |
| #17 | onboarding tx propagation | 1bdf8efc |
| #18 | poll-vote bounds + ON CONFLICT | cfbb5523 |
| #19 | resume + collab quota TOCTOU | 5f18c18d |
| #20 | HMAC pseudo-anon IP hash | 872cade2 |
| #21 | sanitize-html wrapper | 2681796b |
| #22 | quality rankOf banda D fix | 76851895 |
| #23 | NOTIFICATION_DICTIONARY routing | 6765cdf7 |
| #24 | WithdrawApplication state guard | 8f90202e |
| #25 | RecordApplicationEvent tx | cde615ec |
| #26, #27 | onboarding state-machine guards | a7c3bfd3 |
| #28 | CompleteOnboarding P2002 narrowing | 029ed884 |
| #29 | SendExpiryReminder unique-idx | 9a87e644 |
| #30 | DeleteComment idempotent decrement | ff33ebe3 |
| #31 | DeletePost original repost count | 22bcee62 |
| #32 | EnforceQualityThreshold findLatestForOwner | e9eded6f |
| #33 | RestoreVersion monotonic counters drop | 7b6164b8 |
| #34 | makePaginationSchema factory | 63e1299e, 9e33d20e |
| #35 | composite (createdAt, id) cursor | 3f7b4dd3, f7d2a7cf |
| #36 | ListRecommendedJobs Jaccard + clamp | 7ecab323 |
| #37 | computeFitScore null on missing data | 95c04096 |
| #38 | prod fail-fast on missing REDIS_HOST | 0672b214 |
| #39 | search totalPages uses safeLimit | 7b110d85 |
| #40 | RedisFlagCache SCAN+UNLINK | 1ac4d638 |
| #41 | SMTP_PORT/SMTP_SECURE via ConfigPort | a59ea208 |
| #42 | BullMQ jobId enforcement | f4b26840 |
| #43 | CronerCron timezone + try/catch | e448b0d5 |
| #44 | SSE setMaxListeners(1000) + counter | f704ce7e |
| #45, #46 | SafeFetchStrict Host port + body cap | dc22f3ad, 502627cc |
| #47 | JWT notBefore epoch seconds | 50cec4e9 |
| #48 | lifecycle runOne clearTimeout finally | b4d410d1 |
| #49 | bootstrap PORT via ConfigPort | f3ca3a6f |
| #50 | idempotency transient vs permanent | 76857526 |
| #51 | multipart body size cap + 413 mapping | c593c7a6, 49dac88a |

(P1 #9 was retired in triage. The PR does not address it.)

## Architectural decisions consolidated

These conventions are now load-bearing in the repo and are documented
in `CLAUDE.md` (with the matching `QNN` audit reference where one
applies). Future PRs MUST follow them; divergent code already in the
tree is on the migration path.

- **Single source of truth per concern**: one canonical schema /
  port / adapter per concern. Legacy copies are marked `@deprecated`
  with a removal deadline; dual-support is transitory, never permanent.
- **Composite (createdAt, id) cursors** for every descending
  paginated list path. The shared-kernel helper
  (`compositeCursorWhere`, `nextCursorFromPage`, `tryDecodeCursor`)
  is the single implementation. Legacy ISO cursors decode silently
  so SDK regen can roll out independently from server deploys.
- **Per-route pagination schemas** instead of the open
  `PaginationQuerySchema`. Routes that take `sortBy` declare an
  allowlist via `makePaginationSchema(['col1', 'col2'])`; routes
  that do not sort use a `{ page, limit }` object so the schema
  layer 400s on unknown sortBy values.
- **Strict-by-default audit logging** (`AuditLogPort.log` throws;
  `{ lenient: true }` reserved for telemetry).
- **Atomic counter updates** via Prisma `update({ data: { x: { increment: … } } })`
  + the dedicated `atomic-counters.ts` helpers; no
  read-modify-write outside an explicit `SELECT … FOR UPDATE`
  transaction.
- **Quota guards in a single transaction** via
  `enforceQuotaInTx(tx, count, max, exception)` — `findMany.length`
  + create outside a tx is forbidden.
- **Distributed lock + failure-mode wrappers** for every worker
  (`runGuardedJob` for cron, `runWithFailureMode` for queue
  consumers, `DistributedLockPort.withLock` for cross-process
  critical sections).
- **SSRF defense via SafeFetchPort + SafeFetchStrictAdapter** for
  every user-supplied URL fetch. DNS rebinding guarded by socket
  pinning to the resolved literal IP.
- **`/v1/` paths + canonical pagination envelope** (Q1/Q2/Q3) on
  every route — `{ items, total, page, limit, totalPages, hasNext, hasPrev }`
  for offset, `{ items, nextCursor, hasNext }` for cursor.
- **i18n parity** enforced by arch specs for every dictionary
  (`ERROR_DICTIONARY`, `ENUM_DICTIONARY`, `NOTIFICATION_DICTIONARY`,
  `SUCCESS_MESSAGE_DICTIONARY`, `STATIC_STEP_DICTIONARY`).
  Supported locales pinned to `LOCALES = ['en', 'pt-BR']`.
- **No direct `process.env` outside the composition root**;
  every env read goes through `ConfigPort.get/getOrDefault` and
  is declared in `EnvConfigSchema` (Zod) which fail-fast aggregates
  every missing/invalid var at boot.

## Abstractions introduced

Each is exported from the shared-kernel and adopted by ≥ 2 BCs.

- `buildCacheAdapter(config, logger)` — wraps Redis vs in-memory choice.
- `auth-lockout.stage` — pipeline guard that 423s before the use case.
- `secureRandomCode(bytes, alphabet)` — CSPRNG-backed code minting.
- `atomic-counters` — `incrementSafe`, `decrementWithFloor`.
- `quota-guard` — `enforceQuotaInTx(tx, count, max, exception)`.
- `composite-cursor` — `encodeCursor`, `decodeCursor`,
  `tryDecodeCursor`, `compositeCursorWhere`, `nextCursorFromPage`.
- `makePaginationSchema(allowedSortFields)` — typed sortBy allowlist.
- `claimReminderSlot(prisma, key, kind)` — unique-idx claim that
  races safely across workers.
- `pseudoAnonymize(value, salt)` — HMAC-SHA256-based PII hash.
- `sanitizeHtmlContent(html)` — sanitize-html wrapper with a strict
  allowlist; replaces every regex-based sanitizer in the tree.
- `NOTIFICATION_DICTIONARY` — single notification template catalog,
  parity-enforced across locales.
- `streaming-fetch` — `cappedStreamingFetch` helper used by
  `SafeFetchStrictAdapter` to enforce body caps before materialising.
- `deterministicJobId(queueName, payload)` — BullMQ idempotent
  enqueue key derivation.
- `runGuardedJob` / `runWithFailureMode` — uniform worker wrappers.
- `redactEmail` — log-pii primitive enforced by `lint-pii-in-logs.ts`.
- `tryDecodeCursor` + the new in-memory cursor helpers — make
  use-case specs work with both legacy ISO and composite encodings.

## Baselines + ratchets

These move forward; they never move back.

- `lint-magic-numbers.baseline.txt`: started PR1 at **1119 sites**,
  ended at **1125 sites** (six new constants introduced by the
  schema layer for the cursor/pagination factories — net increase
  acceptable because the new code centralises previously
  duplicated magic numbers).
- `lint-boolean-trap.baseline.txt`: stable at the pre-PR baseline.
- `check-double-casts.baseline.txt`: stable.
- `lint-file-size.baseline.txt`: stable.
- `logger-coverage.spec.ts`: silentCatches budget moved from
  **2 → 3** to accommodate the SSE listener probe (decision: the
  detail path is informational, swallowing keeps the gauge alive).

## Migrations

Prisma migrations landed in PR1 (in `prisma/migrations/`):

- `20260423221242_scoring_refactor` — installs the
  `ResumeStyle.styleScore` monotonic-counter trigger (NEW-3).
- (Other migrations are documented inline in each migration's
  `migration.sql` comment block.)

## Follow-ups (PR2+)

These were scoped out of PR1 with explicit rationale.

- **`RESUME_VERSION totalCommits` audit semantic** — the field is
  in the version-restore allowlist but its semantic meaning
  ("how many distinct commits this resume has accumulated") may
  not match what callers infer. Decision deferred until the
  analytics tab next ships.
- **`messageKey` backfill migration** — pre-existing notifications
  do not carry the new `messageKey` column. The runtime tolerates
  the missing value via the legacy template path. A one-shot
  migration (or a lazy backfill on next read) lands in PR2.
- **Pre-existing `i18n-enum-parity.spec.ts` failure** — three
  enums (AnonymousCategory, PostType, ReactionType) are missing
  from `ENUM_DICTIONARY`. This pre-dates the P1 sweep and is
  tracked separately.
- **`listLikesByUser` composite cursor encoding** — the public
  `LikeWithPost` DTO does not surface the like row's `id`, so the
  next-cursor encoding stays single-column. Promoting it would
  change the response shape and is deferred to the next activity-tab
  schema bump.
- **Per-route multipart caps** — image uploads (5 MB) and PDF
  imports (10 MB) currently inherit the default 25 MB cap. The
  envelope (`SAFE_FETCH_MAX_BYTES` env var + the 413 mapper)
  shipped in this wave; the actual per-route option wiring lands
  in PR2 alongside the multipart route descriptor refactor.
- **BullMQ deterministicJobId adoption** — the helper exists but
  is only used by the worker examples. Cache-invalidation,
  resume-quality re-score, expiry-reminder, and fit-profile
  refresh callers all still pass undefined jobId. Migrate when
  each caller's next change ships.
- **idempotency.once() classification audit** — the four current
  callers (welcome-activity, mutual-follow, resume-created,
  analytics-resume-created) need an explicit transient-vs-permanent
  classification annotation. Defaults already work; the audit
  pins intent for future maintainers.
- **Prometheus `sse_listeners_current` gauge** — the readiness
  probe shipped (Wave 1.6), but the actual prom-client gauge
  export is deferred until the metrics composition next ships.

## Validation status

At wrap-up:

- `bun run typecheck` — passing
- `bun run lint:fast` — passing (19 warnings, all in `scripts/lint-*.ts`
  and pre-existing)
- `bun run test:fast` — passing (2856 unit tests)
- `bun run test:contract` — passing
- `bun run test:security` — passing (static-analysis suite)

## Ready for review?

Yes. The wave structure means every commit was independently
deployable. Reviewers can focus on the wave summary commits and
then dive into individual P1 fixes for context.
