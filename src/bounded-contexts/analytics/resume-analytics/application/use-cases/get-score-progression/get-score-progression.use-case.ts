/**
 * Get Score Progression Use Case
 *
 * Retrieves ATS score progression over time for a resume.
 */

import type { ScoreProgression, ScoreProgressionPoint } from '../../../interfaces';
import type {
  ResumeOwnershipPort,
  SnapshotRepositoryPort,
} from '../../ports/resume-analytics.port';

export class GetScoreProgressionUseCase {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly snapshotRepo: SnapshotRepositoryPort,
  ) {}

  async execute(resumeId: string, userId: string, days?: number): Promise<ScoreProgression> {
    await this.ownership.verifyOwnership(resumeId, userId);
    const points = await this.snapshotRepo.getScoreProgression(resumeId, days);
    return {
      snapshots: points.map((p) => ({
        date: new Date(p.date),
        score: p.score,
      })),
      trend: this.calculateTrend(points),
      changePercent: this.calculateChangePercent(points),
    };
  }

  private calculateTrend(points: ScoreProgressionPoint[]): 'improving' | 'stable' | 'declining' {
    if (points.length < 2) return 'stable';
    const diff = points[points.length - 1].score - points[0].score;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  private calculateChangePercent(points: ScoreProgressionPoint[]): number {
    if (points.length < 2) return 0;
    const first = points[0].score;
    if (first === 0) return 0;
    return Math.round(((points[points.length - 1].score - first) / first) * 100);
  }
}
