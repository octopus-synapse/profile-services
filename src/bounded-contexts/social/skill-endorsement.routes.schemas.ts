/**
 * Route descriptors for the social BC's skill-endorsement surface.
 * Replaces `SkillEndorsementController`.
 */

import { z } from 'zod';
import {
  PaginatedResponseSchema,
  PaginationQuerySchema,
} from '@/shared-kernel/schemas/common/api.types';
import { UserIdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import type { SkillEndorsementService } from './services/skill-endorsement.service';

export abstract class SkillEndorsementRoutesBundle {
  abstract readonly service: SkillEndorsementService;
}

export const UserIdParam = UserIdParamSchema;
export const UserIdAndSkillParam = UserIdParamSchema.extend({ skill: z.string() });
export const PageQuery = PaginationQuerySchema;

// ─── Response schemas ────────────────────────────────────────────────
export const UserSkillSummarySchema = z.object({
  skill: z.string(),
  endorsementCount: z.number().int().min(0),
  endorsedByMe: z.boolean(),
});

export const UserSkillsResponseSchema = z.object({
  skills: z.array(UserSkillSummarySchema),
});

// `endorse` and `withdraw` return the same `UserSkillSummary` shape.
export const EndorsementMutationResponseSchema = UserSkillSummarySchema;

export const EndorserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
  endorsedAt: IsoDateTimeSchema,
});

export const EndorsersListResponseSchema = PaginatedResponseSchema(EndorserSchema);
