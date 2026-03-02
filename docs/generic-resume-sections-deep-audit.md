# Generic Resume Sections Migration Audit (Deep Scan)

Date: 2026-02-28  
Author mindset: **Clean Architecture / Uncle Bob discipline**

---

## 1) Objective and Rule of the Game

You defined a strict rule:

1. **Production code must not depend on legacy section buckets** (`experiences`, `education`, `skills`, `projects`, `certifications`, etc.).
2. Those names should exist **only** in:
   - Prisma **seeds** (especially section type population), and
   - **tests**.
3. We are migrating to canonical **generic section modeling**:
   - `SectionType`
   - `ResumeSection`
   - `SectionItem`
4. Three sections are **special** because they depend on DB-backed knowledge:
   - `education` (MEC institutions/courses)
   - `skills` (skills catalog)
   - `certifications` (needs catalog/normalization policy)

---

## 2) What Was Already Migrated (Good Progress)

- Prisma schema already moved toward canonical section structure:
  - `ResumeSection`, `SectionItem`, `SectionType` remain as source of truth.
  - legacy basic models (`Experience`, `Education`, `Skill`, `Language`, `Project`, `Certification`, `Award`, `Recommendation`, `Interest`) were removed from schema files.
- Resume version snapshot was updated to generic format (`resume` + `sections`) and restore made backward compatible.
- Core newer services (`generic-resume-sections`, `resume-management`, `resume-version`) are aligned with the new architecture direction.

This is exactly the right strategic direction.

---

## 3) Deep Findings — What Still Violates the Rule

## 3.1 Critical (high risk / immediate)

### A) Seeds and infra utilities still assume removed legacy Prisma relations/models

- `prisma/seeds/analytics-projection.seed.ts`
  - uses `_count.experiences`, `_count.education`, `_count.skills`, etc.
  - after full Prisma client regeneration against current schema, this is expected to break.
- `src/bounded-contexts/platform/prisma/prisma.service.ts`
  - `cleanDatabase()` still references legacy delegates (`experience`, `education`, `skill`, `project`, etc.).

**Why this matters:** this is operational fragility. Migration may be “conceptually done” but toolchain/maintenance routines can fail unexpectedly.

---

## 3.2 Structural violations in production code (non-test)

These files still materialize legacy bucket names in runtime logic.

### Public/presentation mapping to old buckets

- `src/bounded-contexts/presentation/public-resumes/services/resume-share.service.ts`
  - maps generic sections into `experiences`, `education`, `skills`, `projects`, etc.

### DSL rendering pipeline still uses old bucket model

- `src/bounded-contexts/dsl/dsl/dsl.repository.ts`
- `src/bounded-contexts/dsl/dsl/dsl-compiler.service.ts`
- `src/bounded-contexts/dsl/domain/value-objects/resume-with-relations.ts`
- `src/bounded-contexts/dsl/application/compilers/*`
  - architecture still centered on per-section explicit arrays.

### Export pipeline still uses old bucket contracts

- `src/bounded-contexts/export/export/services/resume-json.service.ts`
- `src/bounded-contexts/export/export/services/resume-latex.service.ts`
- `src/bounded-contexts/export/export/services/docx-sections.service.ts`

### Analytics pipeline partially generic, partially legacy

- `src/bounded-contexts/analytics/resume-analytics/services/dashboard.service.ts`
- `src/bounded-contexts/analytics/resume-analytics/services/ats-score.service.ts`
- `src/bounded-contexts/analytics/resume-analytics/services/keyword-analysis.service.ts`
- `src/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade.ts`
  - facade reads generic sections, then converts into `skills` + `experiences` arrays for downstream services.

### GDPR export still emits legacy section buckets

- `src/bounded-contexts/identity/auth/services/gdpr-export.service.ts`
  - groups by `experiences`, `education`, `skills`, `projects`, etc.

### Theme validator hardcodes old section ids

- `src/bounded-contexts/presentation/themes/validators/config.validator.ts`
  - `VALID_SECTION_IDS` contains legacy slugs/buckets.

