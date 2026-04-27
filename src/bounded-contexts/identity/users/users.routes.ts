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
import type { Route } from '@/shared-kernel/http/route';
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
} from './dto/controller-response.dto';
import {
  toCreatedUserMutation,
  toUpdatedUserMutation,
  toUserDetailsData,
  toUserManagementListData,
} from './infrastructure/presenters/user-management.presenter';

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
  {
    method: 'GET',
    path: '/v1/users/:username/profile',
    auth: { kind: 'public' },
    params: UsernameParam,
    openapi: {
      summary: "Get a user's public profile by username",
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { username } = ctx.params as { username: string };
      const data = await bundle.profile.getPublicProfileUseCase.execute(username);
      return {
        success: true,
        data: PublicProfileDataSchema.parse({ user: data.user, resume: data.resume }),
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/profile',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    openapi: {
      summary: 'Get current user profile',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const result = await bundle.profile.getProfileUseCase.execute(ctx.user!.userId);
      return { success: true, data: { ...result, profile: result } };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/profile',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: UpdateUserSchema,
    openapi: {
      summary: 'Update current user profile',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof UpdateUserSchema>;
      const result = await bundle.profile.updateProfileUseCase.execute(ctx.user!.userId, body);
      return { success: true, data: { ...result, profile: result } };
    },
  },
  // ─── Username ─────────────────────────────────────────────────────
  {
    method: 'PATCH',
    path: '/v1/users/username',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: UpdateUsernameSchema,
    openapi: {
      summary: 'Update username (once every 30 days)',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof UpdateUsernameSchema>;
      const result = await bundle.usernameService.updateUsername(ctx.user!.userId, body);
      return {
        success: true,
        data: { username: result.username, message: 'Username updated successfully' },
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/username/check',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    query: CheckUsernameQuery,
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
        success: true,
        data: {
          username: availability.username,
          available: availability.available,
          ...(availability.reason ? { reason: availability.reason } : {}),
        },
      };
    },
  },
  // ─── Preferences ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/users/preferences',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    openapi: {
      summary: 'Get user preferences (basic)',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const preferences = await bundle.preferences.getPreferencesUseCase.execute(ctx.user!.userId);
      return { success: true, data: { preferences } };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/preferences',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: UpdatePreferencesSchema,
    openapi: {
      summary: 'Update user preferences (basic)',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof UpdatePreferencesSchema>;
      await bundle.preferences.updatePreferencesUseCase.execute(ctx.user!.userId, body);
      return { success: true, data: { message: 'Preferences updated successfully' } };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/preferences/full',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
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
      return {
        success: true,
        data: UserFullPreferencesDataSchema.parse({ preferences }),
      };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/preferences/full',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: UpdateFullPreferencesSchema,
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
      return { success: true, data: { preferences } };
    },
  },
  // ─── Permissions ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/users/me/permissions',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
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
      return { success: true, data: toUserManagementListData(result) };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/manage/:id',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'read' },
    params: UserIdParam,
    openapi: {
      summary: 'Get user details by ID',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { id } = ctx.params as { id: string };
      const user = await bundle.userManagement.getUserDetails(id);
      return { success: true, data: toUserDetailsData(user) };
    },
  },
  {
    method: 'POST',
    path: '/v1/users/manage',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'create' },
    body: AdminCreateUserSchema,
    statusCode: 201,
    openapi: {
      summary: 'Create a new user',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof AdminCreateUserSchema>;
      const result = await bundle.userManagement.createUser(body);
      return {
        success: true,
        data: { user: toCreatedUserMutation(result), message: 'User created successfully' },
      };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/manage/:id',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'update' },
    params: UserIdParam,
    body: AdminUpdateUserSchema,
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
      return {
        success: true,
        data: { user: toUpdatedUserMutation(result), message: 'User updated successfully' },
      };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/users/manage/:id',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'delete' },
    params: UserIdParam,
    openapi: {
      summary: 'Delete a user',
      tags: ['users'],
      description: 'GDPR-compliant deletion that removes all user data.',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { id } = ctx.params as { id: string };
      await bundle.userManagement.deleteUser(id, ctx.user!.userId);
      return { success: true, data: { message: 'User deleted successfully' } };
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
      return { success: true, data: { message: 'Password reset successfully' } };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/users/manage/:id/roles',
    auth: { kind: 'jwt' },
    permission: { resource: 'user', action: 'role_assign' },
    params: UserIdParam,
    body: AssignRolesSchema,
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
      return { success: true, data: { message: 'Roles updated successfully' } };
    },
  },
];
