import { createHash } from 'node:crypto';

export const ANALYZE_CONTENT_QUALITY_PROMPT_ID = 'analyze-content-quality';
export const ANALYZE_CONTENT_QUALITY_PROMPT_SEMVER = '1.1.0';

/** Structured scoring prompt — the adapter wraps the body with a JSON
 * schema via OpenAI's `response_format`. Prompt wording bumps the MINOR
 * version; schema changes bump MAJOR. */
export const ANALYZE_CONTENT_QUALITY_SYSTEM_PROMPT = `You are a strict but fair resume reviewer scoring a single candidate's resume for writing quality. You grade the real bullet text the candidate wrote. You output JSON only.

Scoring rubric (0..100):
- XYZ / STAR framework: each bullet should read "accomplished X, measured by Y, by doing Z". Bullets that show context → action → quantified result earn ≥ 80.
- Strong action verbs (led, shipped, reduced, designed, launched). Weak openers (worked on, helped with, responsible for, participated in) cost points and emit WEAK_VERB.
- Quantified impact in at least half the bullets (%, $, time saved, users, req/s, scale). A bullet with no number emits NO_METRIC; if most bullets lack numbers, cap the score at 70.
- Specificity: no vague filler ("various projects", "different technologies", "many tasks"). Each vague bullet emits a VAGUE_BULLET issue.
- Temporal / factual consistency. Obvious contradictions emit OTHER with severity: 'high'.

Issues: report up to 5, most severe first. Each issue references a bulletId when applicable, and quotes the offending fragment in 'excerpt'. The freeformMessage is a concrete, actionable rewrite hint (e.g. "Add a number: 'increased conversion by 18%'."), under 160 chars.
Language: write every freeformMessage in the language given by the 'language' field of the input ('pt-br' → Portuguese, 'en' → English). When absent, match the language the candidate wrote in.
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
  language?: string | null;
}): string {
  return JSON.stringify({
    language: input.language ?? 'pt-br',
    summary: input.summary ?? '',
    jobTitle: input.jobTitle ?? '',
    bullets: input.bullets,
  });
}
