/**
 * Route descriptors for the social BC's skill-endorsement surface.
 * Replaces `SkillEndorsementController`.
 */

import { z } from 'zod';
import type { SkillEndorsementService } from './services/skill-endorsement.service';

export abstract class SkillEndorsementRoutesBundle {
  abstract readonly service: SkillEndorsementService;
}

export const UserIdParam = z.object({ userId: z.string() });
export const UserIdAndSkillParam = z.object({ userId: z.string(), skill: z.string() });
export const PageQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

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
  endorsedAt: z.string().datetime(),
});

// Legacy `{ data, total, page, limit, totalPages }` shape (matches the
// existing `ActivityPaginatedSchema` envelope used by the social BC).
export const EndorsersListResponseSchema = z.object({
  data: z.array(EndorserSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});
