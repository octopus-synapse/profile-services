import { DomainEvent } from '@/shared-kernel';
import type { SubScoreKey } from '../types';

export interface MatchComputedPayload {
  readonly userId: string;
  readonly resumeId: string;
  readonly jobId: string;
  readonly overallScore: number;
  /** Sub-score scores in the same order as `MATCH_WEIGHTS`. null slots
   * mean "provider declined" — subscribers displaying per-axis
   * breakdowns should render them as "not available" instead of zero. */
  readonly subScores: Readonly<Record<SubScoreKey, number | null>>;
  readonly effectiveWeights: Readonly<Record<SubScoreKey, number>>;
  readonly rulesVersion: string;
  readonly fromCache: boolean;
}

/**
 * Fired once per successful `ComputeMatchUseCase.execute()` whether
 * the breakdown came from Redis or a fresh compute (the `fromCache`
 * boolean distinguishes). `aggregateId` is the jobId so job-centric
 * dashboards aggregate by vacancy without reaching into the payload.
 *
 * Consumers today:
 * - `analytics` (Task #22) → per-sub-score metric emission.
 * - `notifications` (future) → "your match with job X jumped from B
 *   to A" nudge when the rank crosses a boundary.
 */
export class MatchComputedEvent extends DomainEvent<MatchComputedPayload> {
  static readonly TYPE = 'scoring.match.computed';
  constructor(jobId: string, payload: MatchComputedPayload) {
    super(MatchComputedEvent.TYPE, jobId, payload);
  }
}
