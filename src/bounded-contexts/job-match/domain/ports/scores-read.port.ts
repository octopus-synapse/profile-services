import type { FitStatus } from './user-fit-state.port';

export interface LatestQualityRead {
  readonly overallScore: number;
  readonly completenessScore: number;
  readonly contentQualityScore: number | null;
  readonly computedAt: Date;
}

export interface ScoreTrendRead {
  readonly score: number;
  readonly computedAt: Date;
}

export interface FitLifecycleRead {
  readonly status: FitStatus;
  readonly expiresAt: Date | null;
}

/**
 * Aggregated read surface for the unified `/v1/me/scores` endpoint. One
 * port so the scores use-case composes the master's job-independent
 * scores from a single collaborator instead of reaching into four BCs'
 * repositories. All reads are projections — no cross-BC use-case calls.
 */
export abstract class ScoresReadPort {
  /** The user's primary (master) resume id, or `null` if none set. */
  abstract getPrimaryResumeId(userId: string): Promise<string | null>;

  /** Latest Resume Quality Score snapshot for a resume, or `null`. */
  abstract getLatestQuality(resumeId: string): Promise<LatestQualityRead | null>;

  /** Most recent `limit` quality points, newest first (trend chart). */
  abstract getQualityTrend(resumeId: string, limit: number): Promise<readonly ScoreTrendRead[]>;

  /** Style Score of the resume's active template, or `null`. */
  abstract getStyleScoreForResume(resumeId: string): Promise<number | null>;

  /** Fit-questionnaire lifecycle (status + expiry) for a user. */
  abstract getFitLifecycle(userId: string): Promise<FitLifecycleRead>;
}
