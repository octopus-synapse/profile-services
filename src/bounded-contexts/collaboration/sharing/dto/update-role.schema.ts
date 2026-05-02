import { z } from 'zod';
import { CollaboratorRoleSchema } from '@/bounded-contexts/collaboration/shared-kernel/domain/enums';

const UpdateRoleSchema = z.object({ role: CollaboratorRoleSchema });

export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;
