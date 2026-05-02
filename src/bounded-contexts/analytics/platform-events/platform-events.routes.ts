/**
 * Route descriptors for the platform-events submodule. Replaces
 * `PlatformEventsController`. Bundle token is the
 * `TrackPlatformEventsUseCase` itself since this submodule has a
 * single use-case dependency surface.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { TrackPlatformEventsUseCase } from './application/use-cases/track-platform-events/track-platform-events.use-case';

const PlatformEventSchema = z.object({
  event: z.string().min(1).max(120),
  props: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime(),
});

const TrackEventsBodySchema = z.object({
  events: z.array(PlatformEventSchema).min(1).max(100),
});

// ─── Response schemas ─────────────────────────────────────────────────
// JSON Schema fragment for an event's `propsSchema`. Bounded-depth so the
// OpenAPI generator can serialize it.
const JsonLeafSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const PropsSchemaPropertySchema = z.object({
  type: z.string().optional(),
  description: z.string().optional(),
  enum: z.array(JsonLeafSchema).optional(),
});
const PropsSchemaSchema = z.object({
  type: z.string(),
  properties: z.record(z.string(), PropsSchemaPropertySchema).optional(),
  required: z.array(z.string()).optional(),
});

const PlatformEventCatalogEntrySchema = z.object({
  name: z.string(),
  version: z.number().int(),
  propsSchema: PropsSchemaSchema,
  requiredContext: z.array(z.string()).optional(),
  piiFields: z.array(z.string()).optional(),
});

const PlatformEventCatalogResponseSchema = z.object({
  events: z.array(PlatformEventCatalogEntrySchema),
});

const TrackEventsResponseSchema = z.object({
  accepted: z.number().int().min(0),
});

/**
 * Static catalog of analytics events the frontend may emit.
 *
 * Each entry carries `{name, version, propsSchema, requiredContext?, piiFields?}`.
 * The frontend uses this catalog to validate event payloads at the call
 * site (and refuse to emit events the backend doesn't know about).
 */
const EVENT_CATALOG = [
  {
    name: 'page_view',
    version: 1,
    propsSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'job_viewed',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { jobId: { type: 'string' }, source: { type: 'string' } },
      required: ['jobId'],
    },
  },
  {
    name: 'job_bookmarked',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { jobId: { type: 'string' } },
      required: ['jobId'],
    },
  },
  {
    name: 'job_apply_started',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { jobId: { type: 'string' } },
      required: ['jobId'],
    },
  },
  {
    name: 'job_apply_completed',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { jobId: { type: 'string' }, resumeId: { type: 'string' } },
      required: ['jobId'],
    },
  },
  {
    name: 'resume_created',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { resumeId: { type: 'string' } },
      required: ['resumeId'],
    },
  },
  {
    name: 'resume_exported',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { resumeId: { type: 'string' }, format: { type: 'string' } },
      required: ['resumeId', 'format'],
    },
  },
  {
    name: 'onboarding_step_complete',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { stepKey: { type: 'string' } },
      required: ['stepKey'],
    },
  },
  {
    name: 'feed_post_liked',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { postId: { type: 'string' } },
      required: ['postId'],
    },
  },
  {
    name: 'feed_post_bookmarked',
    version: 1,
    propsSchema: {
      type: 'object',
      properties: { postId: { type: 'string' } },
      required: ['postId'],
    },
  },
] as const;

export const platformEventsRoutes: ReadonlyArray<Route<TrackPlatformEventsUseCase>> = [
  {
    method: 'GET',
    path: '/v1/events/schemas',
    auth: { kind: 'jwt' },
    response: PlatformEventCatalogResponseSchema,
    openapi: {
      summary: 'Catalog of allowed analytics events',
      tags: ['platform-events'],
      description:
        'Returns `{events:[{name,version,propsSchema,requiredContext?,piiFields?}]}`. The frontend uses this to know which event names + prop shapes are valid before emitting.',
    },
    sdk: { exported: true },
    handler: async () => ({
      events: EVENT_CATALOG.map((e) => ({ ...e })),
    }),
  },
  {
    method: 'POST',
    path: '/v1/events',
    auth: { kind: 'jwt' },
    body: TrackEventsBodySchema,
    response: TrackEventsResponseSchema,
    openapi: {
      summary: 'Ingest a batch of product events',
      tags: ['platform-events'],
      description:
        'Accepts up to 100 events per request. Events are stored as-is; props is free-form JSON. The expected event names + shapes are listed by `/v1/events/schemas`.',
    },
    sdk: { exported: true },
    handler: async (ctx, useCase) => {
      const body = ctx.body as z.infer<typeof TrackEventsBodySchema>;
      return useCase.execute(ctx.user!.userId ?? null, body);
    },
  },
];
