/**
 * Scoring-specific LLM operations — separate from `LlmPort` (which
 * handles resume/job text transformations) so the scoring subsystem
 * evolves without churning the tailor/extract contracts. Both ports
 * are satisfied by the same OpenAI adapter today; provider-level
 * replacement still swaps them together.
 */

export const SCORING_LLM_PORT = Symbol('SCORING_LLM_PORT');

// ── Content Quality ──────────────────────────────────────────────
export interface ContentQualityInput {
  /** Narrow projection of the resume the prompt cares about — keeping
   * the adapter input minimal bounds both prompt size and the surface
   * the Zod validator has to guard. */
  readonly summary: string | null;
  readonly jobTitle: string | null;
  readonly bullets: ReadonlyArray<{
    readonly id: string;
    readonly text: string;
  }>;
}

export interface ContentQualityIssue {
  readonly code: 'VAGUE_BULLET' | 'NO_METRIC' | 'WEAK_VERB' | 'OTHER';
  readonly severity: 'low' | 'medium' | 'high';
  readonly freeformMessage: string;
  readonly context?: Readonly<{ bulletId?: string; excerpt?: string }>;
}

export interface ContentQualityResult {
  readonly score: number; // 0..100
  readonly issues: readonly ContentQualityIssue[];
  readonly tokensUsed: number;
}

// ── Requirements Normaliser ──────────────────────────────────────
export interface NormalizeRequirementsInput {
  /** The same bullets the Content Quality analyzer sees — plus the
   * skills list where the AI can mine for language proficiency + YOE. */
  readonly bullets: ReadonlyArray<{ id: string; text: string }>;
  readonly skills: readonly string[];
  readonly summary: string | null;
  /** Target slots the recruiter filled; the normaliser picks these up
   * (and only these) from the resume. Avoids hallucinated slots. */
  readonly targetSlots: ReadonlyArray<'minYears' | 'languages' | 'certifications' | 'seniority'>;
}

export interface NormalizedLanguage {
  readonly language: string; // ISO where possible, free text otherwise
  readonly cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
}

export interface NormalizedRequirementsResult {
  readonly minYears: number | null;
  readonly languages: readonly NormalizedLanguage[];
  readonly certifications: readonly string[];
  readonly seniority: 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | null;
  readonly tokensUsed: number;
}

export abstract class ScoringLlmPort {
  abstract analyzeContentQuality(input: ContentQualityInput): Promise<ContentQualityResult>;
  abstract normalizeRequirements(
    input: NormalizeRequirementsInput,
  ): Promise<NormalizedRequirementsResult>;
}
