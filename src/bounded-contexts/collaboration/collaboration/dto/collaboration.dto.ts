/**
 * Collaboration DTOs
 *
 * Data Transfer Objects for collaboration API.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CollaboratorRoleSchema } from '@/bounded-contexts/collaboration/domain/enums';

// ============================================================================
// Schemas
// ============================================================================

const InviteCollaboratorSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: CollaboratorRoleSchema,
});

const UpdateRoleSchema = z.object({
  role: CollaboratorRoleSchema,
});

// ============================================================================
// DTOs
// ============================================================================

export class InviteCollaboratorDto extends createZodDto(InviteCollaboratorSchema) {}
export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {}
