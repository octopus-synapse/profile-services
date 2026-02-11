// Re-export contract types with `export type` for isolatedModules
export type {
  ATSScoreResponse,
  BenchmarkOptions,
  BenchmarkResponse,
  DashboardResponse,
  HistoryQuery,
  JobMatch,
  JobMatchResponse,
  KeywordOptions,
  KeywordSuggestionsResponse,
  ScoreProgressionResponse,
  SnapshotResponse,
  ViewStatsQuery,
  ViewStatsResponse,
} from '@/shared-kernel';
export * from './controllers';
export type {
  AnalyticsDashboard,
  AnalyticsSnapshot,
  ATSIssue,
  ATSScoreBreakdown,
  ATSScoreResult,
  ExperienceLevel,
  Industry,
  IndustryBenchmark,
  JobMatchResult,
  KeywordSuggestions,
  ScoreProgression,
  TrackView,
  ViewStats,
  ViewStatsOptions,
} from './interfaces';
export * from './resume-analytics.module';
export * from './services';
