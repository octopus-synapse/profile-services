/**
 * User Field Primitives
 *
 * Reusable validation schemas for common user profile fields.
 * Used across onboarding, profile editing, and admin forms.
 */

import { z } from "zod";

// ============================================================================
// Name Schemas
// ============================================================================

export const FullNameSchema = z
 .string()
 .trim()
 .min(2, "Name must be at least 2 characters")
 .max(100, "Name cannot exceed 100 characters");

export type FullName = z.infer<typeof FullNameSchema>;

// ============================================================================
// Phone Schemas
// ============================================================================

export const PhoneSchema = z
 .string()
 .max(20, "Phone number cannot exceed 20 characters")
 .optional();

export type Phone = z.infer<typeof PhoneSchema>;

// ============================================================================
// Location Schemas
// ============================================================================

export const UserLocationSchema = z
 .string()
 .max(100, "Location cannot exceed 100 characters")
 .optional();

export type UserLocation = z.infer<typeof UserLocationSchema>;
