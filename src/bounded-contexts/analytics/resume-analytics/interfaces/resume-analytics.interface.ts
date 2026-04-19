/**
 * Resume Analytics Interfaces
 *
 * Type definitions for analytics operations.
 * Defines contracts for analytics data structures.
 */

export interface TrackView {
  resumeId: string;
  ip: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
}

export interface ViewStatsOptions {
  period: 'day' | 'week' | 'month' | 'year';
  startDate?: Date;
  endDate?: Date;
}

export interface ViewStats {
  totalViews: number;
  uniqueVisitors: number;
  viewsByDay: Array<{
    date: string;
    count: number;
  }>;
  topSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

export interface ATSScoreResult {
  score: number;
  sectionBreakdown: SectionScoreBreakdown[];
  issues: ATSIssue[];
  recommendations: string[];
}

export interface SectionScoreBreakdown {
  sectionKind: string;
  sectionTypeKey: string;
  score: number;
}

export interface ATSIssue {
  code: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  context?: {
    sectionKind?: string;
    missingFields?: string[];
  };
}

export interface KeywordSuggestionsOptions {
  industry: Industry;
  targetRole?: string;
}

export interface KeywordSuggestions {
  existingKeywords: Array<{
    keyword: string;
    count: number;
    relevance: number;
  }>;
  missingKeywords: string[];
  keywordDensity: number;
  warnings: KeywordWarning[];
  recommendations: string[];
}

export interface KeywordWarning {
  type: 'keyword_stuffing' | 'low_density' | 'irrelevant_keywords';
  message: string;
  affectedKeywords: string[];
}

export interface JobMatchDimensions {
  hardSkills?: number;
  softSkills?: number;
  experience?: number;
  languages?: number;
  location?: number;
}

export interface JobMatchResult {
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  partialMatches: Array<{
    resumeKeyword: string;
    jobKeyword: string;
    similarity: number;
  }>;
  recommendations: string[];
  /** Per-dimension coverage; populated by callers that have the context. */
  dimensions?: JobMatchDimensions;
}

export interface IndustryBenchmarkOptions {
  industry: Industry;
  experienceLevel?: ExperienceLevel;
}

export interface IndustryBenchmark {
  percentile: number;
  totalInIndustry: number;
  comparison: IndustryComparison;
  topPerformers: TopPerformersProfile;
  recommendations: BenchmarkRecommendation[];
}

export interface IndustryComparison {
  avgATSScore: number;
  yourATSScore: number;
  avgViews: number;
  yourViews: number;
  avgStructuredItemCount: number;
  yourStructuredItemCount: number;
  avgCareerDepthYears: number;
  yourCareerDepthYears: number;
}

export interface TopPerformersProfile {
  commonKeywords: string[];
  avgCareerDepthYears: number;
  avgStructuredItemCount: number;
  commonCredentials: string[];
}

export interface BenchmarkRecommendation {
  type: 'content' | 'career' | 'credential' | 'keyword';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
}

export interface AnalyticsDashboard {
  resumeId: string;
  overview: DashboardOverview;
  viewTrend: Array<{ date: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  keywordHealth: KeywordHealth;
  industryPosition: IndustryPosition;
  recommendations: DashboardRecommendation[];
}

export interface DashboardOverview {
  totalViews: number;
  uniqueVisitors: number;
  atsScore: number;
  keywordScore: number;
  industryPercentile: number;
}

export interface KeywordHealth {
  score: number;
  topKeywords: string[];
  missingCritical: string[];
}

export interface IndustryPosition {
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface DashboardRecommendation {
  type: 'add_section' | 'improve_content' | 'add_keywords' | 'optimize_format';
  priority: 'high' | 'medium' | 'low';
  message: string;
}

export interface AnalyticsSnapshot {
  id: string;
  resumeId: string;
  atsScore: number;
  keywordScore: number;
  completenessScore: number;
  industryRank?: number;
  totalInIndustry?: number;
  topKeywords: string[];
  missingKeywords: string[];
  createdAt: Date;
}

export interface ScoreProgression {
  snapshots: Array<{
    date: Date;
    score: number;
  }>;
  trend: 'improving' | 'stable' | 'declining';
  changePercent: number;
}

export interface ScoreProgressionPoint {
  date: string;
  score: number;
}

export interface AnalyticsSnapshotInput {
  resumeId: string;
  atsScore: number;
  completenessScore: number;
  industry?: string;
  totalViews: number;
}

export type Industry =
  | 'software_engineering'
  | 'data_science'
  | 'devops'
  | 'product_management'
  | 'design'
  | 'marketing'
  | 'finance'
  | 'healthcare'
  | 'education'
  | 'other';

export type ExperienceLevel =
  | 'entry'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'executive';
