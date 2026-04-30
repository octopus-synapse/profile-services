/**
 * Route descriptors for the shadow-profile BC. Replaces
 * `ShadowProfileController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { ShadowProfileService } from './shadow-profile.service';

const UpsertGithubBody = z.object({
  token: z.string(),
  username: z.string(),
});

const FindCandidatesQuery = z.object({
  email: z.string().optional(),
  githubLogin: z.string().optional(),
});

const ShadowProfileIdParam = z.object({ id: z.string() });

export const shadowProfileRoutes: ReadonlyArray<Route<ShadowProfileService>> = [
  {
    method: 'POST',
    path: '/v1/shadow-profiles/github',
    auth: { kind: 'jwt' },
    permission: Permission.USER_MANAGE,
    body: UpsertGithubBody,
    openapi: {
      summary:
        'Admin: build or refresh a GitHub-based shadow profile. Call once per login; idempotent.',
      tags: ['shadow-profile'],
      description: 'Shadow Profile API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const body = ctx.body as z.infer<typeof UpsertGithubBody>;
      const snapshot = await service.upsertGithub({
        token: body.token,
        username: body.username,
      });
      return { success: true, data: snapshot };
    },
  },
  {
    method: 'GET',
    path: '/v1/shadow-profiles/candidates',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    query: FindCandidatesQuery,
    openapi: {
      summary:
        'Find unclaimed shadow profiles matching an email and/or github login. Used by the signup flow.',
      tags: ['shadow-profile'],
      description: 'Shadow Profile API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const q = ctx.query as z.infer<typeof FindCandidatesQuery>;
      const rows = await service.findCandidatesFor({ email: q.email, githubLogin: q.githubLogin });
      return { success: true, data: { candidates: rows } };
    },
  },
  {
    method: 'POST',
    path: '/v1/shadow-profiles/:id/claim',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    params: ShadowProfileIdParam,
    openapi: {
      summary: 'Claim a shadow profile as the authenticated user. One-shot — cannot be undone.',
      tags: ['shadow-profile'],
      description: 'Shadow Profile API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { id } = ctx.params as { id: string };
      const claimed = await service.claimForUser(id, ctx.user!.userId);
      return { success: true, data: claimed };
    },
  },
];
