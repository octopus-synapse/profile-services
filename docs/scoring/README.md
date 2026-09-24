# Scoring Subsystem

Source of truth for the scoring vocabulary, component names, and ownership across `profile-services`.

## Why this doc exists

Before this refactor the codebase had one fuzzy "ATS Score" concept mixing three unrelated things: is the visual style ATS-safe, is the resume filled in, does it match a specific job. Those questions are answered by different algorithms, need different inputs, and want different explanations.

This document defines a single, unambiguous taxonomy everyone can point at.

## Top-level scores

There are **four** top-level scores. Each belongs to a single subject (the thing being scored). They may have sub-scores that compose into the top-level number.

```
📊 Scores (4 top-level, S/A/B/C/D/F grading system)
├─ Style Score                           (atomic)           → ResumeStyle
├─ Resume Quality Score                                     → Resume
│   ├─ sub: Completeness Score           (deterministic)
│   └─ sub: Content Quality Score        (AI: LLM)
├─ Readiness Score                                          → Resume (master only)
│   ├─ factor: Quality      (latest Resume Quality Score)
│   ├─ factor: Coverage     (breadth of distinct skills)
│   └─ factor: Fit freshness(questionnaire lifecycle; separate from Match)
└─ Match Score                                              → (Resume, Job)
    ├─ sub: Keyword Match                (deterministic)
    ├─ sub: Requirements Match           (AI normalizes + code compares)
    ├─ sub: Semantic Match               (AI: embeddings)
    └─ sub: Fit Score                    (reserved, null and weight 0)
```

### Style Score

- **Subject:** `ResumeStyle`
- **Question answered:** "is this visual style ATS-safe?"
- **Computed:** by deterministic code when a `ResumeStyle` is created or updated, persisted on the style record
- **Monotonic invariant:** an update may never lower the score — users who adopted the style can only see improvements
- **Inputs:** the style's `styleConfig` (palette, fonts, spacing, margins) + `layoutKind` + `typstTemplate`
- **Not related to:** a user's filled-in content, a specific job

### Resume Quality Score

- **Subject:** `Resume`
- **Question answered:** "is this CV well-written and complete?"
- **No job context required.**
- Sub-scores:
  - **Completeness Score** (deterministic): do mandatory sections exist, are required fields filled, are dates valid and non-overlapping
  - **Content Quality Score** (AI): quality of bullet writing — XYZ/STAR structure, strong action verbs, quantified metrics, temporal consistency
- **Computed:** event-driven, on `ResumeUpdated` (BullMQ). Latest snapshot in a materialized view; history is append-only.

### Readiness Score

