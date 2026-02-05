/**
 * Bug Bounty Schema
 *
 * Validation for security bug bounty achievements.
 * Maps to profile-services BugBounty model.
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const SeverityLevelSchema = z.enum([
 "CRITICAL",
 "HIGH",
 "MEDIUM",
 "LOW",
 "INFORMATIONAL",
]);

export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;

// ============================================================================
// Base Schema
// ============================================================================

export const BugBountyBaseSchema = z.object({
 platform: z.string().min(1, "Platform is required").max(100),
 company: z.string().min(1, "Company is required").max(200),
 severity: SeverityLevelSchema,
 vulnerabilityType: z
  .string()
  .min(1, "Vulnerability type is required")
  .max(200),
 cveId: z
  .string()
  .regex(/^CVE-\d{4}-\d+$/, "Invalid CVE format")
  .optional()
  .or(z.literal("")),
 reward: z.number().min(0).optional(),
 currency: z.string().length(3).optional().default("USD"),
 reportUrl: z.string().url().optional().or(z.literal("")),
 reportedAt: z.coerce.date(),
 resolvedAt: z.coerce.date().optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateBugBountySchema = BugBountyBaseSchema;
export type CreateBugBounty = z.infer<typeof CreateBugBountySchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateBugBountySchema = BugBountyBaseSchema.partial();
export type UpdateBugBounty = z.infer<typeof UpdateBugBountySchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const BugBountySchema = BugBountyBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type BugBounty = z.infer<typeof BugBountySchema>;
