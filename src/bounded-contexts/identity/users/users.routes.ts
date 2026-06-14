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
import { negotiateLocale } from '@/bounded-contexts/platform/i18n/application/locale-negotiator';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { localizeDomainCodes } from '@/shared-kernel/i18n/localize-domain-code';
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
import {
  AdminCreateUserSchema,
  AdminResetPasswordSchema,
  AdminUpdateUserSchema,
  AssignRolesSchema,
  CheckUsernameQuery,
  CheckUsernameResponseSchema,
  ConnectedAccountProviderParam,
  ConnectedAccountsResponseSchema,
  CreatedUserResponseSchema,
  GetBasicPreferencesResponseSchema,
  ListUsersQuery,
  ManagedUserDetailsResponseSchema,
  ManagedUserListResponseSchema,
  MessageOnlyResponseSchema,
  OneClickApplyConfigResponseSchema,
  OneClickApplyConfigSchema,
  PermissionsListResponseSchema,
  PublicUsersListQuery,
  PublicUsersListResponseSchema,
  UpdateBasicPreferencesResponseSchema,
  UpdatedUserResponseSchema,
  UpdateUsernameResponseSchema,
  UpdateUserProfileResponseSchema,
  UserIdParam,
  UsernameParam,
  UsernameRulesResponseSchema,
  UserProfileResponseSchema,
  ValidateUsernameRequestBodySchema,
  ValidateUsernameResponseSchema,
} from './users.routes.schemas';

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
    headers: { 'Cache-Control': 'public, max-age=60' },
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
      return { user: data.user, resume: data.resume };
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
  // ─── Public users (sitemap) ───────────────────────────────────────
  // Public, no-auth listing of users that have a username set. Used by
  // the SEO sitemap to enumerate `@<username>` routes.
  {
    method: 'GET',
    path: '/v1/users/public',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=60' },
    query: PublicUsersListQuery,
    response: PublicUsersListResponseSchema,
    openapi: {
      summary: 'List users with a public username (paginated)',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const q = ctx.query as z.infer<typeof PublicUsersListQuery>;
      const page = q.page ?? 1;
      const limit = q.limit ?? 100;
      const result = await bundle.profile.listPublicUsersUseCase.execute(page, limit);
      return {
        ...result,
        items: result.items.map((i) => ({
          username: i.username,
          updatedAt: i.updatedAt.toISOString(),
        })),
      };
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
  // ─── Connected accounts (OAuth) ───────────────────────────────────
  {
    method: 'GET',
    path: '/v1/users/connected-accounts',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    response: ConnectedAccountsResponseSchema,
    openapi: {
      summary: 'List the current user\'s linked OAuth accounts',
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      return bundle.useCases.listConnectedAccounts.execute(ctx.user!.userId);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/users/connected-accounts/:provider',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    params: ConnectedAccountProviderParam,
    response: MessageOnlyResponseSchema,
    openapi: {
      summary: 'Disconnect a linked OAuth account',
      tags: ['users'],
      description:
        'Users API. Refuses to remove the last login method when the user has no password set.',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { provider } = ctx.params as z.infer<typeof ConnectedAccountProviderParam>;
      await bundle.useCases.disconnectConnectedAccount.execute(ctx.user!.userId, provider);
      return { code: 'CONNECTED_ACCOUNT_DISCONNECTED' as const };
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
      const result = await bundle.useCases.updateUsername.execute(ctx.user!.userId, body.username);
      return { username: result.username, message: 'Username updated successfully' };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/username/rules',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    response: UsernameRulesResponseSchema,
    openapi: {
      summary: 'Get username format rules (single source of truth for client gating)',
      tags: ['users'],
      description:
        'Returns the regex sources + min/max so the frontend can compile a matching RegExp and validate input without a round-trip per keystroke. The body never changes between requests of the same backend version, hence the long cache.',
    },
    sdk: { exported: true },
    handler: async (_ctx, bundle) => {
      return bundle.useCases.getUsernameRules.execute();
    },
  },
  {
    method: 'GET',
    path: '/v1/users/username/check',
    auth: { kind: 'jwt' },
    // No `permission` gate: the onboarding stepper calls this on every
    // keystroke of the username field, and at that point the user has
    // not been granted the `user` role yet (assignment happens at
    // onboarding completion). `USER_PROFILE_READ` made the route
    // unreachable from the only flow that uses it. The endpoint returns
    // a boolean availability signal — no other user's data — so the
    // JWT gate alone is the right surface.
    guards: [
      { id: 'allow-unverified-email' },
      { id: 'skip-tos-check' },
      { id: 'rate-limit', metadata: { points: 30, duration: 60, keyStrategy: 'userId' } },
    ],
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
      const availability = await bundle.useCases.checkUsernameAvailability.execute(
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
  {
    method: 'POST',
    path: '/v1/users/username/validate',
    auth: { kind: 'jwt' },
    // Same reasoning as `/v1/users/username/check`: this is called from
    // onboarding before the `user` role is granted, so a permission
    // gate locks the only consumer out. JWT + bypass guards mirror the
    // sibling endpoint.
    guards: [
      { id: 'allow-unverified-email' },
      { id: 'skip-tos-check' },
      { id: 'rate-limit', metadata: { points: 30, duration: 60, keyStrategy: 'userId' } },
    ],
    body: ValidateUsernameRequestBodySchema,
    response: ValidateUsernameResponseSchema,
    openapi: {
      summary: 'Validate username (multi-error breakdown for client forms)',
      tags: ['users'],
      description:
        'Returns every format/availability problem at once. Each error carries a stable `code` plus a `message` already localized via the request `Accept-Language` header.',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof ValidateUsernameRequestBodySchema>;
      const result = await bundle.useCases.validateUsername.execute(
        body.username,
        ctx.user!.userId,
      );
      const { locale } = negotiateLocale(
        Array.isArray(ctx.headers['accept-language'])
          ? ctx.headers['accept-language'][0]
          : ctx.headers['accept-language'],
      );
      return {
        username: result.username,
        valid: result.valid,
        ...(result.available !== undefined ? { available: result.available } : {}),
        errors: localizeDomainCodes(result.errors, bundle.i18n, locale).map((e) => ({
          code: e.code as z.infer<typeof ValidateUsernameResponseSchema>['errors'][number]['code'],
          ...(e.params ? { params: e.params } : {}),
          message: e.message,
        })),
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
      return { code: 'PREFERENCES_UPDATED' as const };
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
      return { preferences };
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
  {
    method: 'GET',
    path: '/v1/users/me/one-click-apply',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_READ,
    response: OneClickApplyConfigResponseSchema,
    openapi: {
      summary: "Get the caller's One-Click Apply config",
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const data = await bundle.preferences.getOneClickApplyConfigUseCase.execute(ctx.user!.userId);
      return { data };
    },
  },
  {
    method: 'PUT',
    path: '/v1/users/me/one-click-apply',
    auth: { kind: 'jwt' },
    permission: Permission.USER_PROFILE_UPDATE,
    body: OneClickApplyConfigSchema,
    response: OneClickApplyConfigResponseSchema,
    openapi: {
      summary: "Replace the caller's One-Click Apply config",
      tags: ['users'],
      description: 'Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as z.infer<typeof OneClickApplyConfigSchema>;
      const data = await bundle.preferences.updateOneClickApplyConfigUseCase.execute(
        ctx.user!.userId,
        body,
      );
      return { data };
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
      const result = await bundle.useCases.listUsers.execute({
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
      const user = await bundle.useCases.getUserDetails.execute(id);
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
      const result = await bundle.useCases.createUser.execute(body);
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
      const result = await bundle.useCases.updateUser.execute(id, body);
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
      await bundle.useCases.deleteUser.execute(id, ctx.user!.userId);
      return { code: 'USER_DELETED' as const };
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
      await bundle.useCases.adminResetPassword.execute(id, body.newPassword);
      return { code: 'PASSWORD_RESET' as const };
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
      await bundle.useCases.assignRoles.execute(id, body.roles, ctx.user!.userId);
      return { code: 'ROLES_UPDATED' as const };
    },
  },
];
