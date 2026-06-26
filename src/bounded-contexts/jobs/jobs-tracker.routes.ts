/**
 * Job application-tracker + URL-import route descriptors.
 *
 * Split out of `jobs.routes.ts` to keep each file within the file-size
 * budget. Covers the two non-catalog sub-resources: the application
 * timeline tracker (`/v1/jobs/applications/*`) and the rate-limited
 * URL-import preview (`/v1/jobs/import-from-url`). The `jobs.composition`
 * concatenates these after the core `jobsRoutes`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { JobsUseCases } from './application/ports/jobs.port';
import { RecordApplicationEventSchema } from './dto/application-event.schema';
import { ImportJobFromUrlSchema } from './dto/job.schema';
import {
  ApplicationIdParam,
  ApplicationsTimelineResponseSchema,
  CompanyParam,
  CompanyResponseStatsResponseSchema,
  ImportJobFromUrlResponseSchema,
  RecordApplicationEventResponseSchema,
  TrackerQuerySchema,
} from './jobs.routes.schemas';

export const jobsTrackerRoutes: ReadonlyArray<Route<JobsUseCases>> = [
  // ─── Application tracker ──────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/jobs/applications/tracker',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: TrackerQuerySchema,
    response: ApplicationsTimelineResponseSchema,
    openapi: {
      summary:
        'Full application timeline for the viewer (enviada → visualizada → entrevista → oferta/silêncio).',
      tags: ['application-tracker'],
      description: 'Timeline + silence detection for job applications',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = TrackerQuerySchema.parse(ctx.query);
      const threshold = q.silentDays ? Math.max(1, Number(q.silentDays)) : 10;
      const applications = await bc.listApplicationTimeline.execute(ctx.user!.userId, threshold);
      return { applications };
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/applications/:applicationId/events',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: ApplicationIdParam,
    body: RecordApplicationEventSchema,
    response: RecordApplicationEventResponseSchema,
    openapi: {
      summary:
        'Record a timeline event on an application (viewed, interview scheduled, offer, etc.).',
      tags: ['application-tracker'],
      description: 'Timeline + silence detection for job applications',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { applicationId } = ctx.params as { applicationId: string };
      const body = ctx.body as z.infer<typeof RecordApplicationEventSchema>;
      const event = await bc.recordApplicationEvent.execute({
        applicationId,
        userId: ctx.user!.userId,
        type: body.type,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
        note: body.note,
      });
      return event;
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/applications/companies/:company/response-stats',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: CompanyParam,
    response: CompanyResponseStatsResponseSchema,
    openapi: {
      summary: 'Per-company response percentiles (p50/p90 days to first response).',
      tags: ['application-tracker'],
      description: 'Timeline + silence detection for job applications',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { company } = ctx.params as { company: string };
      return bc.getCompanyResponseStats.execute(company);
    },
  },

  // ─── URL import (rate-limited) ────────────────────────────────────
  {
    method: 'POST',
    path: '/v1/jobs/import-from-url',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    body: ImportJobFromUrlSchema,
    statusCode: 200,
    response: ImportJobFromUrlResponseSchema,
    guards: [
      {
        id: 'rate-limit',
        metadata: { points: 5, duration: 600, keyStrategy: 'user' },
      },
      { id: 'external-api' },
    ],
    openapi: {
      summary: 'Fetch a careers page and return an LLM-extracted job preview (not persisted)',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { url: string };
      return bc.importJobFromUrl.execute(body.url);
    },
  },
];
