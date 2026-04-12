/**
 * Resume Analytics Port
 *
 * Defines the use cases interface and injection token for the Resume Analytics submodule.
 */

import type { ResumeForAnalytics } from '../../domain/types';
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
  TrackView,
  ViewStats,
  ViewStatsOptions,
} from '../../interfaces';

// ============================================================================
// Repository Ports
// ============================================================================

export abstract class AtsScoreCatalogPort {
  abstract loadCatalog(): Promise<SectionTypeAtsConfig[]>;
}

export interface SectionTypeAtsConfig {
  key: string;
  kind: string;
  ats: {
    isMandatory: boolean;
    recommendedPosition: number;
    scoring: {
      baseScore: number;
      fieldWeights: Record<string, number>;
    };
  };
  roleToFieldKey: Record<string, string>;
}

export abstract class BenchmarkRepositoryPort {
  abstract getAllAtsScores(): Promise<number[]>;
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

export const RESUME_ANALYTICS_USE_CASES = Symbol('RESUME_ANALYTICS_USE_CASES');

export interface ResumeAnalyticsUseCases {
  calculateAtsScoreUseCase: {
    execute: (resumeId: string, userId: string) => Promise<ATSScoreResult>;
  };
  getIndustryBenchmarkUseCase: {
    execute: (
      resumeId: string,
      userId: string,
      options: IndustryBenchmarkOptions,
    ) => Promise<IndustryBenchmark>;
  };
  buildAnalyticsDashboardUseCase: {
    execute: (resumeId: string, userId: string) => Promise<AnalyticsDashboard>;
  };
  analyzeKeywordsUseCase: {
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
  saveSnapshotUseCase: {
    execute: (resumeId: string, userId: string) => Promise<AnalyticsSnapshot>;
  };
  getSnapshotHistoryUseCase: {
    execute: (
      resumeId: string,
      userId: string,
      query?: { limit?: number },
    ) => Promise<AnalyticsSnapshot[]>;
  };
  getScoreProgressionUseCase: {
    execute: (resumeId: string, userId: string, days?: number) => Promise<ScoreProgression>;
  };
  trackViewUseCase: {
    execute: (input: TrackView) => Promise<void>;
  };
  getViewStatsUseCase: {
    execute: (resumeId: string, userId: string, options: ViewStatsOptions) => Promise<ViewStats>;
  };
  /** @deprecated Used by BenchmarkService for GraphQL — kept for backward compat */
  getIndustryBenchmarks: (industry?: string) => Array<{
    industry: string;
    averageScore: number;
    sampleSize: number;
    percentile25: number;
    percentile50: number;
    percentile75: number;
  }>;
}
