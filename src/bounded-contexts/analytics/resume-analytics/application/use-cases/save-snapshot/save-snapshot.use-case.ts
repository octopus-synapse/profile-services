/**
 * Save Snapshot Use Case
 *
 * Saves an analytics snapshot for progress tracking.
 */

import type { AnalyticsSnapshot } from '../../../interfaces';
import type {
  ResumeOwnershipPort,
  SnapshotRepositoryPort,
} from '../../ports/resume-analytics.port';
import type { CalculateAtsScoreUseCase } from '../calculate-ats-score/calculate-ats-score.use-case';

export class SaveSnapshotUseCase {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly snapshotRepo: SnapshotRepositoryPort,
    private readonly atsScore: CalculateAtsScoreUseCase,
  ) {}

  async execute(resumeId: string, userId: string): Promise<AnalyticsSnapshot> {
    await this.ownership.verifyOwnership(resumeId, userId);
    const resume = await this.ownership.getResumeWithDetails(resumeId);
    const atsResult = await this.atsScore.calculate(resume);
    const avgSectionScore =
      atsResult.sectionBreakdown.length > 0
        ? Math.round(
            atsResult.sectionBreakdown.reduce((s, b) => s + b.score, 0) /
              atsResult.sectionBreakdown.length,
          )
        : 0;
    return this.snapshotRepo.save({
      resumeId,
      atsScore: atsResult.score,
      keywordScore: avgSectionScore,
      completenessScore: avgSectionScore,
    });
  }
}
