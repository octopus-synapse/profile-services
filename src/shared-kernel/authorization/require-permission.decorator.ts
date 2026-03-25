/**
 * RequirePermission Decorator
 *
 * Declares required permission for an endpoint.
 * Usage: @RequirePermission(Permission.RESUME_CREATE)
 *
 * Reads like prose: "Require Permission RESUME_CREATE to access this endpoint"
 */
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Permission } from './permission.enum';
import { PermissionGuard } from './permission.guard';

export const PERMISSION_KEY = 'required_permission';
export const PERMISSIONS_KEY = 'required_permissions';
export const PERMISSION_STRATEGY_KEY = 'permission_strategy';

export type PermissionStrategy = 'any' | 'all';

/**
 * Require a single permission to access the endpoint.
 *
 * @example
 * @RequirePermission(Permission.RESUME_CREATE)
 * @Post()
 * create() {}
 */
export const RequirePermission = (permission: Permission) =>
  applyDecorators(
    SetMetadata(PERMISSION_KEY, permission),
    UseGuards(PermissionGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Authentication required' }),
    ApiForbiddenResponse({ description: `Requires permission: ${permission}` }),
  );

/**
 * Require multiple permissions with a strategy.
 *
 * @example
 * // Require ALL permissions
 * @RequirePermissions([Permission.RESUME_UPDATE, Permission.RESUME_SHARE], 'all')
 *
 * // Require ANY permission
 * @RequirePermissions([Permission.THEME_APPROVE, Permission.ADMIN_FULL_ACCESS], 'any')
 */
export const RequirePermissions = (
  permissions: Permission[],
  strategy: PermissionStrategy = 'all',
) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSION_STRATEGY_KEY, strategy),
    UseGuards(PermissionGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Authentication required' }),
    ApiForbiddenResponse({
      description: `Requires ${strategy === 'all' ? 'all' : 'any'} of: ${permissions.join(', ')}`,
    }),
  );

/**
 * Shortcut: Require admin full access.
 *
 * @example
 * @AdminOnly()
 * @Delete(':id')
 * forceDelete() {}
 */
export const AdminOnly = () => RequirePermission(Permission.ADMIN_FULL_ACCESS);
