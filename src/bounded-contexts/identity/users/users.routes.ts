/**
 * Route descriptors for the users BC. Replaces:
 * - `UsersProfileController`
 * - `UsersPreferencesController`
 * - `UserPermissionsController`
 *
 * `UserManagementController` stays as a legacy controller because it
 * uses dynamic-string permissions (`@RequirePermission('user', 'read')`)
 * and a dynamic role-assignment endpoint that the synthesizer's static
 * `Permission`-enum field cannot model.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { UpdateFullPreferencesSchema, UpdatePreferencesSchema } from '@/shared-kernel/schemas/user/user-profile.schema';
import { UpdateUserSchema } from '@/shared-kernel/schemas/user/user.schema';
import { UpdateUsernameSchema } from '@/shared-kernel/schemas/user/user-profile.schema';
import {
  PublicProfileDataSchema,
  UserFullPreferencesDataSchema,
} from './dto/controller-response.dto';
import { UsersHttpBundle } from './application/ports/users-http.bundle';

const UsernameParam = z.object({ username: z.string() });
const CheckUsernameQuery = z.object({ username: z.string() });

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
];
