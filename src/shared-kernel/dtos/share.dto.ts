/**
 * Share DTOs
 *
 * Domain types and validation schemas for resume sharing functionality:
 * - Public share links
 * - Password protection
 * - Expiration dates
 */

import { z } from "zod";
import { ResumeSchema } from "../types/resume.types";

// ============================================================================
// Create Share
// ============================================================================

export const CreateShareSchema = z.object({
  resumeId: z.string().cuid(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  password: z.string().min(8).max(100).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type CreateShare = z.infer<typeof CreateShareSchema>;

// Alias for backward compatibility
export type CreateShareDto = CreateShare;

// ============================================================================
// Share Response
// ============================================================================

export const ShareResponseSchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  resumeId: z.string().cuid(),
  isActive: z.boolean(),
  hasPassword: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  publicUrl: z.string().url(),
});

export type ShareResponse = z.infer<typeof ShareResponseSchema>;

// Alias for backward compatibility
export type Share = ShareResponse;

// ============================================================================
// Public Resume Access
// ============================================================================

export const PublicResumeOptionsSchema = z.object({
  password: z.string().optional(),
});

export type PublicResumeOptions = z.infer<typeof PublicResumeOptionsSchema>;

export const PublicResumeResponseSchema = z.object({
  resume: ResumeSchema,
  share: z.object({
    slug: z.string(),
    expiresAt: z.string().datetime().nullable(),
  }),
});

export type PublicResumeResponse = z.infer<typeof PublicResumeResponseSchema>;
