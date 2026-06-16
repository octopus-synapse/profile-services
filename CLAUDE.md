# profile-services — Engineering Conventions

This file collects the project-wide conventions decided in the
duplication audit (`docs/audits/duplication-audit-2026-05-03.md`).
Decisions are tagged with the corresponding `QNN` from that audit so
reviewers can trace the rationale.

When working in this repo, prefer these conventions over whatever you
remember from prior projects. When a convention conflicts with what
the code currently does, the convention wins — the divergent code is
on the migration path.

---

## Pagination

- **Response envelope (Q1):** offset endpoints return
  `PaginatedResponseSchema(itemSchema)` from
  `shared-kernel/schemas/common/api.types.ts` →
  `{items, total, page, limit, totalPages, hasNext, hasPrev}`. Cursor
  endpoints return `CursorPaginatedResponseSchema`.
- **Query input (Q2):** routes use `PaginationQuerySchema` from the
  same module (handles `coerce + clamp + default` declaratively).
  One-off `?limit=` parameters use `parsePositiveIntParam` from
  `shared-kernel/http/query-parsers.ts`. Do not write a local
  `parseLimit` / `parsePage` helper.
- **Defaults (Q3 + Q4):** `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`.
  Both live in `shared-kernel/constants/pagination.constants.ts`. Per-BC
  caps (e.g. `FEED_MAX_PAGE_SIZE = 50`) live in their own module and
  document why they diverge.

## Schemas

- **Param schemas (Q5):** import from
  `shared-kernel/schemas/params` — `IdParamSchema`,
  `UserIdParamSchema`, `ResumeIdParamSchema`, `JobIdParamSchema`,
  `SlugParamSchema`. Don't redefine `z.object({ id: z.string() })`
  inline.
- **Datetime primitives (Q7):** `IsoDateTimeSchema` and `DateOnlySchema`
  in `shared-kernel/schemas/primitives/datetime.schema.ts`. Don't
  inline `z.string().datetime()`.
- **Enums (Q11 + Q43):** when an enum exists in `prisma/schema/`, use
  `z.nativeEnum(Prisma.X)` directly. Don't re-declare a literal
  `z.enum([...])` next to it.
- **IDs (Q11):** validate with `z.string().uuid()`. The Prisma migration
  to UUID v7 is staged separately (see `prisma/migrations/`).
## Mappers / Presenters (Q9)

Functions converting domain → response DTO follow:

```
to<Entity>ResponseDto(...)
to<Variant>ResponseDto(...)   // when a single entity has multiple shapes
                              // (toSummaryResponseDto / toDetailResponseDto / toListResponseDto)
```

Don't mix `present*` / `mapXToResponse` / `serialize*` styles.

## Repositories (Q10)

| Method prefix | Returns | On miss |
|---|---|---|
| `get*` | `T` | throws `EntityNotFoundException` (or BC-specific subclass) |
| `find*` | `T \| null` | returns `null` |
| `list*` | `T[]` | returns `[]` |

No `findAll*`. The `get*` variant wraps the `find*` query so the
`if (!x) throw` boilerplate disappears from use cases.

## Exceptions

- Throw domain exceptions; never return `{ success: false }` envelopes
  from handlers (Q18). The HTTP status conveys "error".
- Generic `EntityNotFoundException` from `shared-kernel/exceptions`
  for unknown entities. BC-specific subclasses
  (`ResumeNotFoundException`, `ImportNotFoundException`, etc.) are
  preserved for i18n clarity (Q13 + Q15).
- I18n catalog failures throw the typed family in
  `shared-kernel/exceptions/i18n.exceptions.ts` (Q16) instead of inlining.
- Ownership exceptions stay BC-specific (`NotJobOwnerException`,
  `ResumeNotOwnedException`, etc.) but must `extends OwnershipAccessDeniedException`
  from shared-kernel/authorization (Q24).

## HTTP

