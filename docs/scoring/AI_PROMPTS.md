# AI Prompts — Scoring Subsystem

All prompts used by the scoring subsystem live here, versioned with semver plus a content hash. The hash goes into the cache key so a prompt edit invalidates its entire cache automatically.

## Conventions

- **Versioning:** semver in the file header. Bump `MAJOR` when the schema changes, `MINOR` for prompt wording that changes score meaning, `PATCH` for tweaks that shouldn't move scores.
- **Content hash:** `sha256` of the prompt file body (excluding the header). Computed at startup and exposed via `LLMPort.getPromptVersion(promptId)`.
- **Cache key shape:** `rs:ai:{promptId}:{semver}:{sha256-short}:{inputHash}`.
- **Structured output:** all prompts use OpenAI Strict Mode (`response_format: { type: "json_schema", strict: true }`) with a Zod schema published alongside the prompt.
- **Retry policy:** 1 retry on schema-validation failure, exponential backoff up to 8s. After that, degrade to code-only score and emit `AiUnavailableError` metric.

## Registered prompts

### `content-quality.v1.md`

- **Semver:** 1.0.0
- **Purpose:** judge writing quality of a resume — XYZ/STAR structure, strong action verbs, quantified metrics, temporal consistency.
- **Input shape:** `{ resume: NormalizedResume }` where `NormalizedResume` includes experience bullets, education, skills.
- **Output schema (Zod):**
  ```ts
  z.object({
    score: z.number().int().min(0).max(100),
    issues: z.array(z.object({
      code: z.enum([
        "VAGUE_BULLET",
        "NO_METRIC",
        "WEAK_VERB",
        "TEMPORAL_OVERLAP",
        "DUPLICATE_SKILL",
        "OTHER",
      ]),
      severity: z.enum(["low", "medium", "high"]),
      messageKey: z.string().optional(),
      messageArgs: z.record(z.unknown()).optional(),
      freeformMessage: z.string().optional(),
      context: z.object({
        sectionKey: z.string().optional(),
        itemIndex: z.number().int().optional(),
        excerpt: z.string().max(200).optional(),
      }).optional(),
    })),
  })
  ```
- **Cached for:** 30 days per `(resumeContentHash, promptVersion)` pair; invalidated implicitly by hash change.

### `requirements-normalize.v1.md`

- **Semver:** 1.0.0
- **Purpose:** normalize ambiguous resume statements into structured slots for Requirements Match comparison. Example: `"Proficient Portuguese"` → `{ language: "pt", cefr: "C2" }`; `"8 years of experience"` → `{ yearsOfExperience: 8 }`.
- **Input shape:** `{ resume: NormalizedResume, extractionTargets: string[] }` (e.g., `["languages", "yearsOfExperience", "certifications"]`).
- **Output schema (Zod):** discriminated union by `extractionTarget` (see `ai/schemas/requirements-normalize.ts`).
- **Cached for:** per `(resumeContentHash, promptVersion)`; resume-level, job-agnostic.

### `job-requirements-enrich.v1.md`

- **Semver:** 1.0.0
- **Purpose:** enrich a raw job description with structured slots inferred by the AI, augmenting what the recruiter typed manually. Stored on `Job.requirementsEnrichedByAi`.
- **Input shape:** `{ jobDescription: string, recruiterFilledRequirements: Partial<StructuredRequirements> }`.
- **Output schema (Zod):** same shape as `StructuredRequirements` but every field optional; the recruiter's slots win on conflict.
- **Cached for:** per `(jobDescriptionHash, promptVersion)`.

### `fit-question-validate.v1.md` *(admin-only)*

- **Semver:** 1.0.0
- **Purpose:** when an admin creates/edits a FitQuestion, ask the AI whether the question cleanly maps to the declared dimension (Big Five / Schwartz / SDT). Returns a confidence + suggested dimension if mismatched.
- **Input shape:** `{ questionText: string, declaredDimension: FitDimension }`.
- **Output schema (Zod):** `{ confidence: number, suggestedDimension: FitDimension | null, rationale: string }`.
- **Not cached** — admin-only, low volume, expected to be re-run on every edit.

## Prompt file layout

Each prompt file lives at `src/bounded-contexts/ai/prompts/{id}.v{semver}.md` with this frontmatter:

```yaml
---
id: content-quality
semver: 1.0.0
schema: zod-schemas/content-quality.ts
model: gpt-4.1-mini
temperature: 0
---
```

Body is plain Markdown for LLM consumption. No Handlebars/Liquid — we interpolate inputs in TypeScript before sending.

## Cost tracking

Every AI call emits a structured log:

```
{
  userId: string,
  promptId: string,
  promptVersion: string,
  modelName: string,
  inputTokens: number,
  outputTokens: number,
  costUsdMicros: number,
  cacheHit: boolean,
  latencyMs: number,
}
```

These are aggregated into `score_ai_cost_usd_micros_total{promptId,cacheHit}` counter for Grafana.

## Rotating keys / providers

`LLMPort` is the only surface other contexts depend on. The OpenAI adapter is the only implementation today. Swapping to Anthropic/DeepSeek later requires just a new adapter behind the same port; prompts stay unchanged because they're provider-agnostic JSON-schema-driven calls.