### Shared kernel still exposes legacy resume relations API

- `src/shared-kernel/schemas/resume/resume.schema.ts`
  - `CreateResumeSchema` still accepts `experiences`, `educations`, `skills`, etc.
- `src/bounded-contexts/resumes/resumes/resumes.repository.ts`
  - still omits these relation keys from DTO types.

### Import boundary still built around old JSON Resume buckets

- `src/bounded-contexts/import/resume-import/resume-import.service.ts`
  - parse result emits `experiences`, `education`, `skills`, etc. as first-class internal structure.

---

## 3.3 Semantic kind references in production

If we apply your strictest interpretation (“section-type names only in seed/test”), then these are also violations:

- `WORK_EXPERIENCE`, `EDUCATION`, `SKILL_SET`, `CERTIFICATION`, etc. in production mappers.

Examples:

- `resume-share.service.ts`
- `dsl.repository.ts`
- `gdpr-export.service.ts`
- `resume-analytics.facade.ts`
- analytics projection handlers (`sync-projection-on-section-added/removed`)

**Architectural interpretation:** these references should move to a **central policy/catalog adapter** so application services never switch on section kind literals directly.

---

## 3.4 Files That Passed Under the Radar (Second Pass)

These were **not fully highlighted** in the previous version and are important.

### A) GraphQL boundary still screams legacy section entities

- `src/bounded-contexts/platform/graphql/resolvers/resume.resolver.ts`
  - explicit operations: `addExperience`, `updateExperience`, `deleteExperience`, `addEducation`
  - hardcoded section keys in resolver (`work_experience_v1`, `education_v1`)
  - large in-resolver mapping functions (`mapExperienceItem`, `mapEducationItem`, `mapSkillItem`)
- `src/bounded-contexts/platform/graphql/models/resume.model.ts`
  - fields like `experiences`, `educations`
- `src/bounded-contexts/platform/graphql/models/experience.model.ts`
- `src/bounded-contexts/platform/graphql/models/education.model.ts`
- `src/bounded-contexts/platform/graphql/inputs/experience.input.ts`
- `src/bounded-contexts/platform/graphql/inputs/education.input.ts`

**Uncle Bob read:** boundary is coupled to old nouns and carries mapping logic that belongs in a dedicated translator/use-case boundary.

### B) Shared Kernel contracts still codify legacy shape

- `src/shared-kernel/schemas/resume/resume.schema.ts`
  - accepts relation arrays (`experiences`, `educations`, `skills`, etc.)
- `src/shared-kernel/ast/section-data.schema.ts`
  - discriminated union anchored on old section literals (`experience`, `education`, `skills`, `certifications`, ...)
- `src/shared-kernel/validations/onboarding-data.schema.ts`
  - onboarding structure still defined in legacy buckets (`experiences`, `education`, `skills`, `languages`)
- `src/shared-kernel/constants/validation.constants.ts`
  - limits still expressed by old bucket names (`MAX_EXPERIENCES`, `MAX_EDUCATIONS`, ...)

**Uncle Bob read:** these are contract-level dependencies; if left unchanged, every outer layer keeps translating forever.

### C) Configuration/metadata coupling outside seed/tests

- `src/bounded-contexts/platform/common/constants/personas/*.persona.ts`
  - `prioritySections` arrays with legacy section IDs.
- `src/bounded-contexts/platform/common/config/swagger/api-description.ts`
- `src/bounded-contexts/platform/common/config/swagger.config.ts`
  - product narrative still tied to legacy section vocabulary.

These are not persistence breakpoints, but they do preserve conceptual drift.

---

## 3.8 Third-Pass Blind Spots (External Contract Layer)

These are highly relevant because they define client-facing contracts and can silently freeze legacy semantics.

### A) Generated GraphQL schema still publishes legacy operations/types

- `src/graphql/schema.graphql` (auto-generated)
  - Inputs: `CreateExperienceInput`, `CreateEducationInput`
  - Types: `ExperienceModel`, `EducationModel`
  - Mutations: `addExperience`, `updateExperience`, `deleteExperience`, `addEducation`
  - Resume fields: `educations`, `experiences`

