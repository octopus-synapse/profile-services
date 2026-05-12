import { z } from 'zod';
import { UsernameSchema } from '@/bounded-contexts/identity/users/domain/schemas/username.schema';
import {
  FullNameSchema,
  GitHubUrlSchema,
  LinkedInUrlSchema,
  PhoneSchema,
  ShortDescriptionSchema,
  SocialUrlSchema,
  UserLocationSchema,
} from '@/shared-kernel/schemas/primitives';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

/**
 * User DTOs
 *
 * Data Transfer Objects for user operations.
 */

/**
 * Update User Profile Schema
 */
export const UpdateUserSchema = z
  .object({
    name: FullNameSchema.optional(),
    username: UsernameSchema.optional(),
    bio: ShortDescriptionSchema.optional(),
    location: UserLocationSchema,
    website: SocialUrlSchema.optional(),
    company: z.string().max(100, 'Company must be 100 characters or less').optional(),
    title: z.string().max(100, 'Title must be 100 characters or less').optional(),
    phone: PhoneSchema,
    linkedin: LinkedInUrlSchema.optional(),
    github: GitHubUrlSchema.optional(),
    twitter: SocialUrlSchema.optional(),
    image: SocialUrlSchema.optional(),
  })
  .openapi({
    example: {
      name: 'Dredd Fixture User',
    },
  });

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

/**
 * Admin User Filters Schema
 */
export const AdminUserFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
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
  lastActive: IsoDateTimeSchema.nullable(),
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
export const UpdateUsernameRequestSchema = z.object({ username: UsernameSchema });

export type UpdateUsernameRequest = z.infer<typeof UpdateUsernameRequestSchema>;

/**
 * Update Username Response Schema
 */
export const UpdateUsernameResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  username: z.string(),
});

export type UpdateUsernameResponse = z.infer<typeof UpdateUsernameResponseSchema>;

/**
 * Validate Username Request Schema
 */
export const ValidateUsernameRequestSchema = z.object({ username: z.string().trim() });

export type ValidateUsernameRequest = z.infer<typeof ValidateUsernameRequestSchema>;

/**
 * Username Validation Error.
 *
 * Codes match catalog keys in `@packages/i18n/ERROR_DICTIONARY` 1:1 so
 * the route handler can resolve `message` via `i18n.translate(code, ...)`
 * using the request's `Accept-Language` (Q8b in CLAUDE.md). The use case
 * returns these codes via `DomainCode[]`; the route handler enriches
 * them with the localized `message` before returning.
 *
 * `params` carries the template arguments (e.g. `{ min: 3 }` for
 * `USERNAME_TOO_SHORT`).
 */
export const UsernameValidationErrorSchema = z.object({
  code: z.enum([
    'USERNAME_TOO_SHORT',
    'USERNAME_TOO_LONG',
    'USERNAME_INVALID_FORMAT',
    'USERNAME_INVALID_START',
    'USERNAME_INVALID_END',
    'USERNAME_CONSECUTIVE_UNDERSCORES',
    'USERNAME_RESERVED',
    'USERNAME_MUST_BE_LOWERCASE',
    'USERNAME_TAKEN',
  ]),
  params: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  message: z.string(),
});

export type UsernameValidationError = z.infer<typeof UsernameValidationErrorSchema>;

/**
 * Validate Username Response Schema
 */
export const ValidateUsernameResponseSchema = z.object({
  username: z.string(),
  valid: z.boolean(),
  available: z.boolean().optional(),
  errors: z.array(UsernameValidationErrorSchema),
});

export type ValidateUsernameResponse = z.infer<typeof ValidateUsernameResponseSchema>;

/**
 * Upload Image Response Schema
 */
export const UploadImageResponseSchema = z.object({ url: z.string().url() });

export type UploadImageResponse = z.infer<typeof UploadImageResponseSchema>;

/**
 * Upload Image Response Wrapper Schema
 * Standard API wrapper for upload endpoint
 */
export const UploadImageResponseWrapperSchema = z.object({ data: UploadImageResponseSchema });

export type UploadImageResponseEnvelope = z.infer<typeof UploadImageResponseWrapperSchema>;

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export type AdminUserFiltersDto = z.infer<typeof AdminUserFiltersSchema>;

export type UserStatsDto = z.infer<typeof UserStatsSchema>;

export type CheckUsernameResponseDto = z.infer<typeof CheckUsernameResponseSchema>;

export type UpdateUsernameRequestDto = z.infer<typeof UpdateUsernameRequestSchema>;

export type UpdateUsernameResponseDto = z.infer<typeof UpdateUsernameResponseSchema>;

export type ValidateUsernameRequestDto = z.infer<typeof ValidateUsernameRequestSchema>;

export type UsernameValidationErrorDto = z.infer<typeof UsernameValidationErrorSchema>;

export type ValidateUsernameResponseDto = z.infer<typeof ValidateUsernameResponseSchema>;

export type UploadImageResponseDto = z.infer<typeof UploadImageResponseSchema>;

export type UploadImageResponseWrapperDto = z.infer<typeof UploadImageResponseWrapperSchema>;