- **Auto-201 for POST (Q17):** the Elysia mounter sets `201` when a
  POST handler doesn't declare `statusCode`. Don't return success-data
  with a manual 200 from a POST.
- **Session endpoint (Q19):** authenticated routes return the entity
  directly; throw `UnauthorizedException` on auth failure. No
  `{ authenticated: bool }` envelopes.
- **i18n parity universal (Q8):** every user-facing string in a 2xx
  response comes from a dictionary in `@packages/i18n` with a matching
  parity arch spec in `test/static-analysis/i18n/`. Supported locales
  are `LOCALES = ['en', 'pt-BR']` — the single source of truth lives in
  `packages/i18n/src/types.ts`. No other locale definition may exist.
  Dictionaries and their parity specs:
  - `ERROR_DICTIONARY` — domain exception codes → `i18n-error-parity.spec.ts`
  - `ENUM_DICTIONARY` — Prisma enum labels → `i18n-enum-parity.spec.ts`
  - `NOTIFICATION_DICTIONARY` — notification templates → `i18n-notification-parity.spec.ts`
  - `SUCCESS_MESSAGE_DICTIONARY` — 2xx confirmations → `i18n-success-message-parity.spec.ts`
  - `STATIC_STEP_DICTIONARY` — onboarding step content → `i18n-static-step-parity.spec.ts`

  Entity content (section types, field translations) uses
  `createLocalizedSchema(SCHEMA, LOCALES)` on the write path and has
  boot-time Zod validation in the seed files. Parity specs:
  `i18n-section-type-translations-parity.spec.ts` and
  `i18n-field-translations-parity.spec.ts`.

  Adding a new translated surface = new dictionary + new parity spec.
  Every string is served in the locale from `Accept-Language` / `?locale=`.
- **Success messages (Q8 detail):** routes return `{ code, params? }` and
  the mounter renders via `renderSuccessMessage` using the request's
  `Accept-Language`. Don't return `{ message: 'X deleted successfully.' }` inline.
