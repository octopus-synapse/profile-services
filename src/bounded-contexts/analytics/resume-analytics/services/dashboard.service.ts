import { Inject, Injectable } from '@nestjs/common';
import { AtsScoringPort } from '../application/ports/facade.ports';
import type { ResumeForAnalytics } from '../domain/types';
import type {
  AnalyticsDashboard,
  ATSScoreResult,
  ScoreProgressionPoint,
  ViewStats,
} from '../interfaces';
import {
  SNAPSHOT_PORT,
  type SnapshotPort,
  VIEW_TRACKING_PORT,
  type ViewTrackingPort,
} from '../ports';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(VIEW_TRACKING_PORT)
    private readonly viewTracking: ViewTrackingPort,
    private readonly atsScore: AtsScoringPort,
    @Inject(SNAPSHOT_PORT)
    private readonly snapshot: SnapshotPort,
  ) {}

  async build(resumeId: string, resume: ResumeForAnalytics): Promise<AnalyticsDashboard> {
    const [viewStats, progression] = await Promise.all([
      this.viewTracking.getViewStats(resumeId, { period: 'month' }),
      this.snapshot.getScoreProgression(resumeId, 30),
    ]);
    const atsResult = await this.atsScore.calculate(resume);
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