Implication:

- Even if internals migrate, public GraphQL contract keeps consumers tied to legacy entities.
- This is a migration blocker if your architectural target includes contract-level genericization.

### B) SDK/OpenAPI DTO surface still codifies old section taxonomy

- `src/shared-kernel/dtos/resume-ast.dto.ts`
  - discriminated union types hardcoded as `experience`, `education`, `skills`, `projects`, etc.
- `src/shared-kernel/dtos/sdk-response.dto.ts`
  - multiple response DTOs/examples use old section names and structures
- `src/shared-kernel/dtos/enums.dto.ts`
  - `SECTION_TYPE_VALUES` with legacy literals

Implication:

- SDK generation and API docs preserve old language even where storage is already generic.
- Teams may unknowingly reintroduce old structure because the generated contracts still encourage it.

### C) Ambiguous-but-important boundary: onboarding and progress contracts

- `src/shared-kernel/validations/onboarding-data.schema.ts`
- `src/shared-kernel/dtos/onboarding-progress.dto.ts`

Observation:

- They are workflow-oriented and still modeled as bucket steps (`experience`, `education`, `skills`, `languages`).
- If rule is interpreted literally (only seed/tests can contain section names), these are violations.
- If rule allows product workflow vocabulary while forbidding data-shape coupling, these may remain temporarily.

Recommendation:

- Decide explicitly: are workflow step names considered exempt vocabulary or migration scope?
- Document this as a formal allowlist/denylist in architecture tests.

---

## 3.9 New Priority Matrix (updated)

P0 (must fix before large rollout)

- GraphQL generated schema + resolver/model/input legacy surface.
- SDK/OpenAPI section type DTOs preserving old taxonomy.
- Seed/runtime breakpoints (`analytics-projection.seed`, `PrismaService.cleanDatabase`).

P1 (high, next wave)

- Shared-kernel resume/onboarding schemas still encoding legacy data buckets.
- Repeated mapping logic in export/dsl/public/gdpr.

P2 (controlled refactor)

- Product metadata/constants/persona section labels.
- Narrative docs and descriptions not affecting runtime contracts.

---

## 3.5 Objective Code-Smell Metrics (Uncle Bob style)

Hotspot file sizes (single class/service doing too much):

- `src/bounded-contexts/export/export/services/resume-json.service.ts` → **375 lines**
- `src/bounded-contexts/export/export/services/resume-latex.service.ts` → **351 lines**
- `src/bounded-contexts/identity/auth/services/gdpr-export.service.ts` → **277 lines**
- `src/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade.ts` → **259 lines**
- `src/bounded-contexts/dsl/dsl/dsl.repository.ts` → **245 lines**
- `src/bounded-contexts/presentation/public-resumes/services/resume-share.service.ts` → **207 lines**
- `src/shared-kernel/ast/section-data.schema.ts` → **188 lines**

Interpretation against Uncle Bob standards:

- Multiple classes exceed “single reason to change” reality.
- Mapping + orchestration + formatting + validation frequently coexist in same unit.
- High probability of shotgun surgery when section contracts evolve.

---

## 3.6 Duplication Map (G5: Duplication is the primary smell)

Repeated legacy-to-generic translation logic appears in multiple places:

- `resume-share.service.ts` → `mapResumeSections`
- `gdpr-export.service.ts` → `mapResumeSections` + `semanticKindMap`
- `dsl.repository.ts` → `normalizeResumeWithSections`
- `resume-json.service.ts` → `normalizeResume` switch by `semanticKind`

Same symptom, different files, same bug risk.

**Uncle Bob rule:** abstract at the policy seam, not by framework convenience.

Recommended seam:

- `SectionProjectionPolicy` (domain-facing)
- adapters:
  - `AnalyticsSectionProjectionAdapter`
  - `ExportSectionProjectionAdapter`
  - `PublicViewSectionProjectionAdapter`
  - `GdprSectionProjectionAdapter`

