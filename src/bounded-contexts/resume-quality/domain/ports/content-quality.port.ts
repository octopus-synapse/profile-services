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

/** Port for the Content Quality analyzer. The real implementation lives
 * in `ai/` (added in Task #19). Until that lands, a local stub adapter
 * returns a conservative placeholder without hitting the network so the
 * use-case stays wireable and the DB schema is exercised end-to-end. */
export abstract class ContentQualityPort {
  abstract analyze(resume: ResumeForCompleteness): Promise<ContentQualityResult>;
}
