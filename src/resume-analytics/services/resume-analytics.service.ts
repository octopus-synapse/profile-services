/**
 * Resume Analytics Service (Orchestrator)
 *
 * Core analytics orchestrator that coordinates sub-services.
 * This service has been refactored from a 1000+ line god class
 * into a thin orchestrator that delegates to focused services.
 *
 * Sub-services:
 * - ViewTrackingService: View tracking with GDPR-compliant IP anonymization
 * - ATSScoreService: ATS score calculation with breakdown
 * - KeywordAnalyzerService: Keyword optimization suggestions
 * - BenchmarkingService: Industry benchmarking
 * - SnapshotService: Historical snapshots and trends
 *
 * @see ADR-000X — Enforce Disciplined, Persona-Aware Engineering
 */

import { Injectable } from '@nestjs/common';
import {
  ResumeNotFoundError,
  ResourceOwnershipError,
} from '@octopus-synapse/profile-contracts';
import { AnalyticsRepository } from '../repositories';
import { ViewTrackingService } from './view-tracking.service';
import { ATSScoreService, type ResumeForScoring } from './ats-score.service';
import {
  KeywordAnalyzerService,
  type ResumeForKeywords,
} from './keyword-analyzer.service';
import {
  BenchmarkingService,
  type ResumeForBenchmark,
} from './benchmarking.service';
import { SnapshotService } from './snapshot.service';
import type {
  TrackView,
  ViewStats,
  ViewStatsOptions,
  ATSScoreResult,
  KeywordSuggestionsOptions,
  KeywordSuggestions,
  JobMatchResult,
  IndustryBenchmarkOptions,
  IndustryBenchmark,
  AnalyticsDashboard,
  AnalyticsSnapshot,
  ScoreProgression,
  Industry,
  DashboardRecommendation,
} from '../interfaces';

@Injectable()
export class ResumeAnalyticsService {
  private dashboardCache = new Map<
    string,
    { data: AnalyticsDashboard; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly viewTrackingService: ViewTrackingService,
    private readonly atsScoreService: ATSScoreService,
    private readonly keywordAnalyzerService: KeywordAnalyzerService,
    private readonly benchmarkingService: BenchmarkingService,
    private readonly snapshotService: SnapshotService,
  ) {}

  // ============================================================================
  // Public API (delegates to sub-services)
  // ============================================================================

  async getAnalytics(
    resumeId: string,
    userId: string,
  ): Promise<{ resumeId: string }> {
    await this.verifyOwnership(resumeId, userId);
    return { resumeId };
  }

  async trackView(dto: TrackView): Promise<void> {
    return this.viewTrackingService.trackView(dto);
  }

  async getViewStats(
    resumeId: string,
    userId: string,
    options: ViewStatsOptions | { period: 'day' | 'week' | 'month' | 'year' },
  ): Promise<ViewStats> {
    await this.verifyOwnership(resumeId, userId);
    return this.viewTrackingService.getViewStats(resumeId, options);
  }

  async calculateATSScore(
    resumeId: string,
    userId: string,
  ): Promise<ATSScoreResult> {
    const resume = await this.getResumeForScoring(resumeId, userId);
    return this.atsScoreService.calculateScore(resume);
  }

  async getKeywordSuggestions(
    resumeId: string,
    userId: string,
    options: KeywordSuggestionsOptions,
  ): Promise<KeywordSuggestions> {
    const resume = await this.getResumeForKeywords(resumeId, userId);
    return this.keywordAnalyzerService.getSuggestions(resume, options);
  }

  async matchJobDescription(
    resumeId: string,
    userId: string,
    jobDescription: string,
  ): Promise<JobMatchResult> {
    const resume = await this.getResumeForKeywords(resumeId, userId);
    return this.keywordAnalyzerService.matchJobDescription(
      resume,
      jobDescription,
    );
  }

  async getIndustryBenchmark(
    resumeId: string,
    userId: string,
    options: IndustryBenchmarkOptions,
  ): Promise<IndustryBenchmark> {
    const resume = await this.getResumeForBenchmark(resumeId, userId);
    return this.benchmarkingService.getBenchmark(resume, options);
  }

  async getDashboard(
    resumeId: string,
    userId: string,
  ): Promise<AnalyticsDashboard> {
    const cacheKey = `${resumeId}-${userId}`;
    const cached = this.dashboardCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const resume = await this.verifyOwnership(resumeId, userId);

    const [totalViews, uniqueVisitors] = await Promise.all([
      this.viewTrackingService.getTotalViews(resumeId),
      this.viewTrackingService.getUniqueVisitors(resumeId),
    ]);

    const resumeForScoring = this.toResumeForScoring(resume);
    const atsResult = this.atsScoreService.calculateScore(resumeForScoring);

    const industry: Industry =
      (resume.techArea as Industry | null) ?? 'software_engineering';
    const resumeForKeywords = this.toResumeForKeywords(resume);
    const keywordResult = this.keywordAnalyzerService.getSuggestions(
      resumeForKeywords,
      { industry },
    );

    const recommendations = this.generateDashboardRecommendations(resume);

    const dashboard: AnalyticsDashboard = {
      resumeId,
      overview: {
        totalViews,
        uniqueVisitors,
        atsScore: atsResult.score,
        keywordScore: Math.round(100 - keywordResult.keywordDensity),
        industryPercentile: 50,
      },
      viewTrend: totalViews === 0 ? [] : [],
      topSources: [],
      keywordHealth: {
        score: keywordResult.keywordDensity,
        topKeywords: keywordResult.existingKeywords
          .slice(0, 5)
          .map((k) => k.keyword),
        missingCritical: keywordResult.missingKeywords.slice(0, 3),
      },
      industryPosition: {
        percentile: 50,
        trend: 'stable',
      },
      recommendations,
    };

    this.dashboardCache.set(cacheKey, {
      data: dashboard,
      timestamp: Date.now(),
    });

    return dashboard;
  }

