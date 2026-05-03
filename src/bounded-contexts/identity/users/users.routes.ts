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
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { UpdateUserSchema } from '@/shared-kernel/schemas/user/user.schema';
import {
  UpdateFullPreferencesSchema,
  UpdatePreferencesSchema,
  UpdateUsernameSchema,
} from '@/shared-kernel/schemas/user/user-profile.schema';
import { UsersHttpBundle } from './application/ports/users-http.bundle';
import {
  PublicProfileDataSchema,
  UserFullPreferencesDataSchema,
} from './dto/controller-response.schema';
import {
  toCreatedUserMutation,
  toUpdatedUserMutation,
  toUserDetailsData,
  toUserManagementListData,
} from './infrastructure/presenters/user-management.presenter';

// ─── Response schemas ────────────────────────────────────────────────
// `UserProfile` from `application/ports/user-profile.port`. JSON-serialized
// `Date` becomes ISO string.
const UserProfileResponseSchema = z.object({
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
const UpdateUserProfileResponseSchema = UserProfileResponseSchema.extend({
  profile: UserProfileResponseSchema,
});

const UpdateUsernameResponseSchema = z.object({
  username: z.string(),
  message: z.string(),
});

const CheckUsernameResponseSchema = z.object({
  username: z.string(),
  available: z.boolean(),
  reason: z.enum(['taken', 'reserved', 'invalid_format']).optional(),
});

const BasicPreferencesShape = z.object({
  theme: z.string().optional(),
  language: z.string().optional(),
  emailNotifications: z.boolean().optional(),
});
const GetBasicPreferencesResponseSchema = z.object({ preferences: BasicPreferencesShape });

const UpdateBasicPreferencesResponseSchema = z.object({ message: z.string() });

const PermissionsListResponseSchema = z.object({ permissions: z.array(z.string()) });

const MessageOnlyResponseSchema = z.object({ message: z.string() });

// View-model emitted by `toUserManagementListData` — Dates pre-serialized.
const ManagedUserListItemSchema = z.object({
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

const ManagedUserListResponseSchema = z.object({
  users: z.array(ManagedUserListItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

const ManagedUserResumeItemSchema = z.object({
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
const ManagedUserDetailsResponseSchema = z.object({
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

const CreatedUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const UpdatedManagedUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  updatedAt: z.string().datetime(),
});

const CreatedUserResponseSchema = z.object({
  user: CreatedUserSchema,
  message: z.string(),
});

const UpdatedUserResponseSchema = z.object({
  user: UpdatedManagedUserSchema,
  message: z.string(),
});

const UsernameParam = z.object({ username: z.string() });
const CheckUsernameQuery = z.object({ username: z.string() });

const UserIdParam = z.object({ id: z.string() });

const ListUsersQuery = z.object({
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
  search: z.string().optional(),
  roleName: z.string().optional(),
});

const AdminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER').optional(),
});

const AdminUpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
});

const AdminResetPasswordSchema = z.object({ newPassword: z.string().min(8) });

const AssignRolesSchema = z.object({ roles: z.array(z.string()) });

export const usersRoutes: ReadonlyArray<Route<UsersHttpBundle>> = [
  // ─── Profile ──────────────────────────────────────────────────────
  // NOTE: mounted under `/v1/profiles/:username` rather than
  // `/v1/users/:username/profile` to avoid colliding with the
  // social/feed BCs, which own `/v1/users/:userId/...` at the same
  // tree position (memoirist requires a consistent param name across
  // BCs sharing a prefix).
  {
    method: 'GET',
    path: '/v1/profiles/:username',
    auth: { kind: 'public' },
    params: UsernameParam,
    response: PublicProfileDataSchema,
    openapi: {
      summary: "Get a user's public profile by username",
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { username } = ctx.params as { username: string };
      const data = await bundle.profile.getPublicProfileUseCase.execute(username);
      return PublicProfileDataSchema.parse({ user: data.user, resume: data.resume });
    },
  },
  {
    method: 'GET',
    path: '/v1/users/profile',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    response: UserProfileResponseSchema,
    openapi: {
      summary: 'Get current user profile',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const result = await bundle.profile.getProfileUseCase.execute(ctx.user!.userId);
      return result;
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/profile',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: UpdateUserSchema,
    response: UpdateUserProfileResponseSchema,
    openapi: {
      summary: 'Update current user profile',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof UpdateUserSchema>;
      const result = await bundle.profile.updateProfileUseCase.execute(ctx.user!.userId, body);
      return { ...result, profile: result };
    },
  },
  // ─── Username ─────────────────────────────────────────────────────
  {
    method: 'PATCH',
    path: '/v1/users/username',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: UpdateUsernameSchema,
    response: UpdateUsernameResponseSchema,
    openapi: {
      summary: 'Update username (once every 30 days)',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof UpdateUsernameSchema>;
      const result = await bundle.usernameService.updateUsername(ctx.user!.userId, body);
      return { username: result.username, message: 'Username updated successfully' };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/username/check',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    query: CheckUsernameQuery,
    response: CheckUsernameResponseSchema,
    openapi: {
      summary: 'Check if a username is available',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const q = ctx.query as z.infer<typeof CheckUsernameQuery>;
      const availability = await bundle.usernameService.checkUsernameAvailability(
        q.username,
        ctx.user!.userId,
      );
      return {
        username: availability.username,
        available: availability.available,
        ...(availability.reason ? { reason: availability.reason } : {}),
      };
    },
  },
  // ─── Preferences ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/users/preferences',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    response: GetBasicPreferencesResponseSchema,
    openapi: {
      summary: 'Get user preferences (basic)',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const preferences = await bundle.preferences.getPreferencesUseCase.execute(ctx.user!.userId);
      return { preferences };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/preferences',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: UpdatePreferencesSchema,
    response: UpdateBasicPreferencesResponseSchema,
    openapi: {
      summary: 'Update user preferences (basic)',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof UpdatePreferencesSchema>;
      await bundle.preferences.updatePreferencesUseCase.execute(ctx.user!.userId, body);
      return { message: 'Preferences updated successfully' };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/preferences/full',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    response: UserFullPreferencesDataSchema,
    openapi: {
      summary: 'Get all user preferences',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const preferences = await bundle.preferences.getFullPreferencesUseCase.execute(
        ctx.user!.userId,
      );
      return UserFullPreferencesDataSchema.parse({ preferences });
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/preferences/full',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: UpdateFullPreferencesSchema,
    response: UserFullPreferencesDataSchema,
    openapi: {
      summary: 'Update all user preferences',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof UpdateFullPreferencesSchema>;
      const preferences = await bundle.preferences.updateFullPreferencesUseCase.execute(
        ctx.user!.userId,
        body,
      );
      return { preferences };
    },
  },
  // ─── Permissions ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/users/me/permissions',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    response: PermissionsListResponseSchema,
    openapi: {
      summary: 'List permission keys granted to the current user (for UI gating)',
      tags: ['users'],
      description: 'User permissions',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const permissions = await bundle.authorization.getAllPermissions(ctx.user!.userId);
      return { permissions };
    },
  },
  // ─── User Management (admin) ──────────────────────────────────────
  // Permissions are dynamic `{ resource, action }` pairs (not enum
  // entries). The synthesizer maps these onto
  // `RequirePermission(resource, action)`.
  {
    method: 'GET',
    path: '/v1/users/manage',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'read' },
    query: ListUsersQuery,
    response: ManagedUserListResponseSchema,
    openapi: {
      summary: 'List all users with pagination',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const q = ctx.query as z.infer<typeof ListUsersQuery>;
      const result = await bundle.userManagement.listUsers({
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
        search: q.search,
        roleName: q.roleName,
      });
      return toUserManagementListData(result);
    },
  },
  {
    method: 'GET',
    path: '/v1/users/manage/:id',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'read' },
    params: UserIdParam,
    response: ManagedUserDetailsResponseSchema,
    openapi: {
      summary: 'Get user details by ID',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { id } = ctx.params as { id: string };
      const user = await bundle.userManagement.getUserDetails(id);
      return toUserDetailsData(user);
    },
  },
  {
    method: 'POST',
    path: '/v1/users/manage',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'create' },
    body: AdminCreateUserSchema,
    statusCode: 201,
    response: CreatedUserResponseSchema,
    openapi: {
      summary: 'Create a new user',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof AdminCreateUserSchema>;
      const result = await bundle.userManagement.createUser(body);
      return { user: toCreatedUserMutation(result), message: 'User created successfully' };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/manage/:id',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'update' },
    params: UserIdParam,
    body: AdminUpdateUserSchema,
    response: UpdatedUserResponseSchema,
    openapi: {
      summary: 'Update user information',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof AdminUpdateUserSchema>;
      const result = await bundle.userManagement.updateUser(id, body);
      return { user: toUpdatedUserMutation(result), message: 'User updated successfully' };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/users/manage/:id',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'delete' },
    params: UserIdParam,
    response: MessageOnlyResponseSchema,
    openapi: {
      summary: 'Delete a user',
      tags: ['users'],
      description: 'GDPR-compliant deletion that removes all user data.',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { id } = ctx.params as { id: string };
      await bundle.userManagement.deleteUser(id, ctx.user!.userId);
      return { message: 'User deleted successfully' };
    },
  },
  {
    method: 'POST',
    path: '/v1/users/manage/:id/reset-password',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'update' },
    params: UserIdParam,
    body: AdminResetPasswordSchema,
    statusCode: 200,
    response: MessageOnlyResponseSchema,
    openapi: {
      summary: 'Reset user password',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof AdminResetPasswordSchema>;
      await bundle.userManagement.resetPassword(id, body);
      return { message: 'Password reset successfully' };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/manage/:id/roles',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'role_assign' },
    params: UserIdParam,
    body: AssignRolesSchema,
    response: MessageOnlyResponseSchema,
    openapi: {
      summary: 'Assign roles to a user',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof AssignRolesSchema>;
      await bundle.userManagement.assignRoles(id, body.roles, ctx.user!.userId);
      return { message: 'Roles updated successfully' };
    },
  },
];
