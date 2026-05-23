# Resume-style canonicalization — pending decisions

Tracks loose ends from the "abolish system-themes / canonicalize on
ResumeStyle" refactor (commit family **resume-style-canonical**).
The bulk of the work landed green:

- Migration `20260521000000_resume_style_canonical` drops
  `OnboardingProgress.templateSelection` (backfilling `resumeStyleId`
  when the legacy `templateId` was a valid `ResumeStyle.id`) and
  `Resume.template`.
- Onboarding BC: deleted `SystemThemesPort`/`SystemThemesAdapter`,
  added `ResumeStylesQueryPort`, step `'template'` → `'resume-style'`,
  storage `templateSelection` → `resumeStyleId`.
- Frontend: `step-theme.svelte` → `step-resume-style.svelte`, stepper
  rewired, i18n keys `onboarding.theme.*` → `onboarding.resumeStyle.*`.
- SDK regenerated; backend + frontend typecheck = 0 errors.
- Onboarding unit specs: **100/100 green**. E2E onboarding specs:
  **all green** (the 16 e2e fails remaining at suite-finish are
  pre-existing — Export PDF, Chat, 2FA disable, Analytics 404,
  three-stage-gating Stage 2 — none touched by this refactor).
- Frontend `step-review.test.ts`: 5/5 green.

What follows is the decision-or-action backlog we punted on while
shipping the main refactor.

---

## 1. Stale `OnboardingProgress.username = "Enzo Patti"` rows

**Status**: data-cleanup question. The pre-refactor codebase let
non-canonical strings into `OnboardingProgress.username` (we saw
`"Enzo Patti"` — uppercase + space — in `efpatti.dev@gmail.com`'s
row). The current `SaveProgressUseCase.normalizeUsername` rejects
those, so any user with such a row now sees a UI gate they can't
move past until they pick a fresh value — fine for low volume,
risky if other users are stuck the same way.

**Options**:
- (a) Manual ops query: `UPDATE "OnboardingProgress" SET username = NULL WHERE username !~ '^[a-z0-9_]+$' OR length(username) NOT BETWEEN 3 AND 30;`
  Cheap, one-shot. The user is forced to re-pick on next visit.
- (b) Add a one-time data migration appended to
  `20260521000000_resume_style_canonical`. Pro: ships with the same
  rollout. Con: silently mutates user-facing data without a
  notification.

**Recommendation**: (a) after checking the count. The set is likely
small (single-digit) and the gate gives the affected users a clear
path forward.

---

## 2. `OnboardingProgress.resumeStyleId` backfill audit

The migration's backfill copies `templateSelection->>'templateId'`
into `resumeStyleId` only when it's a non-empty string that exists
in `ResumeStyle.id`. Rows whose legacy `templateId` was a free
string (`'PROFESSIONAL'`, `'MODERN'`, etc.) get `resumeStyleId =
NULL`. That's intentional — the resume-onboarding adapter falls
back to the seeded default style — but we never audited how many
rows fall in each bucket.

**Action**: post-deploy, run

```sql
SELECT
  count(*) FILTER (WHERE "resumeStyleId" IS NOT NULL) AS backfilled,
  count(*) FILTER (WHERE "resumeStyleId" IS NULL) AS reset
FROM "OnboardingProgress";
```

If the reset count is high, decide whether to ship a one-time
notification ("we updated the style picker, your draft was reset").

---

## 3. Pre-existing failing tests unrelated to the refactor

The following e2e/integration tests were red **before** this
refactor and remain red. They are not blockers for landing the
ResumeStyle canonicalization, but they should be triaged in their
own ticket so we don't lose them in the noise:

### E2E (`bun run test:e2e`)
- `3-Stage Gating > Stage 2 — verified but not onboarded > returns
  403 with onboarding-completed missing on a protected endpoint`
  → currently 403 `INSUFFICIENT_PERMISSION` instead of
  `ONBOARDING_NOT_COMPLETED`. Looks like the permission gate stage
  fires before the onboarding gate; should be the other way around
  so the client gets an actionable code.
