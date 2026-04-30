import type { ResumeForCompleteness } from '../rules/completeness.rules';
import type { QualityIssue } from '../types';

export interface ContentQualityResult {
  /** 0–100. `null` when the adapter is disabled or the call failed. */
  readonly score: number | null;
  readonly issues: readonly QualityIssue[];
  /** Prompt semver + hash used for this result; persisted for cache
   * auditing and explainability in docs/scoring/AI_PROMPTS.md. */
  readonly promptVersion: string | null;
  readonly callsCount: number;
  readonly costUsdMicros: bigint;
}

/** Port for the Content Quality analyzer. The real implementation —
 * `AiContentQualityAdapter` — calls `ScoringLlmPort.analyzeContentQuality`
 * and degrades to `score: null` when the kill-switch flag is OFF or the
 * upstream call fails, so the use-case can still serve Completeness alone. */
export abstract class ContentQualityPort {
  abstract analyze(resume: ResumeForCompleteness): Promise<ContentQualityResult>;
}