- **Validation results in 200 bodies (Q8b):** when a use case returns a
  structured validation outcome (multi-error array — e.g. "username has
  3 problems, show them all"), it returns `errors: DomainCode[]` from
  `shared-kernel/i18n`. The route handler injects `TranslationPort`,
  reads `Accept-Language`, and maps each `DomainCode` through
  `localizeDomainCode(dc, i18n, locale)` so the response carries
  `{ code, message, params }` already translated. Never hardcode
  `{ code, message: 'English label' }` inline in the use case — the
  frontend depends on the message arriving in the user's locale
  regardless of HTTP status. The `code` MUST be an entry in
  `@packages/i18n/ERROR_DICTIONARY` (same catalog `DomainException`
  uses) so a single source of truth backs both paths.

## Logging

- **Port (Q20):** depend on `LoggerPort` from `shared-kernel/logger`.
  Never inject `AppLoggerService` directly outside the composition
  root.
- **error() signature (Q21):**
  `logger.error('msg', { context: 'Ctx', stack, ...meta })`. The
  positional form is gone.
- **Console fallback (Q22):** seed runners and translation bootstrap
  use `ConsoleLoggerAdapter`. The Winston `logger.service.ts`
  intentionally falls back to raw `console` for its own self-protection.

## Cache

- **TTL constants (Q31):** import `CACHE_PRESETS` from
  `shared-kernel/cache/cache-ttl.const.ts`. Don't define BC-local
  `CACHE_TTL` constants.
- **Invalidation (Q32):** depend on `CacheInvalidationPort`. Direct
  `cache.delete()` / `cache.deletePattern()` calls outside the
  canonical `CacheInvalidationService` are caught by
  `scripts/lint-cache-direct-delete.ts` (warning today, error after
  the migration sweep).

## Audit

- **Port (Q50):** `AuditLogPort` in `shared-kernel/audit`. New BC code
  depends on this port; the legacy account-lifecycle / authorization
  local ports are kept until adoption catches up.
- **Strict by default (Q51 + Q52):** `audit.log(entry)` throws on
  failure; pass `{ lenient: true }` only for non-compliance flows
  (UI counters, secondary signals).

## Persistence

- **Transactions (Q28):** `runInTransaction(prisma, async (tx) => …)`
  from `shared-kernel/persistence/transaction.ts`. Don't call
  `$transaction` directly in new code.
- **PrismaLikeClient (Q29):** repos that may run inside or outside a
  tx accept `PrismaLikeClient` from
  `shared-kernel/persistence/prisma-types.ts`.
- **Projections:** `USER_SUMMARY_SELECT` / `USER_WITH_BIO_SELECT`
  (Q6), `RESUME_FULL_INCLUDE` / `RESUME_PUBLIC_VISIBLE_INCLUDE` (Q45)
  in `shared-kernel/persistence/`.
- **Soft-delete (Q49):** `Message` / `Post` / `PostComment` only —
  the extension in `bounded-contexts/platform/prisma/soft-delete.ts`
  is the source of truth for which models are filtered. Other models
  hard-delete because GDPR requires erasure.

## Event bus / Lifecycle / Concurrency / Workers

- **EventBusPort (Q33):** one event bus, typed events. Use
  `registerHandler(bus, EventClass, handler)` from
  `shared-kernel/event-bus/register-handler.ts` (Q34).
- **Lifecycle (Q35 + Q36):** wrap composition init with
  `initLifecycle(name, fn, logger)`. Wire shutdown tasks into the
  bootstrap's `OnShutdownPort` (`InProcessShutdownOrchestrator`) and
  pick a strategy (`SEQUENTIAL` / `PARALLEL` / `FAIL_FAST` /
  `BEST_EFFORT`).
- **Distributed lock (Q38):** `DistributedLockPort.withLock(key, opts, fn)`
  for any cross-process critical section.
- **Workers (Q37):** wrap the worker body with `runWithFailureMode`
  declaring `RETRY` / `LOG_AND_CONTINUE` / `FAIL_FAST` explicitly.

## WebSockets (Q39)

- Wrap inbound handlers with `validateWsMessage(schema, handler)`
  so the `unknown` payload is parsed by Zod before the handler runs.

## Handler failure mode (Q13-V3)

Event handlers classify themselves by responsibility — and the
runtime behaviour follows the class, not personal preference:

- **Audit handlers** (`*-audit.handler.ts`, `auth-audit`,
  `export-audit`, `social-audit`, `version-audit`) **rethrow**.
  Strict mode is the default on `AuditLogPort` (Q50–Q52) and
  loss of an audit row is a regulatory gap. The handler stays
  thin (no `try/catch`) — the port's strict policy does the
  enforcement.
- **State-mutating handlers** (cleanup-on-delete, cache
  invalidation, projection sync, idempotent activity creation)
  **rethrow**. A failed cleanup means dangling rows; a failed
  cache invalidation means stale reads. Better to fail loud and
  rerun than to log-and-forget.
- **Telemetry / notification handlers** (`*-metrics.handler.ts`,
  `*-notification.handler.ts`, anything pushing to email / SMS /
  webhooks for user-facing channels) **swallow with
  `logger.error`**. A transient SMTP failure must not abort the
  event chain that also feeds critical state-mutating handlers.

Examples in tree today:

- Rethrow (state): `resume-quality-on-resume-updated.handler.ts`,
  `sync-projection-on-*.handler.ts`, `mutual-follow-on-connection-accepted.handler.ts`,
  `cleanup-resumes-on-user-delete.handler.ts`.
- Swallow (notification): `fit-profile-expired.handler.ts`,
  `resume-quality-rank.handler.ts`.
- Sync, can't fail (metrics): `lifecycle-metrics.handler.ts`,
  `score-metrics.handler.ts` — Prometheus `.inc()` / `.observe()`
  are synchronous and do not throw, so no `try/catch` needed.

## Real-time transport: SSE vs WebSocket (Q15-V3)

Pick the transport by direction, not by mood. WebSockets are
bidirectional and stateful (chat, presence, typing indicators);
SSE is server-push only over plain HTTP and cheaper to scale
(feed, notifications, feature-flags stream). Don't reach for WS
when SSE already does the job.

- **Use SSE when** the server is the only producer (live feed,
  notifications, flag invalidation broadcast). Declare the route
  with `kind: 'sse'` so the Elysia mounter skips the response
  envelope and streams `text/event-stream`.
- **Use WS when** the client also sends messages (chat, presence,
  collaboration cursors). Wrap every inbound handler with
  `validateWsMessage(schema, handler)` (Q39) and require an
  explicit allowed-origin set (P0 sweep — WebSocket origin
  policy).
- **Don't** introduce a WS gateway when an SSE stream + REST
  mutations would cover the same surface. The asymmetric cost of
  upgrading later (you can always promote SSE → WS when the
  client needs to talk back) is much smaller than maintaining a
  WS gateway that never sees inbound traffic.

## Tests

- See `test/README.md` for the three layers + fixture conventions.
- Factory naming (Q57): `build*` for in-memory objects, `freshInDb*`
  for DB-provisioned helpers.
- Cross-BC test mocks live in `test/shared/mocks/` (Q59).
- I18n parity helpers live in
  `test/static-analysis/shared/dictionary-discovery.ts` (Q60).

## Naming / file conventions (Q41 + Q67)

These names matter — scripts and architecture rules pattern-match on them.

| Suffix | Meaning |
|---|---|
| `*.use-case.ts` | Application use case (always exported as `class XxxUseCase`) |
| `*.composition.ts` | Composition root for a sub-module (returns the BC bundle) |
| `*.port.ts` | Domain or application port (abstract class / interface) |
| `*.adapter.ts` | Concrete implementation of a port |
| `*.routes.ts` | Elysia route descriptors (`Route<T>[]`) |
| `*.routes.schemas.ts` | Zod schemas + bundle types for the matching `*.routes.ts` |

Don't put Zod schemas inline in `*.routes.ts`; they belong in
`*.routes.schemas.ts`.

### Enum sharing policy (Q41)

If an enum is used in 3+ BCs, hoist it to `shared-kernel/enums`. If
it's a Prisma enum, import it from `@prisma/client` directly — don't
re-declare.

## Security primitives (P0 sweep — PR #227)

### `SafeFetchPort` — SSRF defense for user-supplied URLs

User-supplied URLs (post link previews, registered webhook targets)
MUST go through a `SafeFetchPort` instead of the global `fetch`. The
port enforces protocol allowlist (`https:`/`http:` only) + DNS
resolution + IP allowlist (rejects loopback / RFC1918 / link-local
incl. AWS metadata `169.254.169.254` + IPv4-mapped IPv6).

Two implementations:
- **`SafeFetchAdapter`** (default): single-shot reads (link preview).
- **`SafeFetchStrictAdapter`**: pins the TCP socket to the resolved IP
  literal so DNS rebinding can't flip the connection target after the
  pre-check passes. Use for repeated outbound traffic where the
  attacker is motivated (webhook delivery).

### `OwnershipGuard` — route-level ownership checks

When ownership is a simple `paramKey → ownerId` query, declare:

```ts
guards: [{ id: 'ownership', metadata: { entity: 'resume', paramKey: 'resumeId' } }]
```

Each BC's composition registers its lookup in `OwnershipRegistry`.
The guard rejects with 403 (`OwnershipResourceMissingException` /
`OwnershipAccessDeniedException`) before the handler runs.

Use UC-level validation (existing `ResumeOwnershipPolicy`-style
ensure*) when the use case must already load the entity for other
reasons (shared resumes, public flags, multi-owner aggregates) — skip
the route guard so the query isn't duplicated.

### JWT validation via `ConfigPort` schema

`JWT_SECRET` (and the rest of `.env.example`) is validated up front by
`EnvConfigSchema` (Zod) in the `ProcessEnvConfigAdapter` constructor.
Boot fail-fast: `ConfigValidationError` lists every missing/invalid
var in one report. **Never** add a default for a true secret in code.

### WebSocket origin policy

`ElysiaWebSocketAdapter` requires `allowedOrigins: ReadonlySet<string>`.
Composition root computes the union of `CORS_ORIGIN`, `APP_URL` /
`PUBLIC_APP_URL`, and `ALLOWED_WS_ORIGINS` via
`buildAllowedWsOrigins(config)`. **Fail-closed**: an empty set rejects
every WS upgrade with 403. Native clients must send a recognised
`Origin` header.

### PII redaction in logs

Use `redactEmail()` from `@/shared-kernel/logger` whenever a log entry
would otherwise carry a raw email. The script
`scripts/lint-pii-in-logs.ts` runs in CI and fails the build if a
`logger.<level>` call references `*.email` (or `to:`/`recipient:`/
`emailAddress:` metadata) without wrapping in `redactEmail()`.

For a non-PII identifier (preferred when available), log the
`userId` instead.

## Workers (P0-010)

Every worker — cron OR queue consumer — wraps its body with one of:

- **`runGuardedJob({ name, expectedDurationMs, failureMode, lock, logger }, fn)`**
  for **cron** workers. Combines a distributed lock (so multi-instance
  deploys don't double-execute the same scheduled tick) with the
  declared failure mode. Lock TTL = `max(2 × expectedDurationMs, 5min)`.
  Skip silently when the lock is held by another instance.
- **`runWithFailureMode({ worker, logger }, mode, fn)`** for **queue
  consumers** (`process(job)`). BullMQ already de-dupes via `jobId`
  and handles retry, so an extra distributed lock would only block
  horizontal scaling. The wrapper still gives uniform error logging
  and explicit failure-mode declaration.

`expectedDurationMs` MUST reflect the worker's p99 wallclock (measure
via Prometheus or log timestamps from the past week). When you don't
know yet, default to 30s and tune after the first observability cycle.

## Audit log policy

Audit events use `AuditLogPort` (Q50). Default is **strict**: a
write failure throws `AuditLogFailedException` and unstucks the event
bus loop. Use the strict mode for compliance-relevant events
(authentication, session lifecycle, exports, social actions, version
mutations) — a missed audit row is a regulatory gap under LGPD/GDPR.

`{ lenient: true }` (Q52) is reserved for telemetry-only signals where
storage availability is more important than the audit trail. Today no
caller in the repo uses lenient mode; introducing one needs an
explicit comment justifying why audit loss is acceptable.

Per-BC audit handlers (P1-035) live next to their BC's domain events
and follow the **composition** pattern — each handler holds an
`AuditLogPort` reference and calls `buildAuditEntry()`. Inheritance
between handlers is deliberately avoided.

## S3 ACL policy (P0-015)

`S3UploadService.uploadFile` accepts an explicit `acl: 'public-read' | 'private'`:

| Asset | ACL | Why |
|---|---|---|
| Profile photos | `public-read` | Part of the user's public-facing profile in the social graph |
| Company logos | `public-read` | Branding asset attached to a public job listing |
| **Post images** | **`private`** | Feed posts can carry connection-only / restricted content |
| Resume exports | `private` (presigned GET) | User-scoped artefacts; presigned URL TTL 5min |

Posts served via presigned GET MUST set `Cache-Control: private, max-age=300`
on the response so CDNs don't share a leaked URL across users.

## `ResumeStyle.styleScore` — data-driven Style Score (NEW-3)

`styleScore` (0-100) is recomputed from `styleConfig` on every
create/update by the data-driven rubric (`StyleScoringCriterion`
catalog + the evaluators in
`resume-styles/domain/rules/style-criteria/`). It is **not** monotonic:
a worse template legitimately scores lower (migration
`20261107000000_style_score_rubric` dropped the old `BEFORE UPDATE`
trigger). Creation/update below `STYLE_SCORE_MIN` (80) is rejected with
`422 STYLE_BELOW_ATS_THRESHOLD`. Tune the rubric by editing the
`StyleScoringCriterion` rows (weights/thresholds/allowlists) — no deploy
needed; only a new criterion `key` requires a code evaluator.

## Resume Quality Score (3.2) — `resume-quality` BC

Per-resume score of how good the CV is, independent of any job. Composed of
two sub-scores, persisted append-only in `ResumeQualityScoreHistory`
(`overallScore` / `completenessScore` / `contentQualityScore`); the read API
serves the latest row.

- **Completeness (3.2.2)** — deterministic, `domain/rules/completeness.rules.ts`.
  `COMPLETENESS_WEIGHTS` sum to 100; bump `COMPLETENESS_RULES_VERSION` (in
  `domain/types.ts`) on any weight/rule change. `phone` and `dates`
  (start date on experience/education) score; `temporalConsistency` /
  `uniqueSkills` already score; the structural-ATS checks stay advisory.
  The loader (`prisma-resume-loader.adapter.ts`) projects the generic section
  graph into typed `experiences/educations/skills` + real `bullets` + the
  resume `language` — keep it the single projection point.
- **Content Quality (3.2.1)** — AI, `ai-content-quality.adapter.ts` →
  `ScoringLlmPort.analyzeContentQuality` (OpenAI, default `gpt-4.1-mini` via
  `OPENAI_SCORING_MODEL`). It grades the **real bullet text** (experience
  descriptions + achievements, summary, project highlights) for action verbs /
  metrics / XYZ-STAR / specificity, and answers in the resume's `language`.
  Kill-switch flag `scoring.content-quality.enabled`; on failure/off the
  sub-score is `null` and the overall degrades to completeness alone. Cost goes
  to `costUsdMicros` via `OPENAI_SCORING_PRICE_USD_MICROS_PER_1K_TOKENS`.
- **Overall** = `0.4·completeness + 0.6·content` (completeness-only when content
  is null). Informational only — **never** gate publish/apply on it.
- **Lifecycle**: computed **inline** on create + duplicate
  (`resume-quality-on-resume-created.handler.ts`, bound to
  `ResumeCreatedEvent`/`ResumeDuplicatedEvent`, **swallows** errors so it never
  blocks creation — a deliberate exception to the rethrow rule). On update the
  recompute is **selective**: `resume-quality-on-resume-updated.handler.ts`
  reads `changedFields`, runs completeness always but only spends an AI call
  when content changed (`summary` scalar or a `sections:WORK_EXPERIENCE|SUMMARY|
  PROJECT|VOLUNTEER` token), with a sliding ~15s debounce (`JobQueuePort.remove`
  + delayed enqueue). Section-item use-cases emit `ResumeUpdatedEvent`
  (`sections:<semanticKind>`) so bullet edits trigger recompute.
- **i18n**: issue codes resolve via `QUALITY_ISSUE_DICTIONARY`
  (`@packages/i18n`, parity spec `i18n-quality-issue-parity`); the route
  localises `message` by `Accept-Language`. `AI_*` codes carry a fixed category
  label while the per-bullet detail rides in `freeformMessage` (resume
  language). New `IssueCode` → add to `ALL_ISSUE_CODES` + the dictionary.

## Scripts

See `scripts/README.md` for the inventory and the public/internal
distinction.

P0-sweep additions:
- `lint-pii-in-logs.ts` — fails on `${user.email}` or `to:` raw email in `logger.*` calls.
- `check-no-group-refs.ts` — fails on any reintroduction of the dropped Group/UserGroup tables.
- `check-pg-extensions.ts` — pre-deploy gate verifying `pg_uuidv7` is in the cluster's allowlist.
- `check-route-guards.ts` — flags `guards: [{ id }]` declarations that have no pipeline stage (silently un-guarded routes).