One canonical mapping kernel, many presenters.

---

## 3.7 Testing Reality Check (T1: insufficient tests)

What exists (good):

- `resume-json.service.spec.ts`, `resume-latex.service.spec.ts`, `gdpr-export.service.spec.ts`, `dsl.repository.spec.ts`, `resume-share.service.spec.ts`, analytics service specs, GraphQL resolver test.

What is still missing for safe migration:

1. **Characterization tests for legacy contract compatibility**
   - guarantee current outputs before replacing internals.
2. **Cross-boundary contract tests**
   - generic section input → output shape for export/analytics/graphql/gdpr.
3. **Architecture tests for forbidden references**
   - fail CI if production code reintroduces bucket names outside allowed boundaries.
4. **Golden master fixtures**
   - one complex resume fixture to compare JSON/LaTeX/GraphQL/GDPR outputs across refactors.

QA should find nothing because the contract tests find it first.

---

## 4) Special Sections: Deep Analysis (Education, Skills, Certifications)

This is the most important part.

## 4.1 Education (MEC-backed)

Current state:

- Onboarding currently stores free text fields in `SectionItem.content` (`institution`, `degree`, `field`, dates).
- MEC context exists and is rich (`MecInstitution`, `MecCourse`, query services/controllers).

Gap:

- No canonical reference from section item to MEC entities.

Target (recommended):

- `education_v2` schema should support references:
  - `institutionId` (required for cataloged path)
  - `courseId` (optional/required based on UX flow)
  - denormalized read fields (`institutionName`, `courseName`) for resilience/history
  - optional `source: 'MEC' | 'CUSTOM'`
- Keep a controlled custom fallback for institutions/courses not in MEC, but explicit.

---

## 4.2 Skills (catalog-backed)

Current state:

- Skills onboarding stores `{ name, category }` free text.
- Strong catalog exists (`TechSkill`, `ProgrammingLanguage`, query/sync services).

Gap:

- Skills in resume are not normalized to catalog identity.

Target (recommended):

- `skill_set_v2` should store each skill item with:
  - `skillId` (catalog key) when known
  - optional denormalized `name`, `category`
  - `source: 'CATALOG' | 'CUSTOM'`
- This enables stable analytics/search/scoring and prevents drift in naming.

---

## 4.3 Certifications (needs controlled normalization)

Current state:

- `certification_v1` is pure free text (`name`, `issuer`, dates).
- No first-class certification catalog model currently used by resume sections.

Gap:

- No canonical ID/reference strategy for certifications.

Target options:

1. **Pragmatic fast path:** `certification_v2` keeps text but adds normalization metadata:
   - `issuerNormalized`, `credentialType`, `source`, optional `confidence`
2. **Robust path:** introduce certification catalog reference (`certificationCatalogId`) or leverage `TechSkill` entries of type `CERTIFICATION` with a clear adapter.

Recommendation:

- Start with fast path + adapter seam now, then evolve to catalog reference without changing application contracts.

---

## 5) Architecture Verdict (Uncle Bob lens)

Good news:

- Core data model direction is correct.

Bad news:

- Many outer layers still talk in old bucket dialect.

Professional diagnosis:

- This is a **boundary migration not yet completed**.
- Current system is in a hybrid state: generic persistence + legacy application contracts.

That hybrid can exist briefly, but not as a destination.

---

## 6) Migration Strategy (Sequenced, Safe, Disciplined)

## Phase -1 — Freeze + Baseline (new)

- Build a complete “forbidden legacy references” inventory snapshot.
- Add CI guard that prints diff of legacy references on every PR.
- Capture baseline artifacts (JSON export, LaTeX export, GDPR export, GraphQL query responses) from a canonical fixture resume.

## Phase 0 — Guardrails first (before more refactor)

- Add architecture tests that fail if legacy bucket keys appear outside:
  - `prisma/seeds/**`
  - `**/*.spec.ts`, `**/*.test.ts`
