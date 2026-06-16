import type { ResumeForAnalytics } from '../domain/types';
import type { AnalyticsDashboard, ScoreProgressionPoint, ViewStats } from '../interfaces';
import { SnapshotPort, ViewTrackingPort } from '../ports';

/**
 * Builds the analytics dashboard. The resume score surfaced as `atsScore`
 * is the latest persisted Resume Quality `overallScore` (the content-based
 * ATS score was retired); `keywordScore` mirrors the completeness score.
 */
export class DashboardService {
  constructor(
    private readonly viewTracking: ViewTrackingPort,
    private readonly snapshot: SnapshotPort,
  ) {}

  async build(resumeId: string, _resume: ResumeForAnalytics): Promise<AnalyticsDashboard> {
    const [viewStats, progression, latest] = await Promise.all([
      this.viewTracking.getViewStats(resumeId, { period: 'month' }),
      this.snapshot.getScoreProgression(resumeId, 30),
      this.snapshot.getLatest(resumeId),
    ]);
    const trend = this.calculateTrend(progression);

    return this.assembleDashboard(
      resumeId,
      viewStats,
      latest?.overallScore ?? 0,
      latest?.completenessScore ?? 0,
      trend,
    );
  }

  private assembleDashboard(
    resumeId: string,
    viewStats: ViewStats,
    overallScore: number,
    completenessScore: number,
    trend: 'improving' | 'stable' | 'declining',
  ): AnalyticsDashboard {
    return {
      resumeId,
      overview: {
        totalViews: viewStats.totalViews,
        uniqueVisitors: viewStats.uniqueVisitors,
        atsScore: overallScore,
        keywordScore: completenessScore,
        industryPercentile: 0,
      },
      viewTrend: viewStats.viewsByDay,
      topSources: viewStats.topSources,
      keywordHealth: { score: completenessScore, topKeywords: [], missingCritical: [] },
      industryPosition: { percentile: 0, trend },
      recommendations: [],
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
