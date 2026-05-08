/**
 * Route descriptors for the resume-versions BC. Replaces the read-only
 * version endpoints in `ResumeVersionController` and the entire
 * `ResumeTailorController` — including `POST .../tailor`. The
 * `RequireFitProfileGuard` + `RequireMinQualityGuard` chain is wired
 * via the synthesizer guard registry under ids `fit-profile` and
 * `min-quality`. The min-quality metadata (threshold + resume-param
 * name) is forwarded as `route.guards[*].metadata` and mapped to the
 * Reflector keys the guard reads.
 */

import { z } from 'zod';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route.types';
import { ResumeVersionsUseCases } from './application/ports/resume-versions.port';
import { toVersionIsoList } from './infrastructure/presenters/resume-version.presenter';
import {
  ResumeIdAndVersionIdParam,
  ResumeIdParam,
  ResumeVersionResponseSchema,
  ResumeVersionRestoreResponseSchema,
  ResumeVersionsResponseSchema,
  TailoredVersionDiffResponseSchema,
  TailoredVersionsResponseSchema,
  TailorResumeBody,
  TailorResumeResponseSchema,
  VersionIdQuery,
} from './resume-versions.routes.schemas';

export const resumeVersionsRoutes: ReadonlyArray<Route<ResumeVersionsUseCases>> = [
  // ─── Resume versions (nested + flat routes) ───────────────────────
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/versions',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    response: ResumeVersionsResponseSchema,
    openapi: {
      summary: 'List resume versions (nested route)',
      tags: ['resume-versions'],
      description: 'Resume versions returned',
    },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const versions = await bc.getVersions.execute(resumeId, ctx.user!.userId);
      return { versions: toVersionIsoList(versions) };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/versions/:versionId/restore',
    auth: { kind: 'jwt' },
    params: ResumeIdAndVersionIdParam,
    response: ResumeVersionRestoreResponseSchema,
    openapi: {
      summary: 'Restore resume version (nested route)',
      tags: ['resume-versions'],
      description: 'Resume version restored',
    },
    handler: async (ctx, bc) => {
      const { resumeId, versionId } = ctx.params as { resumeId: string; versionId: string };
      const restored = await bc.restoreVersion.execute(resumeId, versionId, ctx.user!.userId);
      return { restoredFrom: restored.restoredFrom.toISOString() };
    },
  },
  {
    method: 'GET',
    path: '/v1/versions/:resumeId',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    response: ResumeVersionsResponseSchema,
    openapi: {
      summary: 'List resume versions',
      tags: ['resume-versions'],
      description: 'Resume versions returned',
    },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const versions = await bc.getVersions.execute(resumeId, ctx.user!.userId);
      return { versions: toVersionIsoList(versions) };
    },
  },
  {
    method: 'GET',
    path: '/v1/versions/:resumeId/:versionId',
    auth: { kind: 'jwt' },
    params: ResumeIdAndVersionIdParam,
    response: ResumeVersionResponseSchema,
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
        throw new EntityNotFoundException('ResumeVersion', versionId);
      }
      return {
        version: { ...version, createdAt: version.createdAt.toISOString() },
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/versions/:resumeId/restore/:versionId',
    auth: { kind: 'jwt' },
    params: ResumeIdAndVersionIdParam,
    response: ResumeVersionRestoreResponseSchema,
    openapi: {
      summary: 'Restore resume version',
      tags: ['resume-versions'],
      description: 'Resume version restored',
    },
    handler: async (ctx, bc) => {
      const { resumeId, versionId } = ctx.params as { resumeId: string; versionId: string };
      const restored = await bc.restoreVersion.execute(resumeId, versionId, ctx.user!.userId);
      return { restoredFrom: restored.restoredFrom.toISOString() };
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
    response: TailoredVersionsResponseSchema,
    openapi: {
      summary: 'List tailored resume variants produced by the AI.',
      tags: ['resume-tailor'],
      description: 'All tailored variants the user has generated so far.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const versions = await bc.getTailoredVersions.execute(resumeId, ctx.user!.userId);
      return { versions: toVersionIsoList(versions) };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/diff',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    query: VersionIdQuery,
    response: TailoredVersionDiffResponseSchema,
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
      return diff;
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/tailor',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    body: TailorResumeBody,
    statusCode: 200,
    guards: [
      { id: 'fit-profile' },
      { id: 'min-quality', metadata: { min: 50, resumeParam: 'resumeId' } },
      { id: 'external-api' },
    ],
    response: TailorResumeResponseSchema,
    openapi: {
      summary: 'Rewrite this resume for a specific job using the AI pipeline.',
      tags: ['resume-tailor'],
      description: 'Resume AI tailoring API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const body = ctx.body as z.infer<typeof TailorResumeBody>;
      const data = (await bc.tailorResumeForJob.execute({
        resumeId,
        userId: ctx.user!.userId,
        jobId: body?.jobId,
        jobDescription: body?.jobDescription,
        jobTitle: body?.jobTitle,
        jobCompany: body?.jobCompany,
      })) as Record<string, unknown>;

      // Convert the legacy `{bullets:[{id,original,tailored,highlights}], summary, jobTitle}`
      // into a JSON-Patch-like `changes[]` so the frontend renders a generic
      // diff UI without per-field mapping.
      const bullets =
        (data.bullets as Array<{
          id: string;
          original: string;
          tailored: string;
          highlights?: string[];
        }>) ?? [];
      const changes: Array<{
        path: ReadonlyArray<string | number>;
        op: 'add' | 'remove' | 'replace';
        before?: unknown;
        after?: unknown;
        highlights?: readonly string[];
      }> = [];
      if (typeof data.summary === 'string') {
        changes.push({ path: ['summary'], op: 'replace', after: data.summary });
      }
      if (typeof data.jobTitle === 'string') {
        changes.push({ path: ['jobTitle'], op: 'replace', after: data.jobTitle });
      }
      bullets.forEach((b, i) => {
        changes.push({
          path: ['bullets', i],
          op: b.original ? 'replace' : 'add',
          before: b.original || undefined,
          after: b.tailored,
          highlights: b.highlights ?? [],
        });
      });

      return {
        ...data,
        changes,
      };
    },
  },
];
