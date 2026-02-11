import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import { AtsScoreCalculatedEvent } from '../../domain/events';
import type {
  AnalyticsDashboard,
  AnalyticsSnapshot,
  ATSScoreResult,
  IndustryBenchmark,
  IndustryBenchmarkOptions,
  JobMatchResult,
  KeywordSuggestions,
  KeywordSuggestionsOptions,
  ScoreProgression,
  ScoreProgressionPoint,
  TrackView,
  ViewStats,
  ViewStatsOptions,
} from '../interfaces';
import { ATSScoreService } from './ats-score.service';
import { BenchmarkService } from './benchmark.service';
import { DashboardService } from './dashboard.service';
import { KeywordAnalysisService } from './keyword-analysis.service';
import { SnapshotService } from './snapshot.service';
import { ViewTrackingService } from './view-tracking.service';

@Injectable()
export class ResumeAnalyticsFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisher,
    private readonly viewTracking: ViewTrackingService,
    private readonly atsScore: ATSScoreService,
    private readonly keywordAnalysis: KeywordAnalysisService,
    private readonly benchmark: BenchmarkService,
    private readonly snapshot: SnapshotService,
    private readonly dashboard: DashboardService,
  ) {}

  async trackView(input: TrackView): Promise<void> {
    await this.verifyResumeExists(input.resumeId);
    await this.viewTracking.trackView(input);
  }

  async getViewStats(
    resumeId: string,
    userId: string,
    options: ViewStatsOptions,
  ): Promise<ViewStats> {
    await this.verifyOwnership(resumeId, userId);
    return this.viewTracking.getViewStats(resumeId, options);
  }

  async calculateATSScore(resumeId: string, userId: string): Promise<ATSScoreResult> {
    await this.verifyOwnership(resumeId, userId);
    const resume = await this.getResumeWithDetails(resumeId);
    const result = this.atsScore.calculate(resume);

    this.eventPublisher.publish(
      new AtsScoreCalculatedEvent(resumeId, {
        score: result.score,
        issues: result.issues.map((i) => i.type),
      }),
    );

    return result;
  }

  async getKeywordSuggestions(
    resumeId: string,
    userId: string,
    options: KeywordSuggestionsOptions,
  ): Promise<KeywordSuggestions> {
    await this.verifyOwnership(resumeId, userId);
    const resume = await this.getResumeWithDetails(resumeId);
    return this.keywordAnalysis.getKeywordSuggestions(resume, options);
  }

  async matchJobDescription(
    resumeId: string,
    userId: string,
    jobDescription: string,
  ): Promise<JobMatchResult> {
    await this.verifyOwnership(resumeId, userId);
    const resume = await this.getResumeWithDetails(resumeId);
    return this.keywordAnalysis.matchJobDescription(resume, jobDescription);
  }

  async getIndustryBenchmark(
    resumeId: string,
    userId: string,
    options: IndustryBenchmarkOptions,
  ): Promise<IndustryBenchmark> {
    await this.verifyOwnership(resumeId, userId);
    const resume = await this.getResumeWithDetails(resumeId);
    const atsResult = this.atsScore.calculate(resume);
    return this.benchmark.getIndustryBenchmark(atsResult.score, options);
  }

  async getDashboard(resumeId: string, userId: string): Promise<AnalyticsDashboard> {
    await this.verifyOwnership(resumeId, userId);
    const resume = await this.getResumeWithDetails(resumeId);
    return this.dashboard.build(resumeId, resume);
  }

  async saveSnapshot(resumeId: string, userId: string): Promise<AnalyticsSnapshot> {
    await this.verifyOwnership(resumeId, userId);
    const resume = await this.getResumeWithDetails(resumeId);
    const atsResult = this.atsScore.calculate(resume);
    return this.snapshot.save({
      resumeId,
      atsScore: atsResult.score,
      keywordScore: atsResult.breakdown.keywords,
      completenessScore: atsResult.breakdown.completeness,
    });
  }

  async getHistory(
    resumeId: string,
    userId: string,
    query?: { limit?: number },
  ): Promise<AnalyticsSnapshot[]> {
    await this.verifyOwnership(resumeId, userId);
    return this.snapshot.getHistory(resumeId, query?.limit);
  }

  async getScoreProgression(
    resumeId: string,
    userId: string,
    days?: number,
  ): Promise<ScoreProgression> {
    await this.verifyOwnership(resumeId, userId);
    const points = await this.snapshot.getScoreProgression(resumeId, days);
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
    return Math.round(((points[points.length - 1].score - first) / first) * 100);
  }

  private async verifyOwnership(resumeId: string, userId: string): Promise<void> {
    // First try the local projection (eliminates cross-context query)
    const projection = await this.prisma.analyticsResumeProjection.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });

    if (projection) return;

    // Fallback to resume table for backward compatibility
    // (until projection is fully populated)
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });
    if (!resume) throw new NotFoundException('Resume not found or access denied');
  }

  private async verifyResumeExists(resumeId: string): Promise<void> {
    // First try the local projection
    const projection = await this.prisma.analyticsResumeProjection.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });

    if (projection) return;

    // Fallback to resume table
    const exists = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Resume not found');
  }

  private async getResumeWithDetails(resumeId: string) {
    return this.prisma.resume.findUniqueOrThrow({
      where: { id: resumeId },
      include: {
        experiences: true,
        education: true,
        skills: true,
        certifications: true,
      },
    });
  }
}
