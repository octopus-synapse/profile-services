/**
 * Users DTOs
 *
 * Request and Response DTOs for user profile and preferences operations.
 * Uses createZodDto for unified types + validation + Swagger.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Response Schemas
// ============================================================================

const UserProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().optional(),
  name: z.string().optional(),
  photoURL: z.string().url().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  twitter: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const PublicProfileResponseSchema = z.object({
  username: z.string(),
  name: z.string().optional(),
  photoURL: z.string().url().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
});

const UserPreferencesResponseSchema = z.object({
  palette: z.string().optional(),
  bannerColor: z.string().optional(),
  name: z.string().optional(),
  photoURL: z.string().url().optional(),
});

const UserFullPreferencesResponseSchema = UserPreferencesResponseSchema.extend({
  language: z.string().optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

const UpdateUsernameResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  username: z.string(),
});

const UsernameAvailabilityResponseSchema = z.object({
  username: z.string(),
  available: z.boolean(),
});

// ============================================================================
// Response DTOs
// ============================================================================

export class UserProfileResponseDto extends createZodDto(UserProfileResponseSchema) {}
export class PublicProfileResponseDto extends createZodDto(PublicProfileResponseSchema) {}
export class UserPreferencesResponseDto extends createZodDto(UserPreferencesResponseSchema) {}
export class UserFullPreferencesResponseDto extends createZodDto(
  UserFullPreferencesResponseSchema,
) {}
export class UpdateUsernameResponseDto extends createZodDto(UpdateUsernameResponseSchema) {}
export class UsernameAvailabilityResponseDto extends createZodDto(
  UsernameAvailabilityResponseSchema,
) {}