  async saveSnapshot(
    resumeId: string,
    userId: string,
  ): Promise<AnalyticsSnapshot> {
    const resume = await this.verifyOwnership(resumeId, userId);
    const industry: Industry =
      (resume.techArea as Industry | null) ?? 'software_engineering';
    return this.snapshotService.saveSnapshot(
      resumeId,
      this.toResumeForSnapshot(resume),
      industry,
    );
  }

  async getHistory(
    resumeId: string,
    userId: string,
    options: { limit?: number },
  ): Promise<AnalyticsSnapshot[]> {
    await this.verifyOwnership(resumeId, userId);
    return this.snapshotService.getHistory(resumeId, options);
  }

  async getScoreProgression(
    resumeId: string,
    userId: string,
  ): Promise<ScoreProgression> {
    await this.verifyOwnership(resumeId, userId);
    return this.snapshotService.getScoreProgression(resumeId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async verifyOwnership(
    resumeId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const resume = await this.repository.findResumeById(resumeId);

    if (!resume) {
      throw new ResumeNotFoundError(resumeId);
    }

    if (resume.userId !== userId) {
      throw new ResourceOwnershipError('resume', resumeId);
    }

    return resume as unknown as Record<string, unknown>;
  }

  private async getResumeForScoring(
    resumeId: string,
    userId: string,
  ): Promise<ResumeForScoring> {
    const resume = await this.verifyOwnership(resumeId, userId);
    return this.toResumeForScoring(resume);
  }

  private async getResumeForKeywords(
    resumeId: string,
    userId: string,
  ): Promise<ResumeForKeywords> {
    const resume = await this.verifyOwnership(resumeId, userId);
    return this.toResumeForKeywords(resume);
  }

  private async getResumeForBenchmark(
    resumeId: string,
    userId: string,
  ): Promise<ResumeForBenchmark> {
    const resume = await this.verifyOwnership(resumeId, userId);
    return {
      id: resume.id as string,
      summary: resume.summary as string | null,
      jobTitle: resume.jobTitle as string | null,
      emailContact: resume.emailContact as string | null,
      phone: resume.phone as string | null,
      techArea: resume.techArea as string | null,
      profileViews: resume.profileViews as number | null,
      skills: resume.skills as Array<{ name: string }>,
      experiences: resume.experiences as Array<{
        description?: string | null;
        startDate?: Date | null;
        endDate?: Date | null;
      }>,
    };
  }

  private toResumeForScoring(
    resume: Record<string, unknown>,
  ): ResumeForScoring {
    return {
      summary: resume.summary as string | null,
      jobTitle: resume.jobTitle as string | null,
      emailContact: resume.emailContact as string | null,
      phone: resume.phone as string | null,
      skills: resume.skills as Array<{ name: string }>,
      experiences: resume.experiences as Array<{ description?: string | null }>,
    };
  }

  private toResumeForKeywords(
    resume: Record<string, unknown>,
  ): ResumeForKeywords {
    return {
      summary: resume.summary as string | null,
      jobTitle: resume.jobTitle as string | null,
      skills: resume.skills as Array<{ name: string }>,
      experiences: resume.experiences as Array<{
        title?: string | null;
        company?: string | null;
        description?: string | null;
      }>,
    };
  }

  private toResumeForSnapshot(
    resume: Record<string, unknown>,
  ): ResumeForScoring & ResumeForKeywords {
    return {
      summary: resume.summary as string | null,
      jobTitle: resume.jobTitle as string | null,
      emailContact: resume.emailContact as string | null,
      phone: resume.phone as string | null,
      skills: resume.skills as Array<{ name: string }>,
      experiences: resume.experiences as Array<{
        title?: string | null;
        company?: string | null;
        description?: string | null;
      }>,
    };
  }

  private generateDashboardRecommendations(
    resume: Record<string, unknown>,
  ): DashboardRecommendation[] {
    const recommendations: DashboardRecommendation[] = [];

    const skills = resume.skills as unknown[];
    if (skills.length === 0) {
      recommendations.push({
        type: 'add_skills',
        priority: 'high',
        message: 'Add relevant skills to improve visibility',
      });
    }

    const experiences = resume.experiences as unknown[];
    if (experiences.length === 0) {
      recommendations.push({
        type: 'add_experience',
        priority: 'high',
        message: 'Add work experience to strengthen your profile',
      });
    }

    const summary = resume.summary as string;
    if (!summary || summary.length < 100) {
      recommendations.push({
        type: 'improve_summary',
        priority: 'medium',
        message: 'Expand your professional summary with key achievements',
      });
    }

    return recommendations;
  }
}
