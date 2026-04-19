/**
 * Build Analytics Dashboard Use Case
 *
 * Aggregates view stats, ATS score, and progression into a dashboard.
 */

import type {
  AnalyticsDashboard,
  ATSScoreResult,
  ScoreProgressionPoint,
  ViewStats,
} from '../../../interfaces';
import type { AtsScoringPort, ViewStatsProviderPort } from '../../ports/facade.ports';
import type {
  ResumeOwnershipPort,
  SnapshotRepositoryPort,
} from '../../ports/resume-analytics.port';

export class BuildAnalyticsDashboardUseCase {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly viewStats: ViewStatsProviderPort,
    private readonly atsScore: AtsScoringPort,
    private readonly snapshotRepo: SnapshotRepositoryPort,
  ) {}

  async execute(resumeId: string, userId: string): Promise<AnalyticsDashboard> {
    await this.ownership.verifyOwnership(resumeId, userId);
    const resume = await this.ownership.getResumeWithDetails(resumeId);

    const [viewStats, progression] = await Promise.all([
      this.viewStats.getViewStats(resumeId, { period: 'month' }),
      this.snapshotRepo.getScoreProgression(resumeId, 30),
    ]);
    const atsResult = await this.atsScore.calculate(resume);
    const trend = this.calculateTrend(progression);

    return this.assembleDashboard(resumeId, viewStats, atsResult, trend);
  }

  /**
   * Build dashboard from pre-loaded data (used by DashboardService port adapters).
   */
  async build(
    resumeId: string,
    viewStats: ViewStats,
    progression: ScoreProgressionPoint[],
    atsResult: ATSScoreResult,
  ): Promise<AnalyticsDashboard> {
    const trend = this.calculateTrend(progression);
    return this.assembleDashboard(resumeId, viewStats, atsResult, trend);
  }

  private assembleDashboard(
    resumeId: string,
    viewStats: ViewStats,
    atsResult: ATSScoreResult,
    trend: 'improving' | 'stable' | 'declining',
  ): AnalyticsDashboard {
    const avgSectionScore =
      atsResult.sectionBreakdown.length > 0
        ? Math.round(
            atsResult.sectionBreakdown.reduce((s, b) => s + b.score, 0) /
              atsResult.sectionBreakdown.length,
          )
        : 0;

    return {
      resumeId,
      overview: {
        totalViews: viewStats.totalViews,
        uniqueVisitors: viewStats.uniqueVisitors,
        atsScore: atsResult.score,
        keywordScore: avgSectionScore,
        industryPercentile: 0,
      },
      viewTrend: viewStats.viewsByDay,
      topSources: viewStats.topSources,
      keywordHealth: {
        score: avgSectionScore,
        topKeywords: [],
        missingCritical: [],
      },
      industryPosition: { percentile: 0, trend },
      recommendations: atsResult.recommendations.map((msg) => ({
        type: 'improve_content' as const,
        priority: 'medium' as const,
        message: msg,
      })),
    };
  }

  private calculateTrend(points: ScoreProgressionPoint[]): 'improving' | 'stable' | 'declining' {
    if (points.length < 2) return 'stable';
    const first = points[0].score;
    const last = points[points.length - 1].score;
    const diff = last - first;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }
}
