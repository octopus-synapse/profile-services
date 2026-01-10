/**
 * Resume Analytics Interfaces
 *
 * Type definitions for analytics operations.
 * Defines contracts for analytics data structures.
 */

export interface TrackViewDto {
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
  breakdown: ATSScoreBreakdown;
  issues: ATSIssue[];
  recommendations: string[];
}

export interface ATSScoreBreakdown {
  keywords: number;
  format: number;
  completeness: number;
  experience: number;
}

export interface ATSIssue {
  type: ATSIssueType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  field?: string;
}

export type ATSIssueType =
  | 'missing_contact'
  | 'short_summary'
  | 'missing_skills'
  | 'no_experience'
  | 'missing_education'
  | 'weak_action_verbs'
  | 'no_quantified_achievements'
  | 'keyword_stuffing'
  | 'format_issue';

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
  avgSkillsCount: number;
  yourSkillsCount: number;
  avgExperienceYears: number;
  yourExperienceYears: number;
}

export interface TopPerformersProfile {
  commonSkills: string[];
  avgExperienceYears: number;
  avgSkillsCount: number;
  commonCertifications: string[];
}

export interface BenchmarkRecommendation {
  type: 'skill' | 'experience' | 'certification' | 'keyword';
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
  type: 'add_skills' | 'improve_summary' | 'add_experience' | 'add_keywords';
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
