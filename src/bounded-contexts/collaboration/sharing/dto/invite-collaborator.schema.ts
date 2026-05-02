import { z } from 'zod';
import { CollaboratorRoleSchema } from '@/bounded-contexts/collaboration/shared-kernel/domain/enums';

const InviteCollaboratorSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: CollaboratorRoleSchema,
});

export type InviteCollaboratorDto = z.infer<typeof InviteCollaboratorSchema>;
