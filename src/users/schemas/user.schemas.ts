/**
 * User & Preferences Validation Schemas
 * Centralized Zod schemas for user management
 */

import { z } from 'zod';

// Update Profile
export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

// Update Username
export const updateUsernameSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(30, { message: 'Username must not exceed 30 characters' })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'Username can only contain letters, numbers, hyphens, and underscores',
    }),
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
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(6)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain uppercase, lowercase, and number',
    }),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
