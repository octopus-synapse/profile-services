/**
 * Resume Analytics DTOs
 *
 * Request/Response DTOs for analytics endpoints.
 * Follows class-validator patterns for validation.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import type { Industry, ExperienceLevel } from '../interfaces';

export class TrackViewDto {
  @ApiProperty({ description: 'Resume ID' })
  @IsString()
  resumeId: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Referer URL' })
  @IsOptional()
  @IsString()
  referer?: string;
}

export class ViewStatsQueryDto {
  @ApiProperty({
    description: 'Time period for aggregation',
    enum: ['day', 'week', 'month', 'year'],
  })
  @IsEnum(['day', 'week', 'month', 'year'])
  period: 'day' | 'week' | 'month' | 'year';

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class KeywordOptionsDto {
  @ApiProperty({
    description: 'Industry for keyword comparison',
    enum: [
      'software_engineering',
      'data_science',
      'devops',
      'product_management',
      'design',
      'marketing',
      'finance',
      'healthcare',
      'education',
      'other',
    ],
  })
  @IsEnum([
    'software_engineering',
    'data_science',
    'devops',
    'product_management',
    'design',
    'marketing',
    'finance',
    'healthcare',
    'education',
    'other',
  ])
  industry: Industry;

  @ApiPropertyOptional({ description: 'Target role for keyword matching' })
  @IsOptional()
  @IsString()
  targetRole?: string;
}

export class JobMatchDto {
  @ApiProperty({ description: 'Job description text to match against' })
  @IsString()
  jobDescription: string;
}

export class BenchmarkOptionsDto {
  @ApiProperty({
    description: 'Industry for benchmarking',
    enum: [
      'software_engineering',
      'data_science',
      'devops',
      'product_management',
      'design',
      'marketing',
      'finance',
      'healthcare',
      'education',
      'other',
    ],
  })
  @IsEnum([
    'software_engineering',
    'data_science',
    'devops',
    'product_management',
    'design',
    'marketing',
    'finance',
    'healthcare',
    'education',
    'other',
  ])
  industry: Industry;

  @ApiPropertyOptional({
    description: 'Experience level filter',
    enum: [
      'entry',
      'junior',
      'mid',
      'senior',
      'lead',
      'principal',
      'executive',
    ],
  })
  @IsOptional()
  @IsEnum([
    'entry',
    'junior',
    'mid',
    'senior',
    'lead',
    'principal',
    'executive',
  ])
  experienceLevel?: ExperienceLevel;
}

export class HistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Number of snapshots to retrieve',
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// Response DTOs

export class ViewStatsResponseDto {
  @ApiProperty()
  totalViews: number;

  @ApiProperty()
  uniqueVisitors: number;

  @ApiProperty({ type: [Object] })
  viewsByDay: Array<{ date: string; count: number }>;

  @ApiProperty({ type: [Object] })
  topSources: Array<{ source: string; count: number; percentage: number }>;
}

export class ATSScoreResponseDto {
  @ApiProperty({ description: 'Overall ATS score (0-100)' })
  score: number;

  @ApiProperty({ description: 'Score breakdown by category' })
  breakdown: {
    keywords: number;
    format: number;
    completeness: number;
    experience: number;
  };

  @ApiProperty({ description: 'Identified issues', type: [Object] })
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;

  @ApiProperty({ description: 'Improvement recommendations', type: [String] })
  recommendations: string[];
}

export class KeywordSuggestionsResponseDto {
  @ApiProperty({ type: [Object] })
  existingKeywords: Array<{
    keyword: string;
    count: number;
    relevance: number;
  }>;

  @ApiProperty({ type: [String] })
  missingKeywords: string[];

  @ApiProperty()
  keywordDensity: number;

  @ApiProperty({ type: [Object] })
  warnings: Array<{
    type: string;
    message: string;
    affectedKeywords: string[];
  }>;

  @ApiProperty({ type: [String] })
  recommendations: string[];
}

export class JobMatchResponseDto {
  @ApiProperty({ description: 'Match score percentage (0-100)' })
  matchScore: number;

  @ApiProperty({ type: [String] })
  matchedKeywords: string[];

  @ApiProperty({ type: [String] })
  missingKeywords: string[];

  @ApiProperty({ type: [String] })
  recommendations: string[];
}

export class BenchmarkResponseDto {
  @ApiProperty({ description: 'Percentile rank (0-100)' })
  percentile: number;

  @ApiProperty()
  totalInIndustry: number;

  @ApiProperty()
  comparison: {
    avgATSScore: number;
    yourATSScore: number;
    avgViews: number;
    yourViews: number;
    avgSkillsCount: number;
    yourSkillsCount: number;
    avgExperienceYears: number;
    yourExperienceYears: number;
  };

  @ApiProperty()
  topPerformers: {
    commonSkills: string[];
    avgExperienceYears: number;
    avgSkillsCount: number;
    commonCertifications: string[];
  };

  @ApiProperty({ type: [Object] })
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }>;
}

export class DashboardResponseDto {
  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    atsScore: number;
    keywordScore: number;
    industryPercentile: number;
  };

  @ApiProperty({ type: [Object] })
  viewTrend: Array<{ date: string; count: number }>;

  @ApiProperty({ type: [Object] })
  topSources: Array<{ source: string; count: number }>;

  @ApiProperty()
  keywordHealth: {
    score: number;
    topKeywords: string[];
    missingCritical: string[];
  };

  @ApiProperty()
  industryPosition: {
    percentile: number;
    trend: 'improving' | 'stable' | 'declining';
  };

  @ApiProperty({ type: [Object] })
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
  }>;
}

export class SnapshotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  atsScore: number;

  @ApiProperty()
  keywordScore: number;

  @ApiProperty()
  completenessScore: number;

  @ApiProperty({ type: [String] })
  topKeywords: string[];

  @ApiProperty({ type: [String] })
  missingKeywords: string[];

  @ApiProperty()
  createdAt: Date;
}

export class ScoreProgressionResponseDto {
  @ApiProperty({ type: [Object] })
  snapshots: Array<{ date: Date; score: number }>;

  @ApiProperty({ enum: ['improving', 'stable', 'declining'] })
  trend: 'improving' | 'stable' | 'declining';

  @ApiProperty()
  changePercent: number;
}
