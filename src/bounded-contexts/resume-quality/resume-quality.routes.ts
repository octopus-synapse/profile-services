/**
 * Route descriptors for the resume-quality BC. Replaces
 * `ResumeQualityController`. Pure data + handler closures over
 * `ResumeQualityUseCases`.
 */

import { negotiateLocale } from '@/bounded-contexts/platform/i18n/application/locale-negotiator';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { ResumeQualityUseCases } from './application/ports/resume-quality.port';
import { ResumeQualitySnapshotMissingException } from './domain/exceptions/resume-quality.exceptions';
import { toQualitySnapshotResponseDto } from './infrastructure/presenters/resume-quality.presenter';
import { ResumeIdParams, ResumeQualityResponseSchema } from './resume-quality.routes.schemas';

/** Resolve the response locale from the request's Accept-Language. */
function localeOf(ctx: { headers: Record<string, string | string[] | undefined> }) {
  const header = ctx.headers['accept-language'];
  return negotiateLocale(Array.isArray(header) ? header[0] : header).locale;
}

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
      return toQualitySnapshotResponseDto(snapshot, localeOf(ctx));
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
      return toQualitySnapshotResponseDto(snapshot, localeOf(ctx));
    },
  },
];
