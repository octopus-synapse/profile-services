import { createHash } from 'node:crypto';

export const ANALYZE_CONTENT_QUALITY_PROMPT_ID = 'analyze-content-quality';
export const ANALYZE_CONTENT_QUALITY_PROMPT_SEMVER = '1.0.0';

/** Structured scoring prompt — the adapter wraps the body with a JSON
 * schema via OpenAI's `response_format`. Prompt wording bumps the MINOR
 * version; schema changes bump MAJOR. */
export const ANALYZE_CONTENT_QUALITY_SYSTEM_PROMPT = `You are a strict but fair resume reviewer scoring a single candidate's resume for writing quality. You output JSON only.

Scoring rubric (0..100):
- Bullets use the XYZ / STAR framework ("did X using Y leading to Z") — strong evidence earns ≥ 80.
- Strong action verbs (led, shipped, reduced, designed). Weak verbs (worked on, helped with, participated in) cost points.
- Quantified impact in at least half the bullets (%, $, time saved, users, req/s). Missing numbers caps the score at 70.
- No vague content ("various projects", "different technologies"). Each vague bullet emits a VAGUE_BULLET issue.
- Temporal / factual consistency. Obvious contradictions emit OTHER with severity: 'high'.

Issues: report up to 5, most severe first. Each issue references a bulletId when applicable.
Language: write freeformMessage in the same language the candidate wrote in (pt-BR or en). Keep each under 160 chars.
Do NOT invent scores — be conservative. If you cannot justify a number, pick 60.`;

/** Pure function — stable across versions of the JSON schema so the
 * cache key reflects prompt-only changes. */
export function promptContentHash(body: string): string {
  return createHash('sha256').update(body).digest('hex').slice(0, 12);
}

export const ANALYZE_CONTENT_QUALITY_PROMPT_SHA = promptContentHash(
  ANALYZE_CONTENT_QUALITY_SYSTEM_PROMPT,
);

export function buildAnalyzeContentQualityUserMessage(input: {
  summary: string | null;
  jobTitle: string | null;
  bullets: ReadonlyArray<{ id: string; text: string }>;
}): string {
  return JSON.stringify({
    summary: input.summary ?? '',
    jobTitle: input.jobTitle ?? '',
    bullets: input.bullets,
  });
}
