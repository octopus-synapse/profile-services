/**
 * Certification Schema
 *
 * Validation for professional certifications.
 * Maps to profile-services Certification model.
 */

import { z } from "zod";

// ============================================================================
// Shared Date Format
// ============================================================================

const DateString = z
 .string()
 .regex(
  /^\d{4}-\d{2}(-\d{2})?$/,
  "Invalid date format (YYYY-MM or YYYY-MM-DD)"
 );

// ============================================================================
// Base Schema
// ============================================================================

export const CertificationBaseSchema = z.object({
 name: z.string().min(1, "Certification name is required").max(200),
 issuer: z.string().min(1, "Issuer is required").max(100),
 issueDate: DateString.optional(),
 expiryDate: DateString.optional(),
 credentialId: z.string().max(100).optional(),
 credentialUrl: z.string().url().optional(),
 description: z.string().max(500).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateCertificationSchema = CertificationBaseSchema;
export type CreateCertification = z.infer<typeof CreateCertificationSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateCertificationSchema = CertificationBaseSchema.partial();
export type UpdateCertification = z.infer<typeof UpdateCertificationSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const CertificationSchema = CertificationBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Certification = z.infer<typeof CertificationSchema>;
