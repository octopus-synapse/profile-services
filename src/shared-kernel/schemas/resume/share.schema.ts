/**
 * Share DTOs
 *
 * Domain types and validation schemas for resume sharing functionality:
 * - Public share links
 * - Password protection
 * - Expiration dates
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { ResumeSchema } from './resume.types';

// ============================================================================
// Create Share
// ============================================================================

export const CreateShareSchema = z.object({
  resumeId: z.string().cuid(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  password: z.string().min(8).max(100).optional(),
  expiresAt: IsoDateTimeSchema.optional(),
});

export type CreateShare = z.infer<typeof CreateShareSchema>;

// ============================================================================
// Share Response
// ============================================================================

export const ShareResponseSchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  resumeId: z.string().cuid(),
  isActive: z.boolean(),
  hasPassword: z.boolean(),
  expiresAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  publicUrl: z.string().url(),
});

export type ShareResponse = z.infer<typeof ShareResponseSchema>;

// ============================================================================
// Public Resume Access
// ============================================================================

export const PublicResumeOptionsSchema = z.object({ password: z.string().optional() });

export type PublicResumeOptions = z.infer<typeof PublicResumeOptionsSchema>;

export const PublicResumeResponseSchema = z.object({
  resume: ResumeSchema.extend({ resumeSections: ResumeSchema.shape.resumeSections.default([]) }),
  share: z.object({ slug: z.string(), expiresAt: IsoDateTimeSchema.nullable() }),
});

export type PublicResumeResponse = z.infer<typeof PublicResumeResponseSchema>;

export type CreateShareDto = z.infer<typeof CreateShareSchema>;

export type ShareResponseDto = z.infer<typeof ShareResponseSchema>;

export type PublicResumeOptionsDto = z.infer<typeof PublicResumeOptionsSchema>;

export type PublicResumeResponseDto = z.infer<typeof PublicResumeResponseSchema>;
