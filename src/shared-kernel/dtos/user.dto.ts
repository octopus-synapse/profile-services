import { z } from 'zod';
import { UsernameSchema } from '../validations/username.schema';
import {
  SocialUrlSchema,
  LinkedInUrlSchema,
  GitHubUrlSchema,
} from '../validations/professional-profile.schema';

// Local schemas (TODO: move to schemas/primitives if needed)
const FullNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100);
const PhoneSchema = z.string().max(20).optional();
const UserLocationSchema = z.string().max(100).optional();

/**
 * User DTOs
 *
 * Data Transfer Objects for user operations.
 */

/**
 * Update User Profile Schema
 */
export const UpdateUserSchema = z.object({
  name: FullNameSchema.optional(),
  username: UsernameSchema.optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  location: UserLocationSchema.optional(),
  website: SocialUrlSchema.optional(),
  company: z
    .string()
    .max(100, 'Company must be 100 characters or less')
    .optional(),
  title: z.string().max(100, 'Title must be 100 characters or less').optional(),
  phone: PhoneSchema.optional(),
  linkedin: LinkedInUrlSchema.optional(),
  github: GitHubUrlSchema.optional(),
  twitter: SocialUrlSchema.optional(),
  image: z.string().url().optional(),
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

/**
 * Admin User Filters Schema
 */
export const AdminUserFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'APPROVER']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AdminUserFilters = z.infer<typeof AdminUserFiltersSchema>;

/**
 * User Stats Response Schema
 */
export const UserStatsSchema = z.object({
  totalResumes: z.number().int().nonnegative(),
  publicProfiles: z.number().int().nonnegative(),
  lastActive: z.string().datetime().nullable(),
});

export type UserStats = z.infer<typeof UserStatsSchema>;

/**
 * Check Username Response Schema
 */
export const CheckUsernameResponseSchema = z.object({
  username: z.string(),
  available: z.boolean(),
});

export type CheckUsernameResponse = z.infer<typeof CheckUsernameResponseSchema>;

/**
 * Update Username Request Schema
 */
export const UpdateUsernameRequestSchema = z.object({
  username: UsernameSchema,
});

export type UpdateUsernameRequest = z.infer<typeof UpdateUsernameRequestSchema>;

/**
 * Update Username Response Schema
 */
export const UpdateUsernameResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  username: z.string(),
});

export type UpdateUsernameResponse = z.infer<
  typeof UpdateUsernameResponseSchema
>;

/**
 * Validate Username Request Schema
 */
export const ValidateUsernameRequestSchema = z.object({
  username: z.string().trim(),
});

export type ValidateUsernameRequest = z.infer<
  typeof ValidateUsernameRequestSchema
>;

/**
 * Username Validation Error
 */
export const UsernameValidationErrorSchema = z.object({
  code: z.enum([
    'TOO_SHORT',
    'TOO_LONG',
    'INVALID_FORMAT',
    'INVALID_START',
    'INVALID_END',
    'CONSECUTIVE_UNDERSCORES',
    'RESERVED',
    'UPPERCASE',
    'ALREADY_TAKEN',
  ]),
  message: z.string(),
});

export type UsernameValidationError = z.infer<
  typeof UsernameValidationErrorSchema
>;

/**
 * Validate Username Response Schema
 */
export const ValidateUsernameResponseSchema = z.object({
  username: z.string(),
  valid: z.boolean(),
  available: z.boolean().optional(),
  errors: z.array(UsernameValidationErrorSchema),
});

export type ValidateUsernameResponse = z.infer<
  typeof ValidateUsernameResponseSchema
>;

/**
 * Upload Image Response Schema
 */
export const UploadImageResponseSchema = z.object({
  url: z.string().url(),
});

export type UploadImageResponse = z.infer<typeof UploadImageResponseSchema>;

/**
 * Upload Image Response Wrapper Schema
 * Standard API wrapper for upload endpoint
 */
export const UploadImageResponseWrapperSchema = z.object({
  data: UploadImageResponseSchema,
});

export type UploadImageResponseEnvelope = z.infer<
  typeof UploadImageResponseWrapperSchema
>;
