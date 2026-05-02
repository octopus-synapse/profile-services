/**
 * Route descriptors for the social BC's skill-endorsement surface.
 * Replaces `SkillEndorsementController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import type { SkillEndorsementService } from './services/skill-endorsement.service';

export abstract class SkillEndorsementRoutesBundle {
  abstract readonly service: SkillEndorsementService;
}

const UserIdParam = z.object({ userId: z.string() });
const UserIdAndSkillParam = z.object({ userId: z.string(), skill: z.string() });
const PageQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ─── Response schemas ────────────────────────────────────────────────
const UserSkillSummarySchema = z.object({
  skill: z.string(),
  endorsementCount: z.number().int().min(0),
  endorsedByMe: z.boolean(),
});

const UserSkillsResponseSchema = z.object({
  skills: z.array(UserSkillSummarySchema),
});

// `endorse` and `withdraw` return the same `UserSkillSummary` shape.
const EndorsementMutationResponseSchema = UserSkillSummarySchema;

const EndorserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
  endorsedAt: z.string().datetime(),
});

// Legacy `{ data, total, page, limit, totalPages }` shape (matches the
// existing `ActivityPaginatedSchema` envelope used by the social BC).
const EndorsersListResponseSchema = z.object({
  data: z.array(EndorserSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export const skillEndorsementRoutes: ReadonlyArray<Route<SkillEndorsementRoutesBundle>> = [
  {
    method: 'GET',
    path: '/v1/users/:userId/skills',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    response: UserSkillsResponseSchema,
    openapi: {
      summary: 'List a user’s skills with endorsement counts',
      tags: ['skill-endorsements'],
      description: 'Skill endorsements API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const skills = await bundle.service.getUserSkills(userId, ctx.user!.userId);
      return { skills };
    },
  },
  {
    method: 'POST',
    path: '/v1/users/:userId/skills/:skill/endorse',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdAndSkillParam,
    response: EndorsementMutationResponseSchema,
    openapi: {
      summary: 'Endorse a user for a skill',
      tags: ['skill-endorsements'],
      description: 'Skill endorsements API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { userId, skill } = ctx.params as { userId: string; skill: string };
      return bundle.service.endorse(userId, decodeURIComponent(skill), ctx.user!.userId);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/users/:userId/skills/:skill/endorse',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdAndSkillParam,
    response: EndorsementMutationResponseSchema,
    openapi: {
      summary: 'Withdraw a previously given endorsement',
      tags: ['skill-endorsements'],
      description: 'Skill endorsements API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { userId, skill } = ctx.params as { userId: string; skill: string };
      return bundle.service.withdraw(userId, decodeURIComponent(skill), ctx.user!.userId);
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/skills/:skill/endorsers',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdAndSkillParam,
    query: PageQuery,
    response: EndorsersListResponseSchema,
    openapi: {
      summary: 'List endorsers for a specific skill',
      tags: ['skill-endorsements'],
      description: 'Skill endorsements API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { userId, skill } = ctx.params as { userId: string; skill: string };
      const q = ctx.query as z.infer<typeof PageQuery>;
      return bundle.service.getEndorsers(
        userId,
        decodeURIComponent(skill),
        q.page ? Number(q.page) : undefined,
        q.limit ? Number(q.limit) : undefined,
      );
    },
  },
];
