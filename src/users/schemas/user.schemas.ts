/**
 * User & Preferences Validation Schemas
 *
 * Uses @octopus-synapse/profile-contracts for domain validation.
 * Preferences are backend-specific concerns.
 */

import { z } from 'zod';
import {
  UsernameSchema,
  FullNameSchema,
  PhoneSchema,
  UserLocationSchema,
  SocialUrlSchema,
  PasswordSchema,
} from '@octopus-synapse/profile-contracts';

// Update Profile
export const updateProfileSchema = z.object({
  displayName: FullNameSchema.optional(),
  bio: z.string().max(500).optional(),
  location: UserLocationSchema.optional(),
  phone: PhoneSchema.optional(),
  website: SocialUrlSchema.optional(),
  linkedin: SocialUrlSchema.optional(),
  github: SocialUrlSchema.optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

// Update Username
export const updateUsernameSchema = z.object({
  username: UsernameSchema,
});

export type UpdateUsernameDto = z.infer<typeof updateUsernameSchema>;

// Update Preferences
export const updatePreferencesSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  palette: z.string().optional(),
  bannerColor: z.string().optional(),
  language: z.string().optional(),
  dateFormat: z.string().optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  resumeExpiryAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  profileVisibility: z.enum(['public', 'private']).optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  allowSearchEngineIndex: z.boolean().optional(),
  defaultExportFormat: z.enum(['pdf', 'docx', 'json']).optional(),
  includePhotoInExport: z.boolean().optional(),
});

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;

// Change Password
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
