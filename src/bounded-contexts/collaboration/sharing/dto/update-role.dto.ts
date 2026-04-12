import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CollaboratorRoleSchema } from '@/bounded-contexts/collaboration/shared-kernel/domain/enums';

const UpdateRoleSchema = z.object({
  role: CollaboratorRoleSchema,
});

export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {}