- Add explicit allowlist for transitional files with expiry date.

Add to the rule set:

- forbid new `switch (semanticKind)` outside central adapter package.
- forbid new legacy bucket fields in production DTO/schema types.

## Phase 1 — Stabilize infra breakpoints

- Fix `analytics-projection.seed.ts` to derive counts from generic sections.
- Fix `PrismaService.cleanDatabase()` to current model graph.
- Regenerate Prisma client and run full typecheck/tests.

## Phase 2 — Build a single Section Semantics Adapter

- Create one adapter service that translates generic items -> view-specific projections.
- Remove duplicated `switch (semanticKind)` blocks from multiple modules.

Also:

- move GraphQL mapper logic out of resolver into adapter/use-case layer.
- move AST section literal coupling to a single translation boundary.

## Phase 3 — Move consumers to adapter contracts

- Migrate in order of blast radius:
  1. `analytics` services
  2. `export` services
  3. `dsl` repository/compiler boundaries
  4. `public-resume` and `gdpr-export`
  5. `graphql` resolver/models/inputs
  6. `shared-kernel` legacy resume schemas

## Phase 4 — Special section v2 rollout

- Introduce `education_v2`, `skill_set_v2`, `certification_v2` definitions in section-type seeds.
- Add migration adapters from v1 -> v2 content shape.
- Wire MEC/catalog resolvers into onboarding/import/update paths.

## Phase 5 — Contract cleanup

- Remove legacy relation keys from shared schemas (`CreateResumeSchema`, repository DTOs).
- Remove transitional payload aliases (`experiences`, `education`, etc.) from production APIs unless explicitly versioned.

---

## 7) Definition of Done (Strict)

Migration is done only when all are true:

1. No production file (outside allowlist) references legacy bucket keys.
2. No production file switches directly on hardcoded section kinds; uses centralized adapter/policy.
3. `education`, `skills`, `certifications` support DB-backed identity strategy (with v2 definitions).
4. Seeds, typecheck, architecture tests, and contract tests are green.
5. Snapshot/export/analytics/DSL paths run fully on generic contracts.
6. GraphQL boundary no longer exposes legacy entity-first section APIs.
7. Shared-kernel resume contracts no longer encode legacy relation buckets.
8. Generated GraphQL schema no longer exposes legacy entity-first section mutations/types.
9. SDK/OpenAPI enum/DTO contracts use migration-approved section contract vocabulary.

---

## 8) Risk Register (New)

### Critical

- Prisma seed/runtime helper mismatch (`analytics-projection.seed`, `PrismaService.cleanDatabase`).
- Hidden contract drift in GraphQL + shared-kernel schemas.
- Client lock-in risk via generated artifacts (`src/graphql/schema.graphql`, SDK/OpenAPI DTOs).

### High

- Duplicate semantic mapping logic across 4+ modules.
- Oversized services with mixed responsibilities (mapping + orchestration + formatting).

### Medium

- Product/config vocabulary still legacy (personas, swagger descriptions).
- Potentially inconsistent date/field normalization between adapters.

---

## 9) Uncle Bob Tactical Playbook (New)

1. **First make it work**: lock behavior with characterization tests.
2. **Then make it right**: centralize mapping policy and remove duplication.
3. **Then make it fast**: reduce translation churn and repeated data shaping.

TDD cadence per module:

- Red: write failing contract test with canonical fixture.
- Green: migrate only one boundary at a time.
- Refactor: eliminate local mapping duplication, keep tests green.

Professional discipline rule:

- No new feature work in files that still violate migration architecture until they are brought to compliance or isolated behind adapter seams.

Additional enforcement rule:

- Any PR touching GraphQL schema generation, SDK DTOs, or shared-kernel section enums must include a migration-compatibility test proving no regression toward legacy bucket coupling.

---

## 10) Final Mentor Note

The code is already telling the truth: your domain wants generic sections.
Now the rest of the system must stop speaking two languages.

**One model. One direction. One source of truth.**

That is how you get speed without decay.
