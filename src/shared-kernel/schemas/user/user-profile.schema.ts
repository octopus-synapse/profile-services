/**
 * User Profile DTOs
 *
 * Data Transfer Objects for user profile operations.
 * Single source of truth for profile updates.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UsernameSchema } from '@/bounded-contexts/identity/users/domain/schemas/username.schema';

// Local schemas
const PhoneSchema = z.string().max(20).optional();
const UserLocationSchema = z.string().max(100).optional();

/**
 * URL Schema for profile links
 */
const UrlSchema = z.string().url('Invalid URL').max(500, 'URL too long');

/**
 * Update User Profile Schema
 * Used for updating user profile information.
 */
export const UpdateProfileSchema = z.object({
  name: z.string().max(100, 'Name too long').optional(),
  photoURL: UrlSchema.optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  location: UserLocationSchema,
  phone: PhoneSchema,
  website: UrlSchema.optional(),
  linkedin: UrlSchema.optional(),
  github: UrlSchema.optional(),
  twitter: UrlSchema.optional(),
});

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

/**
 * Update Preferences Schema
 * Used for updating user UI preferences.
 */
export const UpdatePreferencesSchema = z.object({
  palette: z.string().optional(),
  bannerColor: z.string().optional(),
  name: z.string().max(100, 'Name too long').optional(),
  photoURL: UrlSchema.optional(),
});

export type UpdatePreferences = z.infer<typeof UpdatePreferencesSchema>;

/** DTO class so controllers can accept typed bodies and Orval infers them. */
export class UpdatePreferencesDto extends createZodDto(UpdatePreferencesSchema) {}

/**
 * User apply criteria — defaults consumed by Auto-Apply and Weekly Curated.
 * Kept optional at every level so clients can update one field at a time.
 */
export const UpdateApplyCriteriaSchema = z.object({
  minFit: z.number().int().min(0).max(100).optional(),
  stacks: z.array(z.string().max(60)).max(40).optional(),
  seniorities: z.array(z.string().max(30)).max(10).optional(),
  remotePolicies: z.array(z.enum(['REMOTE', 'HYBRID', 'ONSITE'])).optional(),
  paymentCurrencies: z.array(z.enum(['BRL', 'USD', 'EUR', 'GBP'])).optional(),
  minSalaryUsd: z.number().int().min(0).optional(),
  defaultCover: z.string().max(4000).optional(),
});

export type UpdateApplyCriteria = z.infer<typeof UpdateApplyCriteriaSchema>;

/**
 * Update Full Preferences Schema
 * Extended preferences including all user preference fields.
 */
export const UpdateFullPreferencesSchema = z.object({
  // Appearance
  theme: z.string().optional(),
  palette: z.string().optional(),
  bannerColor: z.string().optional(),
  name: z.string().max(100).optional(),
  photoURL: UrlSchema.optional(),
  // Localization
  language: z.string().max(10).optional(),
  dateFormat: z.string().optional(),
  timezone: z.string().max(50).optional(),
  // Notifications
  emailNotifications: z.boolean().optional(),
  resumeExpiryAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  emailMilestones: z.boolean().optional(),
  emailShareExpiring: z.boolean().optional(),
  digestFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  // Privacy
  profileVisibility: z.string().optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  allowSearchEngineIndex: z.boolean().optional(),
  // Export defaults
  defaultExportFormat: z.string().optional(),
  includePhotoInExport: z.boolean().optional(),
  // Apply mode
  applyMode: z.enum(['ONE_CLICK', 'WEEKLY_CURATED', 'AUTO_APPLY']).optional(),
  applyCriteria: UpdateApplyCriteriaSchema.optional(),
});

export type UpdateFullPreferences = z.infer<typeof UpdateFullPreferencesSchema>;

/** Orval-friendly DTO for the PATCH /users/preferences/full body. */
export class UpdateFullPreferencesDto extends createZodDto(UpdateFullPreferencesSchema) {}

/**
 * Update Username Schema
 * Used for changing user's username.
 */
export const UpdateUsernameSchema = z.object({
  username: UsernameSchema,
});

export type UpdateUsername = z.infer<typeof UpdateUsernameSchema>;

/**
 * User Settings Schema
 * User preferences and configuration.
 */
export const UserSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  twoFactorEnabled: z.boolean(),
  language: z.string(),
  timezone: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
