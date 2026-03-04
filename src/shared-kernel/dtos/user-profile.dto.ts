/**
 * User Profile DTOs
 *
 * Data Transfer Objects for user profile operations.
 * Single source of truth for profile updates.
 */

import { z } from 'zod';
import { UsernameSchema } from '../validations/username.schema';

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
  displayName: z.string().max(100, 'Name too long').optional(),
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
  displayName: z.string().max(100, 'Name too long').optional(),
  photoURL: UrlSchema.optional(),
});

export type UpdatePreferences = z.infer<typeof UpdatePreferencesSchema>;

/**
 * Update Full Preferences Schema
 * Extended preferences including all user preference fields.
 */
export const UpdateFullPreferencesSchema = z.object({
  // Appearance
  theme: z.string().optional(),
  palette: z.string().optional(),
  bannerColor: z.string().optional(),
  displayName: z.string().max(100).optional(),
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
});

export type UpdateFullPreferences = z.infer<typeof UpdateFullPreferencesSchema>;

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
