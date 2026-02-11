import { z } from 'zod';
import { UserRoleSchema } from '../enums/user-role.enum';

/**
 * User Types
 *
 * Core user entity types shared between frontend and backend.
 * Backend uses Prisma for persistence; these types represent API contracts.
 */

/**
 * Base User Schema
 * Represents the user entity as returned by API
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  usernameUpdatedAt: z.string().datetime().nullable(),
  role: UserRoleSchema,
  image: z.string().url().nullable(),
  hasCompletedOnboarding: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * User Profile Schema
 * Extended user info for profile pages
 */
export const UserProfileSchema = UserSchema.extend({
  bio: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().url().nullable(),
  company: z.string().nullable(),
  title: z.string().nullable(),
  phone: z.string().nullable(),
  linkedin: z.string().url().nullable(),
  github: z.string().url().nullable(),
  twitter: z.string().url().nullable(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Note: CheckUsernameResponse, UserStats moved to dtos/user.dto.ts
// to avoid duplication. Import from main index or dtos/

/**
 * API User Profile Schema
 * Matches the response structure from profile endpoints
 */
export const UserProfileApiSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  avatar: z.string().url().nullable(),
  location: z.string().nullable(),
  website: z.string().url().nullable(),
  twitter: z.string().url().nullable().optional(),
  linkedin: z.string().url().nullable().optional(),
  github: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  usernameUpdatedAt: z.string().datetime().nullable().optional(),
  role: UserRoleSchema,
  onboardingCompleted: z.boolean(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      language: z.string().optional(),
      emailNotifications: z.boolean().optional(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserProfileApi = z.infer<typeof UserProfileApiSchema>;

export const UserPublicInfoSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  name: z.string().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  avatar: z.string().url().nullable(),
  location: z.string().nullable(),
  website: z.string().url().nullable(),
});

export type UserPublicInfo = z.infer<typeof UserPublicInfoSchema>;

export const UserProfileResponseSchema = z.object({
  data: z.object({
    user: UserProfileApiSchema,
  }),
});

export type UserProfileResponseEnvelope = z.infer<typeof UserProfileResponseSchema>;

export const PublicUserProfileResponseSchema = z.object({
  data: z.object({
    profile: UserPublicInfoSchema,
  }),
});

export type PublicUserProfileResponseEnvelope = z.infer<typeof PublicUserProfileResponseSchema>;

/**
 * Admin User Schemas
 */
export const UserListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  role: UserRoleSchema,
  hasCompletedOnboarding: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  image: z.string().url().nullable(),
  emailVerified: z.boolean().nullable(),
  _count: z.object({ resumes: z.number() }).catchall(z.number()),
});

export type UserListItem = z.infer<typeof UserListItemSchema>;

export const UsersListResponseSchema = z.object({
  users: z.array(UserListItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;

export const UserDetailsSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  emailVerified: z.boolean().nullable(),
  role: UserRoleSchema,
  hasCompletedOnboarding: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resumes: z.array(z.record(z.unknown())),
  preferences: z.unknown(),
  _count: z.record(z.unknown()),
});

export type UserDetails = z.infer<typeof UserDetailsSchema>;

export const UpdateUserResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    hasCompletedOnboarding: z.boolean(),
    updatedAt: z.string().datetime(),
  }),
  message: z.string(),
});

export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;

export const ApiMessageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type ApiMessageResponse = z.infer<typeof ApiMessageResponseSchema>;
