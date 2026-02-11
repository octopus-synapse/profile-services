/**
 * Collaboration DTOs
 *
 * Data Transfer Objects for collaboration API.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import type { CollaboratorRole } from '@/shared-kernel';

/**
 * Valid collaborator roles for API
 */
const VALID_ROLES = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

/**
 * Invite collaborator request DTO
 */
export class InviteCollaboratorDto {
  @ApiProperty({
    description: 'User ID to invite as collaborator',
    example: 'user-uuid-v4',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'Role to assign to the collaborator',
    enum: VALID_ROLES,
    example: 'EDITOR',
  })
  @IsIn(VALID_ROLES)
  role!: CollaboratorRole;
}

/**
 * Update collaborator role DTO
 */
export class UpdateRoleDto {
  @ApiProperty({
    description: 'New role for the collaborator',
    enum: VALID_ROLES,
    example: 'VIEWER',
  })
  @IsIn(VALID_ROLES)
  role!: CollaboratorRole;
}
