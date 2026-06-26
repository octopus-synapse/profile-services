/**
 * Admin user-management route descriptors (`/v1/users/manage/*`).
 *
 * Split out of `users.routes.ts` to keep each file focused (and under
 * the file-size budget). Permissions are dynamic `{ resource, action }`
 * pairs (not `Permission` enum entries); the synthesizer maps these onto
 * `RequirePermission(resource, action)`. The aggregate `usersRoutes`
 * array in `users.routes.ts` concatenates these after the core routes.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { UsersHttpBundle } from './application/ports/users-http.bundle';
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
  CreatedUserResponseSchema,
  ListUsersQuery,
  ManagedUserDetailsResponseSchema,
  ManagedUserListResponseSchema,
  MessageOnlyResponseSchema,
  UpdatedUserResponseSchema,
  UserIdParam,
} from './users.routes.schemas';

export const usersAdminRoutes: ReadonlyArray<Route<UsersHttpBundle>> = [
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
