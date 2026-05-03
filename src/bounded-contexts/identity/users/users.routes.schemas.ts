/**
 * Route descriptors for the users BC. Replaces:
 * - `UsersProfileController`
 * - `UsersPreferencesController`
 * - `UserPermissionsController`
 * - `UserManagementController`
 *
 * The user-management endpoints use the synthesizer's dynamic
 * `{ resource, action }` permission spec (e.g. `('user', 'read')`)
 * since those permissions are not in the `Permission` enum.
 */

import { z } from 'zod';

// ─── Response schemas ────────────────────────────────────────────────
// `UserProfile` from `application/ports/user-profile.port`. JSON-serialized
// `Date` becomes ISO string.
export const UserProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// PATCH /v1/users/profile flattens the profile then nests it under `profile`
// (handler returns `{ ...result, profile: result }`).
export const UpdateUserProfileResponseSchema = UserProfileResponseSchema.extend({
  profile: UserProfileResponseSchema,
});

export const UpdateUsernameResponseSchema = z.object({
  username: z.string(),
  message: z.string(),
});

export const CheckUsernameResponseSchema = z.object({
  username: z.string(),
  available: z.boolean(),
  reason: z.enum(['taken', 'reserved', 'invalid_format']).optional(),
});

export const BasicPreferencesShape = z.object({
  theme: z.string().optional(),
  language: z.string().optional(),
  emailNotifications: z.boolean().optional(),
});
export const GetBasicPreferencesResponseSchema = z.object({ preferences: BasicPreferencesShape });

export const UpdateBasicPreferencesResponseSchema = z.object({ message: z.string() });

export const PermissionsListResponseSchema = z.object({ permissions: z.array(z.string()) });

export const MessageOnlyResponseSchema = z.object({ message: z.string() });

// View-model emitted by `toUserManagementListData` — Dates pre-serialized.
export const ManagedUserListItemSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  image: z.string().nullable(),
  emailVerified: z.string().datetime().nullable(),
  resumeCount: z.number().int(),
  role: z.enum(['USER', 'ADMIN']),
  isActive: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
});

export const ManagedUserListResponseSchema = z.object({
  users: z.array(ManagedUserListItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const ManagedUserResumeItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// `UserDetails.preferences` is `unknown | null` in the port; the FullUserPreferences
// shape is what we serialize on the read path. Express it as a permissive
// passthrough record so we stay schema-driven without falling back to
// `z.unknown()`.
export const ManagedUserDetailsResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    hasCompletedOnboarding: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    image: z.string().nullable(),
    emailVerified: z.string().datetime().nullable(),
    isActive: z.boolean(),
    lastLoginAt: z.string().datetime().nullable(),
    roles: z.array(z.string()),
    resumes: z.array(ManagedUserResumeItemSchema),
    preferences: z.object({}).passthrough().nullable(),
    counts: z.object({
      accounts: z.number().int(),
      sessions: z.number().int(),
      resumes: z.number().int(),
    }),
  }),
});

export const CreatedUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const UpdatedManagedUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  updatedAt: z.string().datetime(),
});

export const CreatedUserResponseSchema = z.object({
  user: CreatedUserSchema,
  message: z.string(),
});

export const UpdatedUserResponseSchema = z.object({
  user: UpdatedManagedUserSchema,
  message: z.string(),
});

export const UsernameParam = z.object({ username: z.string() });
export const CheckUsernameQuery = z.object({ username: z.string() });

export const UserIdParam = z.object({ id: z.string() });

export const ListUsersQuery = z.object({
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
  search: z.string().optional(),
  roleName: z.string().optional(),
});

export const AdminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER').optional(),
});

export const AdminUpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
});

export const AdminResetPasswordSchema = z.object({ newPassword: z.string().min(8) });

export const AssignRolesSchema = z.object({ roles: z.array(z.string()) });
