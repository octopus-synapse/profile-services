/**
 * Route descriptors for the resume-analytics submodule. Replaces
 * `ResumeAnalyticsController` and the legacy `AnalyticsSseController`
 * — the SSE streams are now declared as `kind: 'sse'` Route descriptors
 * and wired through a dedicated `AnalyticsSseBundle`.
 *
 * Bundle token for the JSON routes is `ResumeAnalyticsFacade`.
 */

import type { Observable } from 'rxjs';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export interface AnalyticsUpdateEvent {
  readonly type: 'view' | 'ats_score';
  readonly resumeId: string;
  readonly data: { views?: number; atsScore?: number; timestamp: Date };
}

export interface AnalyticsSseEvent {
  readonly data: AnalyticsUpdateEvent;
  readonly id: string;
  readonly type: string;
  readonly retry: number;
}

export abstract class AnalyticsSseBundle {
  abstract subscribeToResumeAnalytics(resumeId: string): Observable<AnalyticsSseEvent>;
  abstract subscribeToViews(resumeId: string): Observable<AnalyticsSseEvent>;
  abstract subscribeToAtsScore(resumeId: string): Observable<AnalyticsSseEvent>;
}

export const ResumeIdParam = z.object({ resumeId: z.string().uuid() });

// ─── ATS Simulator (F3-PD-009b) ──────────────────────────────────────
export const AtsSimulationSectionSchema = z.object({
  title: z.string().openapi({ example: 'experience' }),
  semanticKind: z.string().openapi({ example: 'experience' }),
  column: z.enum(['main', 'sidebar', 'full-width']).openapi({ example: 'full-width' }),
  items: z.array(
    z.object({
      fields: z.record(z.string()).openapi({
        example: { title: 'Senior Engineer', company: 'Acme', from: '2022-01-01' },
      }),
    }),
  ),
});

export const AtsSimulationResultSchema = z.object({
  extractedText: z.string().openapi({ example: 'Senior Engineer\nAcme\nFrom Jan 2022' }),
  sections: z.array(AtsSimulationSectionSchema),
  warnings: z.array(z.string()).openapi({ example: ['Decorative glyph stripped in "title"'] }),
});

export const AtsSimulationResponseSchema = z.object({
  data: AtsSimulationResultSchema,
});

export const TrackViewBody = z
  .object({
    userAgent: z.string().optional(),
    referer: z.string().optional(),
  })
  .openapi({
    example: {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      referer: 'https://www.linkedin.com/feed/',
    },
  });

export const PeriodEnum = z.enum(['day', 'week', 'month', 'year']);
export const ViewStatsQuery = z
  .object({
    period: PeriodEnum,
    startDate: IsoDateTimeSchema.optional(),
    endDate: IsoDateTimeSchema.optional(),
  })
  .openapi({ example: { period: 'month' } });

export const IndustryEnum = z.enum([
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
export const ExperienceLevelEnum = z.enum([
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
  'executive',
]);

export const KeywordOptionsQuery = z
  .object({
    industry: IndustryEnum,
    targetRole: z.string().optional(),
  })
  .openapi({ example: { industry: 'software_engineering' } });

export const JobMatchBody = z.object({ jobDescription: z.string().min(10) }).openapi({
  example: {
    jobDescription:
      'We are hiring a senior backend engineer with 5+ years of experience in TypeScript, PostgreSQL, and distributed systems.',
  },
});

export const BenchmarkOptionsQuery = z
  .object({
    industry: IndustryEnum,
    experienceLevel: ExperienceLevelEnum.optional(),
  })
  .openapi({ example: { industry: 'software_engineering' } });

export const HistoryQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type HistoryQueryT = z.infer<typeof HistoryQuery>;

// ─── Response schemas ─────────────────────────────────────────────────
export const TrackViewResponseSchema = z.object({ message: z.string() });

export const ViewStatsResponseSchema = z.object({
  totalViews: z.number().int().min(0),
  uniqueVisitors: z.number().int().min(0),
  viewsByDay: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  topSources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().min(0),
      percentage: z.number(),
    }),
  ),
});

export const SectionScoreBreakdownSchema = z.object({
  sectionKind: z.string(),
  sectionTypeKey: z.string(),
  score: z.number().int(),
});

