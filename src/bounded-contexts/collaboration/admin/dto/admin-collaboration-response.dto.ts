import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// --- Collaboration Stats ---

const RoleCountSchema = z.object({
  role: z.string(),
  count: z.number().int(),
});

const AdminCollaborationStatsDataSchema = z.object({
  totalCollaborations: z.number().int(),
  byRole: z.array(RoleCountSchema),
});

export class AdminCollaborationStatsDataDto extends createZodDto(
  AdminCollaborationStatsDataSchema,
) {}

// --- Collaborations List (paginated) ---

const CollaboratorUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

const CollaboratorResumeSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
});

const CollaborationItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  userId: z.string(),
  role: z.string(),
  invitedBy: z.string(),
  invitedAt: z.string().datetime(),
  joinedAt: z.string().datetime().nullable(),
  user: CollaboratorUserSchema,
  resume: CollaboratorResumeSchema,
});

const AdminCollaborationsListDataSchema = z.object({
  items: z.array(CollaborationItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export class AdminCollaborationsListDataDto extends createZodDto(
  AdminCollaborationsListDataSchema,
) {}
