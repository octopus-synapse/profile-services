/**
 * Route descriptors for the resume-versions BC. Replaces the read-only
 * version endpoints in `ResumeVersionController` and the two GET
 * endpoints in `ResumeTailorController`. The `POST .../tailor` route
 * stays in `ResumeTailorController` because it relies on the custom
 * `RequireFitProfileGuard` + `RequireMinQualityGuard` chain that the
 * synthesizer cannot model yet.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { ResumeVersionsUseCases } from './application/ports/resume-versions.port';
import { toVersionIsoList } from './infrastructure/presenters/resume-version.presenter';

const ResumeIdParam = z.object({ resumeId: z.string() });
const ResumeIdAndVersionIdParam = z.object({
  resumeId: z.string(),
  versionId: z.string(),
});

const VersionIdQuery = z.object({ versionId: z.string() });

export const resumeVersionsRoutes: ReadonlyArray<Route<ResumeVersionsUseCases>> = [
  // ─── Resume versions (nested + flat routes) ───────────────────────
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/versions',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    openapi: {
      summary: 'List resume versions (nested route)',
      tags: ['resume-versions'],
      description: 'Resume versions returned',
    },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const versions = await bc.getVersions.execute(resumeId, ctx.user!.userId);
      return { success: true, data: { versions: toVersionIsoList(versions) } };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/versions/:versionId/restore',
    auth: { kind: 'jwt' },
    params: ResumeIdAndVersionIdParam,
    openapi: {
      summary: 'Restore resume version (nested route)',
      tags: ['resume-versions'],
      description: 'Resume version restored',
    },
    handler: async (ctx, bc) => {
      const { resumeId, versionId } = ctx.params as { resumeId: string; versionId: string };
      const restored = await bc.restoreVersion.execute(resumeId, versionId, ctx.user!.userId);
      return {
        success: true,
        data: { success: true, restoredFrom: restored.restoredFrom.toISOString() },
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/versions/:resumeId',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    openapi: {
      summary: 'List resume versions',
      tags: ['resume-versions'],
      description: 'Resume versions returned',
    },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const versions = await bc.getVersions.execute(resumeId, ctx.user!.userId);
      return { success: true, data: { versions: toVersionIsoList(versions) } };
    },
  },
  {
    method: 'GET',
    path: '/v1/versions/:resumeId/:versionId',
    auth: { kind: 'jwt' },
    params: ResumeIdAndVersionIdParam,
    openapi: {
      summary: 'Get a specific resume version',
      tags: ['resume-versions'],
      description: 'Resume version returned',
    },
    handler: async (ctx, bc) => {
      const { resumeId, versionId } = ctx.params as { resumeId: string; versionId: string };
      const versions = await bc.getVersions.execute(resumeId, ctx.user!.userId);
      const version = versions.find((v) => v.id === versionId);
      if (!version) {
        const { NotFoundException } = await import('@nestjs/common');
        throw new NotFoundException('Version not found');
      }
      return {
        success: true,
        data: {
          version: { ...version, createdAt: version.createdAt.toISOString() },
        },
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/versions/:resumeId/restore/:versionId',
    auth: { kind: 'jwt' },
    params: ResumeIdAndVersionIdParam,
    openapi: {
      summary: 'Restore resume version',
      tags: ['resume-versions'],
      description: 'Resume version restored',
    },
    handler: async (ctx, bc) => {
      const { resumeId, versionId } = ctx.params as { resumeId: string; versionId: string };
      const restored = await bc.restoreVersion.execute(resumeId, versionId, ctx.user!.userId);
      return {
        success: true,
        data: { success: true, restoredFrom: restored.restoredFrom.toISOString() },
      };
    },
  },

  // ─── Tailored versions (read-only; tailor POST stays in legacy
  //     controller because of `RequireFitProfileGuard` +
  //     `RequireMinQualityGuard`). ─────────────────────────────────
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/tailored-versions',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    openapi: {
      summary: 'List tailored resume variants produced by the AI.',
      tags: ['resume-tailor'],
      description: 'All tailored variants the user has generated so far.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const versions = await bc.getTailoredVersions.execute(resumeId, ctx.user!.userId);
      return { success: true, data: { versions: toVersionIsoList(versions) } };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/diff',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    query: VersionIdQuery,
    openapi: {
      summary: 'Structured diff between the master resume and a tailored version.',
      tags: ['resume-tailor'],
      description: 'Summary / jobTitle / bullets before → after shape.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const { versionId } = ctx.query as { versionId: string };
      const diff = await bc.getTailoredVersionDiff.execute(resumeId, versionId, ctx.user!.userId);
      return { success: true, data: diff };
    },
  },
];
