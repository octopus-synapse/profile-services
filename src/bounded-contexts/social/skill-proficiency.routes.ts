/**
 * Route descriptors for the social BC's self-declared skill proficiency
 * surface. Replaces `SkillProficiencyController`.
 *
 * Note: the legacy DELETE returned `204 No Content`. The Route
 * synthesizer always uses 200 for non-POST verbs today, so this
 * migration changes the success status code to 200 with an explicit
 * `{ success: true }` body.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import type { SkillProficiencyService } from './services/skill-proficiency.service';

export abstract class SkillProficiencyRoutesBundle {
  abstract readonly service: SkillProficiencyService;
}

const SkillNameParam = z.object({ skillName: z.string() });
const SetProficiencyBody = z.object({
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
});

const SkillProficiencyEntrySchema = z.object({
  skillName: z.string(),
  proficiency: z.string(),
  yearsOfExperience: z.number().int().nullable(),
  updatedAt: z.string().datetime(),
});

const ListProficiencyResponseSchema = z.object({
  proficiencies: z.array(SkillProficiencyEntrySchema),
});

const SetProficiencyResponseSchema = z.object({
  skillName: z.string(),
  proficiency: z.string(),
});

const ClearProficiencyResponseSchema = z.null();

export const skillProficiencyRoutes: ReadonlyArray<Route<SkillProficiencyRoutesBundle>> = [
  {
    method: 'GET',
    path: '/v1/me/skill-proficiency',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    response: ListProficiencyResponseSchema,
    openapi: {
      summary: 'List my declared skill proficiencies.',
      tags: ['skills'],
      description: 'Self-declared skill proficiency',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const proficiencies = await bundle.service.listForUser(ctx.user!.userId);
      return { proficiencies };
    },
  },
  {
    method: 'PUT',
    path: '/v1/me/skill-proficiency/:skillName',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    params: SkillNameParam,
    body: SetProficiencyBody,
    response: SetProficiencyResponseSchema,
    openapi: {
      summary: 'Set proficiency for a skill (creates if missing).',
      tags: ['skills'],
      description: 'Self-declared skill proficiency',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { skillName } = ctx.params as { skillName: string };
      const body = ctx.body as z.infer<typeof SetProficiencyBody>;
      const result = await bundle.service.setForUser(
        ctx.user!.userId,
        skillName,
        body.proficiency,
        body.yearsOfExperience ?? null,
      );
      return result;
    },
  },
  {
    method: 'DELETE',
    path: '/v1/me/skill-proficiency/:skillName',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    params: SkillNameParam,
    response: ClearProficiencyResponseSchema,
    openapi: {
      summary: 'Clear proficiency for a skill.',
      tags: ['skills'],
      description: 'Self-declared skill proficiency',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { skillName } = ctx.params as { skillName: string };
      await bundle.service.clearForUser(ctx.user!.userId, skillName);
      return undefined;
    },
  },
];