export const ATSIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  message: z.string(),
  context: z
    .object({
      sectionKind: z.string().optional(),
      missingFields: z.array(z.string()).optional(),
    })
    .optional(),
});

export const ATSScoreResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  sectionBreakdown: z.array(SectionScoreBreakdownSchema),
  issues: z.array(ATSIssueSchema),
  recommendations: z.array(z.string()),
});

export const KeywordWarningSchema = z.object({
  type: z.enum(['keyword_stuffing', 'low_density', 'irrelevant_keywords']),
  message: z.string(),
  affectedKeywords: z.array(z.string()),
});

export const KeywordSuggestionsResponseSchema = z.object({
  existingKeywords: z.array(
    z.object({
      keyword: z.string(),
      count: z.number().int().min(0),
      relevance: z.number(),
    }),
  ),
  missingKeywords: z.array(z.string()),
  keywordDensity: z.number(),
  warnings: z.array(KeywordWarningSchema),
  recommendations: z.array(z.string()),
});

export const JobMatchDimensionsSchema = z.object({
  hardSkills: z.number().optional(),
  softSkills: z.number().optional(),
  experience: z.number().optional(),
  languages: z.number().optional(),
  location: z.number().optional(),
});

export const JobMatchResponseSchema = z.object({
  matchScore: z.number(),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  partialMatches: z.array(
    z.object({
      resumeKeyword: z.string(),
      jobKeyword: z.string(),
      similarity: z.number(),
    }),
  ),
  recommendations: z.array(z.string()),
  dimensions: JobMatchDimensionsSchema.optional(),
});

export const BenchmarkRecommendationSchema = z.object({
  type: z.enum(['content', 'career', 'credential', 'keyword']),
  priority: z.enum(['high', 'medium', 'low']),
  message: z.string(),
  action: z.string(),
});

export const IndustryBenchmarkResponseSchema = z.object({
  percentile: z.number(),
  totalInIndustry: z.number().int().min(0),
  comparison: z.object({
    avgATSScore: z.number(),
    yourATSScore: z.number(),
    avgViews: z.number(),
    yourViews: z.number(),
    avgStructuredItemCount: z.number(),
    yourStructuredItemCount: z.number(),
    avgCareerDepthYears: z.number(),
    yourCareerDepthYears: z.number(),
  }),
  topPerformers: z.object({
    commonKeywords: z.array(z.string()),
    avgCareerDepthYears: z.number(),
    avgStructuredItemCount: z.number(),
    commonCredentials: z.array(z.string()),
  }),
  recommendations: z.array(BenchmarkRecommendationSchema),
});

export const DashboardRecommendationSchema = z.object({
  type: z.enum(['add_section', 'improve_content', 'add_keywords', 'optimize_format']),
  priority: z.enum(['high', 'medium', 'low']),
  message: z.string(),
});

export const AnalyticsDashboardResponseSchema = z.object({
  resumeId: z.string(),
  overview: z.object({
    totalViews: z.number().int().min(0),
    uniqueVisitors: z.number().int().min(0),
    atsScore: z.number().int(),
    keywordScore: z.number().int(),
    industryPercentile: z.number(),
  }),
  viewTrend: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  topSources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  keywordHealth: z.object({
    score: z.number(),
    topKeywords: z.array(z.string()),
    missingCritical: z.array(z.string()),
  }),
  industryPosition: z.object({
    percentile: z.number(),
    trend: z.enum(['improving', 'stable', 'declining']),
  }),
  recommendations: z.array(DashboardRecommendationSchema),
});

export const AnalyticsSnapshotResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  atsScore: z.number().int(),
  keywordScore: z.number().int(),
  completenessScore: z.number().int(),
  industryRank: z.number().int().optional(),
  totalInIndustry: z.number().int().optional(),
  topKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  createdAt: IsoDateTimeSchema,
});

export const AnalyticsHistoryResponseSchema = z.array(AnalyticsSnapshotResponseSchema);

export const ScoreProgressionResponseSchema = z.object({
  snapshots: z.array(
    z.object({
      date: IsoDateTimeSchema,
      score: z.number().int(),
    }),
  ),
  trend: z.enum(['improving', 'stable', 'declining']),
  changePercent: z.number(),
});
