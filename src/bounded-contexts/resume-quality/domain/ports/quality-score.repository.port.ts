import type { QualityBreakdown } from '../types';

export interface SavedQualityScore extends QualityBreakdown {
  readonly id: string;
  readonly resumeId: string;
  readonly computedAt: Date;
}

export abstract class QualityScoreRepositoryPort {
  abstract save(resumeId: string, breakdown: QualityBreakdown): Promise<SavedQualityScore>;
  abstract findLatest(resumeId: string): Promise<SavedQualityScore | null>;
  /**
   * P1 #32 — ownership-scoped variant. Returns the latest snapshot only
   * when `userId` owns the resume; returns `null` for both
   * "no snapshot" and "not the owner". Callers that gate user-facing
   * actions (publish, export) MUST use this method so a foreign
   * resumeId leaks neither a 200 nor a typed "below threshold" error.
   */
  abstract findLatestForOwner(
    userId: string,
    resumeId: string,
  ): Promise<{ found: boolean; owned: boolean; snapshot: SavedQualityScore | null }>;
  abstract findHistory(resumeId: string, limit: number): Promise<readonly SavedQualityScore[]>;
}
