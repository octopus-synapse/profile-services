/**
 * Collaboration DTOs
 *
 * Domain types and validation schemas for resume collaboration features.
 * Supports inviting collaborators, managing roles, and viewing shared resumes.
 */

import { z } from 'zod';
import { CollaboratorRoleSchema } from '../enums';

// ============================================================================
// User Reference (for collaboration context)
// ============================================================================

export const CollaboratorUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type CollaboratorUser = z.infer<typeof CollaboratorUserSchema>;

// ============================================================================
// Collaborator
// ============================================================================

export const CollaboratorSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  userId: z.string(),
  role: CollaboratorRoleSchema,
  user: CollaboratorUserSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Collaborator = z.infer<typeof CollaboratorSchema>;

// ============================================================================
// Shared Resume
// ============================================================================

export const SharedResumeOwnerSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string(),
});

export type SharedResumeOwner = z.infer<typeof SharedResumeOwnerSchema>;

export const SharedResumeSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  ownerId: z.string(),
  owner: SharedResumeOwnerSchema.optional(),
  role: CollaboratorRoleSchema,
  sharedAt: z.string(),
});

export type SharedResume = z.infer<typeof SharedResumeSchema>;

// ============================================================================
// Invite Collaborator Request
// ============================================================================

export const InviteCollaboratorSchema = z.object({
  email: z.string().email(),
  role: CollaboratorRoleSchema,
});

export type InviteCollaborator = z.infer<typeof InviteCollaboratorSchema>;

// ============================================================================
// Update Role Request
// ============================================================================

export const UpdateCollaboratorRoleSchema = z.object({
  role: CollaboratorRoleSchema,
});

export type UpdateCollaboratorRole = z.infer<typeof UpdateCollaboratorRoleSchema>;
