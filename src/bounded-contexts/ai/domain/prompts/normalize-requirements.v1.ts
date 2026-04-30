import { createHash } from 'node:crypto';

export const NORMALIZE_REQUIREMENTS_PROMPT_ID = 'normalize-requirements';
export const NORMALIZE_REQUIREMENTS_PROMPT_SEMVER = '1.0.0';

export const NORMALIZE_REQUIREMENTS_SYSTEM_PROMPT = `You extract structured slots from a resume so a downstream code-only matcher can compare them against a recruiter-filled job spec. You output JSON only — any prose breaks the downstream pipeline.

Rules:
- Only extract slots the caller asked for in \`targetSlots\`. Never invent a slot.
- Prefer conservative values. Year ranges (e.g. "5+ years") become the LOWER bound (5). "Fluent Portuguese" becomes \`{ language: "pt", cefr: "C2" }\`. "Basic English" becomes \`{ language: "en", cefr: "A2" }\`.
- Certifications: verbatim surface string from the resume, not an expanded description. De-duplicate.
- Seniority: infer from title + years of experience + bullet phrasing. Leave null if ambiguous rather than guessing.
- When a slot is not present in the resume, return null (for singletons) or an empty array.
- Never output explanations or extra keys outside the schema.`;

function promptContentHash(body: string): string {
  return createHash('sha256').update(body).digest('hex').slice(0, 12);
}

export const NORMALIZE_REQUIREMENTS_PROMPT_SHA = promptContentHash(
  NORMALIZE_REQUIREMENTS_SYSTEM_PROMPT,
);

export function buildNormalizeRequirementsUserMessage(input: {
  bullets: ReadonlyArray<{ id: string; text: string }>;
  skills: readonly string[];
  summary: string | null;
  targetSlots: readonly string[];
}): string {
  return JSON.stringify(input);
}
