/**
 * RequirePermission Decorator
 *
 * Declares required permission for an endpoint.
 *
 * Supports BOTH:
 * - Static: @RequirePermission(Permission.RESUME_CREATE)
 * - Dynamic: @RequirePermission('resume', 'create')
 *
 * Reads like prose: "Require Permission RESUME_CREATE to access this endpoint"
 */
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Permission } from './permission.enum';
import { PermissionGuard, ROLE_KEY, ROLES_KEY } from './permission.guard';

export const PERMISSION_KEY = 'required_permission';
export const PERMISSIONS_KEY = 'required_permissions';
export const PERMISSION_STRATEGY_KEY = 'permission_strategy';

export type PermissionStrategy = 'any' | 'all';

// ============================================================================
// Single Permission Decorator (overloaded)
// ============================================================================

/**
 * Require a single permission to access the endpoint.
 *
 * @example
 * // Static (Permission enum)
 * @RequirePermission(Permission.RESUME_CREATE)
 * @Post()
 * create() {}
 *
 * @example
 * // Dynamic (resource + action)
 * @RequirePermission('resume', 'create')
 * @Post()
 * create() {}
 */
export function RequirePermission(permission: Permission): ReturnType<typeof applyDecorators>;
export function RequirePermission(
  resource: string,
  action: string,
): ReturnType<typeof applyDecorators>;
export function RequirePermission(permissionOrResource: Permission | string, action?: string) {
  const metadata =
    action !== undefined ? { resource: permissionOrResource, action } : permissionOrResource;
  const description =
    action !== undefined ? `${permissionOrResource}:${action}` : String(permissionOrResource);

  return applyDecorators(
    SetMetadata(PERMISSION_KEY, metadata),
    UseGuards(PermissionGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Authentication required' }),
    ApiForbiddenResponse({ description: `Requires permission: ${description}` }),
  );
}

// ============================================================================
// Multiple Permissions Decorator (overloaded)
// ============================================================================

/**
 * Require multiple permissions with a strategy.
 *
 * @example
 * // Static: Require ALL permissions
 * @RequirePermissions([Permission.RESUME_UPDATE, Permission.RESUME_SHARE], 'all')
 *
 * // Static: Require ANY permission
 * @RequirePermissions([Permission.THEME_APPROVE, Permission.ADMIN_FULL_ACCESS], 'any')
 *
 * // Dynamic: Require ANY permission
 * @RequirePermissions([{ resource: '*', action: 'manage' }, { resource: 'theme', action: 'approve' }], 'any')
 */
export function RequirePermissions(
  permissions: Permission[] | Array<{ resource: string; action: string }>,
  strategy: PermissionStrategy = 'all',
) {
  const description = permissions
    .map((p) => (typeof p === 'string' ? p : `${p.resource}:${p.action}`))
    .join(', ');

  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSION_STRATEGY_KEY, strategy),
    UseGuards(PermissionGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Authentication required' }),
    ApiForbiddenResponse({
      description: `Requires ${strategy === 'all' ? 'all' : 'any'} of: ${description}`,
    }),
  );
}

// ============================================================================
// Shortcut Decorators
// ============================================================================

/**
 * Shortcut: Require admin full access.
 *
 * @example
 * @AdminOnly()
 * @Delete(':id')
 * forceDelete() {}
 */
export const AdminOnly = () => RequirePermission(Permission.ADMIN_FULL_ACCESS);

// ============================================================================
// Role-based Decorators
// ============================================================================

/**
 * Require a specific role to access the endpoint.
 *
 * @example
 * @RequireRole('admin')
 * @Get('admin-panel')
 * adminPanel() {}
 */
export const RequireRole = (roleName: string) => SetMetadata(ROLE_KEY, roleName);

/**
 * Require any of the specified roles to access the endpoint.
 *
 * @example
 * @RequireRoles(['admin', 'moderator'])
 * @Get('moderation')
 * moderation() {}
 */
export const RequireRoles = (roleNames: string[]) => SetMetadata(ROLES_KEY, roleNames);

// ============================================================================
// Semantic / Domain-specific Decorators
// ============================================================================

/**
 * Require 'manage' permission on a resource.
 *
 * @example
 * @CanManage('theme')
 * @Put(':id')
 * updateTheme() {}
 */
export const CanManage = (resource: string) => RequirePermission(resource, 'manage');

/**
 * Require a specific resource+action permission. Alias for RequirePermission(resource, action).
 *
 * @example
 * @Protected('resume', 'create')
 * @Post()
 * createResume() {}
 */
export const Protected = (resource: string, action: string) => RequirePermission(resource, action);

/**
 * Require theme approval permission.
 */
export const ApproverOnly = () => RequirePermission('theme', 'approve');

/**
 * Require either full admin access or theme approval permission.
 */
export const AdminOrApprover = () =>
  RequirePermissions(
    [
      { resource: '*', action: 'manage' },
      { resource: 'theme', action: 'approve' },
    ],
    'any',
  );
