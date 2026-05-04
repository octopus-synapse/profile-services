/**
 * Route descriptors for the resume-quality BC. Replaces
 * `ResumeQualityController`. Pure data + handler closures over
 * `ResumeQualityUseCases`.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { ResumeQualityUseCases } from './application/ports/resume-quality.port';
import { ResumeQualitySnapshotMissingException } from './domain/exceptions/resume-quality.exceptions';
import { presentQualitySnapshot } from './infrastructure/presenters/resume-quality.presenter';
import {
  ResumeIdParams,
  ResumeQualityResponseSchema,
} from './resume-quality.routes.schemas';

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
