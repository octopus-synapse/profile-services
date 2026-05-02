/**
 * Route descriptors for the resume-quality BC. Replaces
 * `ResumeQualityController`. Pure data + handler closures over
 * `ResumeQualityUseCases`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { ResumeQualityUseCases } from './application/ports/resume-quality.port';
import { ResumeQualitySnapshotMissingException } from './domain/exceptions/resume-quality.exceptions';
import { presentQualitySnapshot } from './infrastructure/presenters/resume-quality.presenter';

const ResumeIdParams = z.object({ resumeId: z.string() });

// ─── Response schemas ─────────────────────────────────────────────────
const QualityIssueContextSchema = z.object({
  sectionKey: z.string().optional(),
  itemIndex: z.number().int().optional(),
  excerpt: z.string().optional(),
});

const QualityIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  messageArgs: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  freeformMessage: z.string().optional(),
  context: QualityIssueContextSchema.optional(),
});

const ResumeQualityResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  overallScore: z.number().int().min(0).max(100),
  completenessScore: z.number().int().min(0).max(100),
  contentQualityScore: z.number().int().min(0).max(100).nullable(),
  issues: z.array(QualityIssueSchema),
  scoringRulesVersion: z.string(),
  aiPromptVersion: z.string().nullable(),
  computedAt: z.string().datetime(),
});

export const resumeQualityRoutes: ReadonlyArray<Route<ResumeQualityUseCases>> = [
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/quality',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParams,
    response: ResumeQualityResponseSchema,
    openapi: {
      summary: 'Get the latest Resume Quality Score snapshot',
      tags: ['resume-quality'],
      description: 'Resume Quality Score',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const snapshot = await bc.getLatestQuality.execute(resumeId);
      if (!snapshot) throw new ResumeQualitySnapshotMissingException();
      return presentQualitySnapshot(snapshot);
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/quality/recompute',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: ResumeIdParams,
    response: ResumeQualityResponseSchema,
    openapi: {
      summary: 'Synchronously recompute Resume Quality Score',
      tags: ['resume-quality'],
      description: 'Resume Quality Score',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const snapshot = await bc.computeQuality.execute(resumeId);
      return presentQualitySnapshot(snapshot);
    },
  },
];
