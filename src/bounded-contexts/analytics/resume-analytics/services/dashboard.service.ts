import { Injectable } from '@nestjs/common';
import { ViewTrackingService } from './view-tracking.service';
import { ATSScoreService } from './ats-score.service';
import { SnapshotService } from './snapshot.service';
import type {
  AnalyticsDashboard,
  ScoreProgressionPoint,
  ATSScoreResult,
  ViewStats,
} from '../interfaces';

type ResumeWithDetails = {
  id: string;
  skills: Array<{ name: string }>;
  experiences: Array<{
    description?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }>;
  summary?: string | null;
  emailContact?: string | null;
  phone?: string | null;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly viewTracking: ViewTrackingService,
    private readonly atsScore: ATSScoreService,
    private readonly snapshot: SnapshotService,
  ) {}

  async build(
    resumeId: string,
    resume: ResumeWithDetails,
  ): Promise<AnalyticsDashboard> {
    const [viewStats, progression] = await Promise.all([
      this.viewTracking.getViewStats(resumeId, { period: 'month' }),
      this.snapshot.getScoreProgression(resumeId, 30),
    ]);
    const atsResult = this.atsScore.calculate(resume);
    const trend = this.calculateTrend(progression);

    return this.assembleDashboard(resumeId, viewStats, atsResult, trend);
  }

  private assembleDashboard(
    resumeId: string,
    viewStats: ViewStats,
    atsResult: ATSScoreResult,
    trend: 'improving' | 'stable' | 'declining',
  ): AnalyticsDashboard {
    return {
      resumeId,
      overview: {
        totalViews: viewStats.totalViews,
        uniqueVisitors: viewStats.uniqueVisitors,
        atsScore: atsResult.score,
        keywordScore: atsResult.breakdown.keywords,
        industryPercentile: 0,
      },
      viewTrend: viewStats.viewsByDay,
      topSources: viewStats.topSources,
      keywordHealth: {
        score: atsResult.breakdown.keywords,
        topKeywords: [],
        missingCritical: [],
      },
      industryPosition: { percentile: 0, trend },
      recommendations: atsResult.recommendations.map((msg) => ({
        type: 'add_keywords' as const,
        priority: 'medium' as const,
        message: msg,
      })),
    };
  }

  private calculateTrend(
    points: ScoreProgressionPoint[],
  ): 'improving' | 'stable' | 'declining' {
    if (points.length < 2) return 'stable';
    const first = points[0].score;
    const last = points[points.length - 1].score;
    const diff = last - first;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }
}
