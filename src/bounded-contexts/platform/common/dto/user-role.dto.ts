import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

const UserRolesDataSchema = z.object({
  roles: z.array(UserRoleSchema),
});

export class UserRoleResponseDto extends createZodDto(UserRoleSchema) {}
export class UserRolesDataDto extends createZodDto(UserRolesDataSchema) {}
