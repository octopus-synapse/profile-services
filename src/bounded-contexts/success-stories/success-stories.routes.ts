/**
 * Route descriptors for the success-stories BC. Replaces
 * `SuccessStoryController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { SuccessStoriesUseCases } from './application/ports/success-stories.port';
import {
  CreateSuccessStorySchema,
  UpdateSuccessStorySchema,
} from './dto/success-story-request.dto';

const IdParam = z.object({ id: z.string() });
const LimitQuery = z.object({ limit: z.string().optional() });

export const successStoriesRoutes: ReadonlyArray<Route<SuccessStoriesUseCases>> = [
  {
    method: 'GET',
    path: '/v1/success-stories',
    auth: { kind: 'public' },
    query: LimitQuery,
    openapi: {
      summary: 'Published success stories for the landing carousel.',
      tags: ['success-stories'],
      description: 'Success stories — public carousel + admin CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { limit } = ctx.query as { limit?: string };
      const stories = await bc.listPublished.execute(limit ? Number(limit) : undefined);
      return { stories };
    },
  },
  {
    method: 'POST',
    path: '/v1/success-stories',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    body: CreateSuccessStorySchema,
    openapi: {
      summary: 'Create a success story (admin).',
      tags: ['success-stories'],
      description: 'Success stories — public carousel + admin CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof CreateSuccessStorySchema>;
      const created = await bc.create.execute(body);
      return { id: created.id };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/success-stories/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParam,
    body: UpdateSuccessStorySchema,
    openapi: {
      summary: 'Update a success story (admin).',
      tags: ['success-stories'],
      description: 'Success stories — public carousel + admin CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof UpdateSuccessStorySchema>;
      const updated = await bc.update.execute(id, body);
      return { id: updated.id };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/success-stories/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParam,
    openapi: {
      summary: 'Delete a success story (admin).',
      tags: ['success-stories'],
      description: 'Success stories — public carousel + admin CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.delete.execute(id);
      return { id };
    },
  },
];
