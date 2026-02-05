export * from './resume-analytics.module';
export * from './services';
export * from './controllers';

// Re-export contract types with `export type` for isolatedModules
export type {
  ViewStatsQuery,
  KeywordOptions,
  JobMatch,
  BenchmarkOptions,
  HistoryQuery,
  ViewStatsResponse,
  ATSScoreResponse,
  KeywordSuggestionsResponse,
  JobMatchResponse,
  BenchmarkResponse,
  DashboardResponse,
  SnapshotResponse,
  ScoreProgressionResponse,
} from '@/shared-kernel';

export type {
  TrackView,
  ViewStatsOptions,
  ViewStats,
  ATSScoreResult,
  ATSScoreBreakdown,
  ATSIssue,
  KeywordSuggestions,
  JobMatchResult,
  IndustryBenchmark,
  AnalyticsDashboard,
  AnalyticsSnapshot,
  ScoreProgression,
  Industry,
  ExperienceLevel,
} from './interfaces';
