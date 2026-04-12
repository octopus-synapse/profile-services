/**
 * ATS Scoring Port
 *
 * Abstraction for ATS score calculation.
 * Implemented by ats-validation bounded context.
 */

export abstract class AtsScorngPort {
  abstract score(styleConfig: Record<string, unknown>): Record<string, unknown>;
  abstract calculateOverallScore(breakdown: Record<string, unknown>): number;
}
