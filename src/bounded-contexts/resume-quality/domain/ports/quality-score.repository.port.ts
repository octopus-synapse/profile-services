import type { QualityBreakdown } from '../types';

export interface SavedQualityScore extends QualityBreakdown {
  readonly id: string;
  readonly resumeId: string;
  readonly computedAt: Date;
}

export abstract class QualityScoreRepositoryPort {
  abstract save(resumeId: string, breakdown: QualityBreakdown): Promise<SavedQualityScore>;
  abstract findLatest(resumeId: string): Promise<SavedQualityScore | null>;
  abstract findHistory(resumeId: string, limit: number): Promise<readonly SavedQualityScore[]>;
}