- `Journey 5: Export Pipeline > PDF export …` (4 tests). Likely a
  worker/typst-binary availability issue in the e2e container.
- `Journey: Chat > Step 1/3/5` (5 tests). Conversation persistence
  smell.
- `Journey: 2FA > Step 9/10 / Security Edge Cases` (5 tests).
  Probably TOTP secret reuse / lockout state pre-existing.
- `Journey: Analytics Pipeline > Step 10 > 404 for non-existent
  resume analytics`. Off-by-one between view-events and the 404.

### Integration (`bun run test:integration`)
- `Complete Onboarding Flow > …` — 194 fails, **all** stemming
  from the same root cause: `createTestAccount` 429s after the
  10/600s signup rate limit fills, because the spec never calls
  `clearRateLimitState()`. Fixing requires inserting a
  `beforeEach` that flushes `ratelimit:*:POST:/v1/accounts` (the
  exact mistake we already fixed in `auth.helper.ts` during the
  first conversation — this spec just predates that fix).
- Several `Collaboration Integration`, `ToS Acceptance`, `Password
  Reset`, `Resume Delete Cascade`, `2FA Security` failures. Almost
  certainly the same rate-limit cascade — confirm before chasing
  individually.

**Recommendation**: add `await clearRateLimitState()` to each
spec's `beforeEach` (or its setup helper). Then re-triage what's
left. The current red count over-states the actual breakage.

---

## 4. `Resume.template` enum drop — verify production zero-traffic

The migration `DROP COLUMN "Resume"."template"` is safe because
greps showed no writers or readers. But the SDK previously exposed
`template: ResumeTemplateEnum.optional()` on `CreateResume` /
`UpdateResume`, so older clients (mobile, scripts pinned to an
older SDK hash) might still send it. Postgres silently strips
unknown columns on JSON insert paths, **but** Prisma will throw if
a typed client sends the field after the regen.

**Action**: after regen, run a one-off survey of the last 7 days
of `POST /v1/resumes` / `PATCH /v1/resumes/:id` access logs for
the `template` field. If anyone still sends it, ship a one-release
deprecation banner before merging the migration to prod.

---

## 5. `resumeStyleId` as a required vs optional step

Today the resume-style step is `required: true` in
`onboarding-step.seed.ts` but `validation: {}` (no required
fields). That means:

- The sidebar shows the red-dot until the user has visited the
  step (`completedSteps` array).
- The `resume-onboarding.adapter` happily falls back to the
  seeded default when `resumeStyleId IS NULL`.

That dual semantics — "must visit, but value is optional" — is
intentional (we want the user to consciously pick or skip), but
worth flagging: a future product change that wants the field
mandatory will need to flip `validation: { requiredFields:
['resumeStyleId'] }` in the seed, not just a Zod tweak.

---

## 6. Frontend stepper persistence draft

The onboarding-stepper's `stepData` slot used to spread
`onboardingData.templateSelection` and rely on Vue/Svelte's
permissive prop drilling to grab `templateId`/`colorScheme`. Now
it spreads `personalInfo` / `professionalProfile` and reads
`onboardingData.resumeStyleId` as a sibling key. **Sanity check**:
if any test fixture in the frontend e2e (`playwright`) still
seeds `templateSelection` directly into a localStorage draft or a
mocked SDK response, the resume-style step will load with an
empty selection. Worth a `git grep -i templateselection
apps/web/test` before relying on that pathway.

---

## 7. Static-analysis spec for `OnboardingStep.component` values

`onboarding-step-data.mapper.ts` now switches on
`'resume-style'` (string literal). If someone renames the seed key
without updating the mapper, save-progress will silently no-op for
that step. Worth adding a guard:

```ts
// test/static-analysis/onboarding/component-keys.spec.ts
import { steps as seed } from '../../../prisma/seeds/onboarding-step.seed';
const KNOWN = new Set(['welcome', 'personal-info', 'username',
  'professional-profile', 'generic-section', 'resume-style',
  'review', 'complete']);
for (const s of seed) expect(KNOWN).toContain(s.component);
```

Defers the breakage from "user sees blank screen at the picker"
to "CI bails before merge."
