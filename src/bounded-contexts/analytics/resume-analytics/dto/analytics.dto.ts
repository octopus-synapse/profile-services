/**
 * Resume Analytics DTOs
 *
 * Data Transfer Objects for resume analytics API endpoints.
 * Uses createZodDto for seamless integration with NestJS and Swagger.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

const IndustryEnum = z.enum([
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
]);

const ExperienceLevelEnum = z.enum([
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
  'executive',
]);

const PeriodEnum = z.enum(['day', 'week', 'month', 'year']);
const SeverityEnum = z.enum(['low', 'medium', 'high']);
const PriorityEnum = z.enum(['low', 'medium', 'high']);
const TrendEnum = z.enum(['improving', 'stable', 'declining']);

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const TrackViewRequestSchema = z.object({
  userAgent: z.string().optional(),
  referer: z.string().optional(),
});

const ViewStatsQuerySchema = z.object({
  period: PeriodEnum,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const KeywordOptionsSchema = z.object({
  industry: IndustryEnum,
  targetRole: z.string().optional(),
});

const JobMatchRequestSchema = z.object({
  jobDescription: z.string().min(10),
});

const BenchmarkOptionsSchema = z.object({
  industry: IndustryEnum,
  experienceLevel: ExperienceLevelEnum.optional(),
});

const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const CreateSnapshotRequestSchema = z.object({
  label: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

const ViewStatsResponseSchema = z.object({
  totalViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
  viewsByDay: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  topSources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
  ),
});

const ATSScoreResponseSchema = z.object({
  score: z.number().min(0).max(100),
  sectionBreakdown: z.array(
    z.object({
      sectionKind: z.string(),
      sectionTypeKey: z.string(),
      score: z.number().min(0).max(100),
    }),
  ),
  issues: z.array(
    z.object({
      code: z.string(),
      severity: SeverityEnum,
      message: z.string(),
      context: z
        .object({
          sectionKind: z.string().optional(),
          missingFields: z.array(z.string()).optional(),
        })
        .optional(),
    }),
  ),
  recommendations: z.array(z.string()),
});

const KeywordSuggestionsResponseSchema = z.object({
  existingKeywords: z.array(
    z.object({
      keyword: z.string(),
      count: z.number().int().nonnegative(),
      relevance: z.number().min(0).max(1),
    }),
  ),
  missingKeywords: z.array(z.string()),
  keywordDensity: z.number().min(0).max(1),
  warnings: z.array(
    z.object({
      type: z.string(),
      message: z.string(),
      affectedKeywords: z.array(z.string()),
    }),
  ),
  recommendations: z.array(z.string()),
});

const JobMatchResponseSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const BenchmarkResponseSchema = z.object({
  percentile: z.number().min(0).max(100),
  totalInIndustry: z.number().int().nonnegative(),
  comparison: z.object({
    avgATSScore: z.number().min(0).max(100),
    yourATSScore: z.number().min(0).max(100),
    avgViews: z.number().nonnegative(),
    yourViews: z.number().nonnegative(),
    avgStructuredItemCount: z.number().int().nonnegative(),
    yourStructuredItemCount: z.number().int().nonnegative(),
    avgCareerDepthYears: z.number().nonnegative(),
    yourCareerDepthYears: z.number().nonnegative(),
  }),
  topPerformers: z.object({
    commonKeywords: z.array(z.string()),
    avgCareerDepthYears: z.number().nonnegative(),
    avgStructuredItemCount: z.number().int().nonnegative(),
    commonCredentials: z.array(z.string()),
  }),
  recommendations: z.array(
    z.object({
      type: z.string(),
      priority: PriorityEnum,
      message: z.string(),
      action: z.string(),
    }),
  ),
});

const DashboardResponseSchema = z.object({
  resumeId: z.string(),
  overview: z.object({
    totalViews: z.number().int().nonnegative(),
    uniqueVisitors: z.number().int().nonnegative(),
    atsScore: z.number().min(0).max(100),
    keywordScore: z.number().min(0).max(100),
    industryPercentile: z.number().min(0).max(100),
  }),
  viewTrend: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  topSources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  keywordHealth: z.object({
    score: z.number().min(0).max(100),
    topKeywords: z.array(z.string()),
    missingCritical: z.array(z.string()),
  }),
  industryPosition: z.object({
    percentile: z.number().min(0).max(100),
    trend: TrendEnum,
  }),
  recommendations: z.array(
    z.object({
      type: z.string(),
      priority: PriorityEnum,
      message: z.string(),
    }),
  ),
});

const SnapshotResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  atsScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  topKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  createdAt: z.date(),
});

const ScoreProgressionResponseSchema = z.object({
  snapshots: z.array(
    z.object({
      date: z.date(),
      score: z.number().min(0).max(100),
    }),
  ),
  trend: TrendEnum,
  changePercent: z.number(),
});

// ============================================================================
// REQUEST DTOs (using createZodDto)
// ============================================================================

export class TrackViewRequestDto extends createZodDto(TrackViewRequestSchema) {}

export class ViewStatsQueryDto extends createZodDto(ViewStatsQuerySchema) {}

export class KeywordOptionsDto extends createZodDto(KeywordOptionsSchema) {}

export class JobMatchRequestDto extends createZodDto(JobMatchRequestSchema) {}

export class BenchmarkOptionsDto extends createZodDto(BenchmarkOptionsSchema) {}

export class HistoryQueryDto extends createZodDto(HistoryQuerySchema) {}

export class CreateSnapshotRequestDto extends createZodDto(CreateSnapshotRequestSchema) {}

// ============================================================================
// COMMON RESPONSE SCHEMAS
// ============================================================================

const MessageResponseSchema = z.object({
  message: z.string(),
});

// ============================================================================
// RESPONSE DTOs (using createZodDto)
// ============================================================================

export class MessageResponseDto extends createZodDto(MessageResponseSchema) {}

export class ViewStatsResponseDto extends createZodDto(ViewStatsResponseSchema) {}

export class ATSScoreResponseDto extends createZodDto(ATSScoreResponseSchema) {}

export class KeywordSuggestionsResponseDto extends createZodDto(KeywordSuggestionsResponseSchema) {}

export class JobMatchResponseDto extends createZodDto(JobMatchResponseSchema) {}

export class BenchmarkResponseDto extends createZodDto(BenchmarkResponseSchema) {}

export class DashboardResponseDto extends createZodDto(DashboardResponseSchema) {}

export class SnapshotResponseDto extends createZodDto(SnapshotResponseSchema) {}

export class ScoreProgressionResponseDto extends createZodDto(ScoreProgressionResponseSchema) {}
