import type { SubScoreResult } from '../types';

/** Input the Requirements Matcher needs: structured slots from the
 * recruiter (source of truth) + the AI-enriched slots from the JD +
 * the raw resume content that the matcher will mine for evidence. */
export interface RequirementsMatchInput {
  readonly resumeId: string;
  readonly jobId: string;
  readonly structuredRequirements: Readonly<Record<string, unknown>>;
  readonly enrichedByAi?: Readonly<Record<string, unknown>>;
}

export interface RequirementsMatchResult extends SubScoreResult {
  readonly score: number | null;
  readonly detail?: Readonly<{ matchedSlots: readonly string[]; missingSlots: readonly string[] }>;
}

/**
 * Port for the Requirements Match sub-score. The implementation —
 * `AiRequirementsMatcherAdapter` — combines deterministic code
 * (years-of-experience ≥ slot, cefr(resume) ≥ cefr(slot)) with an AI
 * normaliser (`ScoringLlmPort.normalizeRequirements`) that maps fuzzy
 * resume strings ("fluent Portuguese") into structured slots
 * (`{ lang: pt-BR, cefr: C2 }`). On AI failure the score degrades to
 * `null` so the blender drops the sub-score and reallocates weight.
 */
export abstract class RequirementsMatcherPort {
  abstract match(input: RequirementsMatchInput): Promise<RequirementsMatchResult>;
}
