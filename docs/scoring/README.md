# Scoring Subsystem

Source of truth for the scoring vocabulary, component names, and ownership across `profile-services`.

## Why this doc exists

Before this refactor the codebase had one fuzzy "ATS Score" concept mixing three unrelated things: is the visual style ATS-safe, is the resume filled in, does it match a specific job. Those questions are answered by different algorithms, need different inputs, and want different explanations.

This document defines a single, unambiguous taxonomy everyone can point at.

## Top-level scores

There are **three** top-level scores. Each belongs to a single subject (the thing being scored). They may have sub-scores that compose into the top-level number.

```
📊 Scores (3 top-level, S/A/B/C/D/F grading system)
├─ Style Score                           (atomic)           → ResumeStyle
├─ Resume Quality Score                                     → Resume
│   ├─ sub: Completeness Score           (deterministic)
│   └─ sub: Content Quality Score        (AI: LLM)
└─ Match Score                                              → (Resume, Job)
    ├─ sub: Keyword Match                (deterministic)
    ├─ sub: Requirements Match           (AI normalizes + code compares)
    ├─ sub: Semantic Match               (AI: embeddings)
    └─ sub: Fit Score                    (delegates to fit-profile/)
        ├─ Culture Match = similarity(User, Company) × α
        └─ Role Match    = similarity(User, Job)    × β
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

### Match Score

- **Subject:** a `(Resume, Job)` pair
- **Question answered:** "does this CV fit this specific job?"
- **Requires:** a valid `UserFitProfile` (not expired). Without it, Match Score returns 403.
- Sub-scores:
  - **Keyword Match** (code): exact + stemming + curated synonyms + fuzzy (Levenshtein ≤ 2)
  - **Requirements Match** (AI + code): AI normalizes ambiguous resume strings ("Proficient Portuguese" → C2); code compares against structured slots the recruiter filled
  - **Semantic Match** (AI): embeddings similarity between resume sections and job description
  - **Fit Score:** composed of `Culture Match × α + Role Match × β`, delegated to `fit-profile/`
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
| **D** | 🟠 orange | 40–59 | below expectations |
| **F** | 🔴 red | 0–39 | failing |

## Transparency per actor

Users see most explanations; the Fit Score reason is hidden from the user on purpose to prevent gaming of the 3-month questionnaire. Recruiters always see everything.

| Score | User sees "why"? | Recruiter sees "why"? |
|---|---|---|
| Style | ✅ | ✅ |
| Resume Quality (+ sub-scores) | ✅ | ✅ |
| Match → Keyword / Requirements / Semantic | ✅ | ✅ |
| Match → Fit | ❌ | ✅ |

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
- `job-match` → `ai`, `fit-profile`
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
| Fit profile not answered / expired (>90 days) | Auto-Apply, AI Tailor (resume rewrite), apply to internal Patch jobs, view Match Score (+ all sub-scores including Keyword/Requirements/Semantic) |
| Resume Quality < 50 | Auto-Apply, apply to internal Patch jobs. PDF export is warning-only. |
| ResumeStyle below ATS-safe threshold | Blocked at creation (422). Only admins can create styles. |

## Related docs

- [`SCORES_TODO.md`](./SCORES_TODO.md) — post-MVP followups (Mahalanobis, ML-learned weights, IRT, etc.)
- [`AI_PROMPTS.md`](./AI_PROMPTS.md) — versioned prompts + Zod schemas
- [`MIGRATION.md`](./MIGRATION.md) — runbook for the big-bang refactor PR
