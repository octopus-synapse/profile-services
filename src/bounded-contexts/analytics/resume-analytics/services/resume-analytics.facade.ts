import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { ResumeForAnalytics } from '../domain/types';
import type {
  AnalyticsDashboard,
  AnalyticsSnapshot,
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
import { BenchmarkService } from './benchmark.service';
import { DashboardService } from './dashboard.service';
import { KeywordAnalysisService } from './keyword-analysis.service';
import { SnapshotService } from './snapshot.service';
import { ViewTrackingService } from './view-tracking.service';

export class ResumeAnalyticsFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly viewTracking: ViewTrackingService,
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

  async simulateATS(
    resumeId: string,
    userId: string,
  ): Promise<{
    extractedText: string;
    sections: Array<{
      title: string;
      semanticKind: string;
      column: 'main' | 'sidebar' | 'full-width';
      items: Array<{ fields: Record<string, string> }>;
    }>;
    warnings: string[];
  }> {
    await this.verifyOwnership(resumeId, userId);
    const resume = await this.prisma.resume.findUniqueOrThrow({
      where: { id: resumeId },
      include: {
        resumeSections: {
          include: {
            sectionType: { select: { semanticKind: true, slug: true } },
            items: { orderBy: { order: 'asc' }, select: { content: true } },
          },
        },
      },
    });

    // Strip decorative glyphs (icons in private-use area, emoji, etc.) and
    // surface a warning when they're present. ATS parsers ignore these so
    // the user knows what gets dropped.
    const decorativeRe = /[\u{1F300}-\u{1FAFF}\u{E000}-\u{F8FF}\u{2700}-\u{27BF}]/gu;
    const warnings: string[] = [];

    const sections = resume.resumeSections.map((rs) => {
      const items = rs.items.map((item) => {
        const content = (item.content as Record<string, unknown>) ?? {};
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries(content)) {
          if (typeof v === 'string') {
            const cleaned = v.replace(decorativeRe, '').trim();
            if (cleaned !== v) warnings.push(`Decorative glyph stripped in "${k}"`);
            if (cleaned) fields[k] = cleaned;
          }
        }
        return { fields };
      });
      return {
        title: rs.sectionType.slug,
        semanticKind: rs.sectionType.semanticKind,
        column: 'full-width' as const,
        items,
      };
    });

    const extractedText = sections
      .flatMap((s) => s.items.flatMap((i) => Object.values(i.fields)))
      .join('\n');

    return { extractedText, sections, warnings: Array.from(new Set(warnings)) };
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
    const latest = await this.snapshot.getLatest(resumeId);
    return this.benchmark.getIndustryBenchmark(latest?.overallScore ?? 0, options);
  }

  async getDashboard(resumeId: string, userId: string): Promise<AnalyticsDashboard> {
    await this.verifyOwnership(resumeId, userId);
    const resume = await this.getResumeWithDetails(resumeId);
    return this.dashboard.build(resumeId, resume);
  }

  async saveSnapshot(resumeId: string, userId: string): Promise<AnalyticsSnapshot> {
    await this.verifyOwnership(resumeId, userId);
    // Snapshot the latest persisted Resume Quality score (the content-based
    // ATS score was retired). `atsScore` keeps its DTO field name for
    // response stability but is sourced from the quality overall score.
    const latest = await this.snapshot.getLatest(resumeId);
    return this.snapshot.save({
      resumeId,
      atsScore: latest?.overallScore ?? 0,
      keywordScore: latest?.completenessScore ?? 0,
      completenessScore: latest?.completenessScore ?? 0,
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
      snapshots: points.map((p) => ({ date: new Date(p.date), score: p.score })),
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

  private async verifyOwnership(resumeId: string, userId: string): Promise<void> {
    const projection = await this.prisma.analyticsResumeProjection.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });

    if (!projection) throw new EntityNotFoundException('Resume', resumeId);
  }

  private async verifyResumeExists(resumeId: string): Promise<void> {
    const projection = await this.prisma.analyticsResumeProjection.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });

    if (!projection) throw new EntityNotFoundException('Resume', resumeId);
  }

  private async getResumeWithDetails(resumeId: string): Promise<ResumeForAnalytics> {
    const resume = await this.prisma.resume.findUniqueOrThrow({
      where: { id: resumeId },
      include: {
        resumeSections: {
          include: {
            sectionType: {
              select: { semanticKind: true },
            },
            items: {
              orderBy: { order: 'asc' },
              select: { id: true, content: true },
            },
          },
        },
      },
    });

    // Transform to generic sections format
    const sections = resume.resumeSections.map((rs) => ({
      id: rs.id,
      semanticKind: rs.sectionType.semanticKind,
      items: rs.items.map((item) => ({
        id: item.id,
        content: item.content as Record<string, unknown>,
      })),
    }));

    return {
      summary: resume.summary,
      phone: resume.phone,
      jobTitle: resume.jobTitle,
      sections,
    };
  }
}
