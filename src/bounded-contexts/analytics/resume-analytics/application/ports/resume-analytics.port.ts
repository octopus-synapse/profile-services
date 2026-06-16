/**
 * Resume Analytics Port
 *
 * Defines the use cases interface and injection token for the Resume Analytics submodule.
 */

import type { ResumeForAnalytics } from '../../domain/types';
import type {
  AnalyticsDashboard,
  AnalyticsSnapshot,
  IndustryBenchmark,
  IndustryBenchmarkOptions,
  JobMatchResult,
  KeywordSuggestions,
  KeywordSuggestionsOptions,
  ScoreProgression,
  TrackView,
  ViewStats,
  ViewStatsOptions,
} from '../../interfaces';

// ============================================================================
// Repository Ports
// ============================================================================

export abstract class BenchmarkRepositoryPort {
  abstract getAllAtsScores(): Promise<number[]>;
}

/** The latest persisted Resume Quality scores for a resume, read from
 * `ResumeQualityScoreHistory`. Replaces on-demand ATS computation as the
 * score source for benchmark / dashboard / snapshot. */
export interface LatestResumeScore {
  readonly overallScore: number;
  readonly completenessScore: number;
}

export abstract class SnapshotRepositoryPort {
  abstract save(input: {
    resumeId: string;
    atsScore: number;
    keywordScore: number;
    completenessScore: number;
    topKeywords?: string[];
    missingKeywords?: string[];
  }): Promise<AnalyticsSnapshot>;
  abstract getHistory(resumeId: string, limit?: number): Promise<AnalyticsSnapshot[]>;
  abstract getScoreProgression(
    resumeId: string,
    days?: number,
  ): Promise<Array<{ date: string; score: number }>>;
  /** Latest persisted Resume Quality score for the resume (null if none). */
  abstract getLatest(resumeId: string): Promise<LatestResumeScore | null>;
}

export abstract class ViewTrackingRepositoryPort {
  abstract trackView(data: {
    resumeId: string;
    ipHash: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    source: string;
  }): Promise<void>;
  abstract countViews(resumeId: string, startDate: Date, endDate: Date): Promise<number>;
  abstract countUniqueVisitors(resumeId: string, startDate: Date, endDate: Date): Promise<number>;
}

export abstract class ResumeOwnershipPort {
  abstract verifyOwnership(resumeId: string, userId: string): Promise<void>;
  abstract verifyResumeExists(resumeId: string): Promise<void>;
  abstract getResumeWithDetails(resumeId: string): Promise<ResumeForAnalytics>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class ResumeAnalyticsUseCases {
  abstract readonly getIndustryBenchmarkUseCase: {
    execute: (
      resumeId: string,
      userId: string,
      options: IndustryBenchmarkOptions,
    ) => Promise<IndustryBenchmark>;
  };
  abstract readonly buildAnalyticsDashboardUseCase: {
    execute: (resumeId: string, userId: string) => Promise<AnalyticsDashboard>;
  };
  abstract readonly analyzeKeywordsUseCase: {
    execute: (
      resumeId: string,
      userId: string,
      options: KeywordSuggestionsOptions,
    ) => Promise<KeywordSuggestions>;
    matchJobDescription: (
      resumeId: string,
      userId: string,
      jobDescription: string,
    ) => Promise<JobMatchResult>;
  };
  abstract readonly saveSnapshotUseCase: {
    execute: (resumeId: string, userId: string) => Promise<AnalyticsSnapshot>;
  };
  abstract readonly getSnapshotHistoryUseCase: {
    execute: (
      resumeId: string,
      userId: string,
      query?: { limit?: number },
    ) => Promise<AnalyticsSnapshot[]>;
  };
  abstract readonly getScoreProgressionUseCase: {
    execute: (resumeId: string, userId: string, days?: number) => Promise<ScoreProgression>;
  };
  abstract readonly trackViewUseCase: { execute: (input: TrackView) => Promise<void> };
  abstract readonly getViewStatsUseCase: {
    execute: (resumeId: string, userId: string, options: ViewStatsOptions) => Promise<ViewStats>;
  };
  /**
   * @deprecated Used by BenchmarkService for GraphQL — kept for backward compat
   * @removeBy 2026-08-31
   */
  abstract readonly getIndustryBenchmarks: (industry?: string) => Array<{
    industry: string;
    averageScore: number;
    sampleSize: number;
    percentile25: number;
    percentile50: number;
    percentile75: number;
  }>;
}
