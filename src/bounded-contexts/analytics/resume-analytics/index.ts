// Export DTOs from local bounded-context

export * from './controllers';
export * from './dto/analytics.dto';
export type {
  AnalyticsDashboard,
  AnalyticsSnapshot,
  ATSIssue,
  ATSScoreResult,
  ExperienceLevel,
  Industry,
  IndustryBenchmark,
  JobMatchResult,
  KeywordSuggestions,
  ScoreProgression,
  SectionScoreBreakdown,
  TrackView,
  ViewStats,
  ViewStatsOptions,
} from './interfaces';
export * from './resume-analytics.module';
export * from './services';
