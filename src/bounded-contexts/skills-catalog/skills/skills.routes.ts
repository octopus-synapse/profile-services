/**
 * Route descriptors for the skills BC. Replaces
 * `SkillManagementController`. The dynamic two-arg `RequirePermission`
 * usages on the original controller are encoded as the equivalent
 * `Permission` enum members here, which the synthesizer wires through
 * the standard `RequirePermission` decorator.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { SkillsUseCases } from './application/ports/skills.port';
import type { CreateSkillData, UpdateSkillData } from './domain/ports/skill-management.port';

const ResumeIdParams = z.object({ resumeId: z.string() });
const SkillRefParams = z.object({ resumeId: z.string(), skillId: z.string() });

const CreateSkillBody = z.object({
  name: z.string(),
  category: z.string(),
  level: z.number().int().optional(),
});

const UpdateSkillBody = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  level: z.number().int().optional(),
});

export const skillsRoutes: ReadonlyArray<Route<SkillsUseCases>> = [
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/skills',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: ResumeIdParams,
    body: CreateSkillBody,
    openapi: {
      summary: 'Add a skill to a resume',
      tags: ['Resume Skills'],
      description: 'Skill created',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const skill = await bc.addSkill.execute(resumeId, ctx.body as CreateSkillData);
      return { success: true, data: { skill } };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/skills',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParams,
    openapi: {
      summary: 'List skills for a resume',
      tags: ['Resume Skills'],
      description: 'Skills returned',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const skills = await bc.listSkillsForResume.execute(resumeId);
      return { success: true, data: { skills } };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/resumes/:resumeId/skills/:skillId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: SkillRefParams,
    body: UpdateSkillBody,
    openapi: {
      summary: 'Update a resume skill',
      tags: ['Resume Skills'],
      description: 'Skill updated',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { skillId } = ctx.params as { resumeId: string; skillId: string };
      const skill = await bc.updateSkill.execute(skillId, ctx.body as UpdateSkillData);
      return { success: true, data: { skill } };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/:resumeId/skills/:skillId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: SkillRefParams,
    openapi: {
      summary: 'Delete a resume skill',
      tags: ['Resume Skills'],
      description: 'Skill deleted',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { skillId } = ctx.params as { resumeId: string; skillId: string };
      await bc.deleteSkill.execute(skillId);
      return { success: true, data: { result: { deleted: true } } };
    },
  },
];