- **Subject:** the master (`primaryResumeId`) `Resume`
- **Question answered:** "how ready is my resume to compete in the market?" — the single **job-independent** number the Match Score can't provide (Match needs a `(resume, job)` pair).
- **No job context required.** Owned by `job-match/` and reuses its keyword adapter.
- **Deterministic blend (v1.2)** of signals already computed (no extra AI calls): `0.6875·Quality + 0.3125·Coverage`, renormalising an unavailable factor so a brand-new resume still yields a proper 0-100.
- **Computed:** event-driven on `ResumeQualityComputedEvent` for the master (so it always blends a fresh Quality number); also on-demand inside `GET /v1/me/scores`. History append-only in `ReadinessScoreHistory` (feeds the trend chart).
- **Served by:** `GET /v1/me/scores` (unified payload: Readiness + Quality + Style). The deprecated Fit fields remain inert until the next contract cleanup.
- **Follow-up:** market-relative coverage (skills vs the user's target-role in-demand skills) — see `SCORES_TODO.md`.

### Match Score

- **Subject:** a `(Resume, Job)` pair
- **Question answered:** "does this CV fit this specific job?"
- **Requires:** a resume and a job. The Fit questionnaire is optional.
- Sub-scores:
  - **Keyword Match** (code): exact + stemming + curated synonyms + fuzzy (Levenshtein ≤ 2)
  - **Requirements Match** (AI + code): AI normalizes ambiguous resume strings ("Proficient Portuguese" → C2); code compares against structured slots the recruiter filled
  - **Semantic Match** (AI): embeddings similarity between resume sections and job description
- **Weights (v1.2):** Keyword 31.25%, Requirements 37.5%, Semantic 31.25%. If a provider is unavailable, its weight is redistributed among available signals.
- **Computed:** on-demand, cached in Redis with hierarchical keys; composed of cached sub-computations so only what changed gets recomputed
- **Persisted:** only on deliberate user action (apply/save) as a snapshot on the `Application` row

## Grading (S/A/B/C/D/F)

Every score — top-level and sub — maps to the same rank scale. Consistent UX across the whole product.

| Rank | Color | Range | Meaning |
|---|---|---|---|
| **S** | 🟢 emerald | 90–100 | excellence |
| **A** | 🟢 green | 80–89 | very good |
| **B** | 🔵 blue | 70–79 | good |
| **C** | 🟡 yellow | 60–69 | needs attention |
| **D** | 🟠 orange | 50–59 | below expectations |
| **F** | 🔴 red | 0–49 | failing |

The canonical thresholds live in `src/shared-kernel/scoring/rank.ts` (`scoreToRank`)
and are mirrored by the frontend `score-scale.ts` (`scoreGrade`). Every score DTO
carries the computed `rank` so no client re-derives the ladder.

## Transparency per actor

Users see explanations for each active Match signal. A future recruiter view must use validated, job-relevant preferences rather than a hidden personality score.

| Score | User sees "why"? | Recruiter sees "why"? |
|---|---|---|
| Style | ✅ | ✅ |
| Resume Quality (+ sub-scores) | ✅ | ✅ |
| Match → Keyword / Requirements / Semantic | ✅ | ✅ |
| Match → Fit | inactive | inactive |

## Bounded-context ownership (single source of truth)

| Context | Owns | Source of truth |
|---|---|---|
| `resume-styles/` | CRUD of `ResumeStyle`, Style Score calculation, ATS-safety validation, preview rendering | `ResumeStyle` + version history |
| `resume-quality/` | Completeness + Content Quality scoring, issue detection, recommendations | `ResumeQualityScoreHistory` (append-only) |
| `job-match/` | Match Score orchestration and all its sub-scores, on-demand compute, caching, the every-3-days cron | Redis cache + `Application.matchScoreSnapshot` on apply |
| `fit-profile/` | Question pool, 25-question sampling, answer commits, vector computation, 3-month lockout lifecycle, similarity math | `UserFitProfile`, `JobFitProfile`, `FitQuestion`, `FitAnswer`, `FitQuestionSet`, `FitRemapHistory` |
| `ai/` | `LLMPort` + `EmbeddingsPort` + OpenAI adapter, prompt versioning, structured output validation, cost logging | — |

Dependency graph:
- `resume-quality` → `ai`
- `job-match` → `ai`, `fit-profile` (Readiness only)
- `resume-styles` stands alone

## Component vocabulary (names used in code and docs)

| Function | Technical name | Layer |
|---|---|---|
| Read resumes (PDF/DOCX/LinkedIn) | **Resume Parser** | code + LLM |
| Structure parsed data | **Schema Normalizer** | code |
| Check words | **Keyword Matcher** | code |
| Normalize ambiguous resume strings | **Resume Field Normalizer** | AI |
| Compute scores | **Scoring Engine** (family of services) | code + AI |
| Compare meaning CV↔JD | **Semantic Matcher** | AI (embeddings) |
| Judge writing quality | **Resume Content Analyzer** | AI (LLM) |
| Derive behavioral profile | **Fit Profile Builder** | code + AI |

## Feature gates (standard users only)

Admins and recruiters are exempt. Gates enforce invariants; never bypass silently.

| Gate | What blocks |
|---|---|
| Fit profile not answered / expired (>180 days) | Legacy internal application flows may still require Fit. Candidate Match and AI tailoring do not. |
| Resume Quality < 50 | Auto-Apply, apply to internal Patch jobs. PDF export is warning-only. |
| ResumeStyle below ATS-safe threshold | Blocked at creation (422). Only admins can create styles. |

## Related docs

- [`SCORES_TODO.md`](./SCORES_TODO.md) — post-MVP followups (Mahalanobis, ML-learned weights, IRT, etc.)
- [`AI_PROMPTS.md`](./AI_PROMPTS.md) — versioned prompts + Zod schemas
- [`MIGRATION.md`](./MIGRATION.md) — runbook for the big-bang refactor PR
