/**
 * Collaboration DTOs
 *
 * Data Transfer Objects for collaboration API.
 */

import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { CollaboratorRole } from '@/shared-kernel';

/**
 * Valid collaborator roles for API
 */
const VALID_ROLES = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

/**
 * Zod schema for inviting collaborator
 */
const InviteCollaboratorSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({ message: 'Role must be VIEWER, EDITOR, or ADMIN' }),
  }),
});

/**
 * Zod schema for updating collaborator role
 */
const UpdateRoleSchema = z.object({
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({ message: 'Role must be VIEWER, EDITOR, or ADMIN' }),
  }),
});

/**
 * Invite collaborator request DTO
 */
export class InviteCollaboratorDto extends createZodDto(InviteCollaboratorSchema) {
  @ApiProperty({
    description: 'User ID to invite as collaborator',
    example: 'user-uuid-v4',
  })
  userId!: string;

  @ApiProperty({
    description: 'Role to assign to the collaborator',
    enum: VALID_ROLES,
    example: 'EDITOR',
  })
  role!: CollaboratorRole;
}

/**
 * Update collaborator role DTO
 */
export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {
  @ApiProperty({
    description: 'New role for the collaborator',
    enum: VALID_ROLES,
    example: 'VIEWER',
  })
  role!: CollaboratorRole;
}
