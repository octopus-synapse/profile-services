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

export const resumeQualityRoutes: ReadonlyArray<Route<ResumeQualityUseCases>> = [
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/quality',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParams,
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
      return { success: true, data: presentQualitySnapshot(snapshot) };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/quality/recompute',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: ResumeIdParams,
    openapi: {
      summary: 'Synchronously recompute Resume Quality Score',
      tags: ['resume-quality'],
      description: 'Resume Quality Score',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const snapshot = await bc.computeQuality.execute(resumeId);
      return { success: true, data: presentQualitySnapshot(snapshot) };
    },
  },
];
