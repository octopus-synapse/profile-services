import type { ReadinessBreakdown } from '../readiness/readiness.types';

/** A persisted Readiness snapshot (one append-only history row). */
export interface SavedReadinessScore {
  readonly id: string;
  readonly resumeId: string;
  readonly overallScore: number;
  readonly qualityScore: number | null;
  readonly coverageScore: number | null;
  readonly fitScore: number | null;
  readonly rulesVersion: string;
  readonly computedAt: Date;
}

/** A point on the Readiness trend line (for the momentum chart). */
export interface ReadinessTrendPoint {
  readonly score: number;
  readonly computedAt: Date;
}

/**
 * Append-only persistence for Readiness Score computations, mirroring
 * `ResumeQualityScoreHistory`. Reads serve the latest row + a short
 * trend window for the Desempenho hub.
 */
export abstract class ReadinessHistoryPort {
  /** Persist a fresh computation as a new history row. */
  abstract save(input: {
    readonly resumeId: string;
    readonly breakdown: ReadinessBreakdown;
  }): Promise<SavedReadinessScore>;

  /** Latest snapshot, or `null` when none computed yet. */
  abstract findLatest(resumeId: string): Promise<SavedReadinessScore | null>;

  /** Most recent `limit` points, newest first, for the trend chart. */
  abstract findTrend(resumeId: string, limit: number): Promise<readonly ReadinessTrendPoint[]>;
}
