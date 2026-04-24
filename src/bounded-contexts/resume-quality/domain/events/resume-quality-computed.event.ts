import { DomainEvent } from '@/shared-kernel';
import type { QualityIssue } from '../types';

export interface ResumeQualityComputedPayload {
  readonly resumeId: string;
  readonly snapshotId: string;
  readonly overallScore: number;
  readonly completenessScore: number;
  readonly contentQualityScore: number | null;
  readonly scoringRulesVersion: string;
  readonly aiPromptVersion: string | null;
  readonly issuesCount: number;
  readonly highSeverityCount: number;
}

/**
 * Fired once per successful `ComputeQualityUseCase.execute()`. The
 * analytics context subscribes to this to store counters and update
 * dashboards; notifications subscribes to it to fire
 * "your score improved" emails on rank boundary crossings.
 *
 * `aggregateId` is the resumeId so subscribers can correlate with
 * their own per-resume state.
 *
 * A discriminated `ScoreComputedEvent` union across Resume Quality,
 * Match, and Style might be tempting, but per-score-type events keep
 * the payload shape honest — Match Score has sub-scores that don't
 * exist on Quality, and a flattened union hides that divergence.
 */
export class ResumeQualityComputedEvent extends DomainEvent<ResumeQualityComputedPayload> {
  static readonly TYPE = 'scoring.resume-quality.computed';
  constructor(resumeId: string, payload: ResumeQualityComputedPayload) {
    super(ResumeQualityComputedEvent.TYPE, resumeId, payload);
  }
}

/** Helper to derive the issue-severity counts a subscriber cares
 * about without re-implementing the shape elsewhere. */
export function summariseIssues(
  issues: readonly QualityIssue[],
): Pick<ResumeQualityComputedPayload, 'issuesCount' | 'highSeverityCount'> {
  return {
    issuesCount: issues.length,
    highSeverityCount: issues.filter((i) => i.severity === 'high').length,
  };
}
