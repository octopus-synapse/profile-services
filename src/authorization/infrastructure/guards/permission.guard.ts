/**
 * Authorization Guards and Decorators
 *
 * NestJS guards for the dynamic RBAC system.
 *
 * Single Responsibility: Enforce permission requirements on routes.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission('resume', 'create')
 *
 * Or using composite decorators:
 * @Protected('resume', 'create')
 * @AdminOnly()
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  applyDecorators,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../../services/authorization.service';

// ============================================================================
// Metadata Keys
// ============================================================================

export const PERMISSION_KEY = 'required_permission';
export const PERMISSIONS_KEY = 'required_permissions';
export const PERMISSION_STRATEGY_KEY = 'permission_strategy';
export const ROLE_KEY = 'required_role';
export const ROLES_KEY = 'required_roles';

// ============================================================================
// Types
// ============================================================================

export interface PermissionRequirement {
  resource: string;
  action: string;
}

export type PermissionStrategy = 'any' | 'all';

// ============================================================================
// Permission Decorators
// ============================================================================

/**
 * Require a single permission
 *
 * @example
 * @RequirePermission('resume', 'create')
 * @RequirePermission('user', 'delete')
 */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action });

/**
 * Require multiple permissions with a strategy
 *
 * @example
 * @RequirePermissions([
 *   { resource: 'resume', action: 'read' },
 *   { resource: 'resume', action: 'update' },
 * ], 'all')
 */
export const RequirePermissions = (
  permissions: PermissionRequirement[],
  strategy: PermissionStrategy = 'all',
) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSION_STRATEGY_KEY, strategy),
  );

/**
 * Shorthand: Require manage permission on a resource (implies all actions)
 *
 * @example
 * @CanManage('resume')
 */
export const CanManage = (resource: string) =>
  RequirePermission(resource, 'manage');

/**
 * Composite decorator: Apply guard + permission requirement
 *
 * @example
 * @Protected('resume', 'create')
 */
export const Protected = (resource: string, action: string) =>
  applyDecorators(
    RequirePermission(resource, action),
    UseGuards(PermissionGuard),
  );

// ============================================================================
// Role Decorators
// ============================================================================

/**
 * Require a specific role (by name)
 *
 * @example
 * @RequireRole('admin')
 * @RequireRole('content_moderator')
 */
export const RequireRole = (roleName: string) =>
  SetMetadata(ROLE_KEY, roleName);

/**
 * Require any of the specified roles
 *
 * @example
 * @RequireRoles(['admin', 'approver'])
 */
export const RequireRoles = (roleNames: string[]) =>
  SetMetadata(ROLES_KEY, roleNames);

// ============================================================================
// Composite Decorators (Convenience)
// ============================================================================

/**
 * Composite decorator: Require admin permission
 *
 * @example
 * @AdminOnly()
 */
export const AdminOnly = () =>
  applyDecorators(RequirePermission('*', 'manage'), UseGuards(PermissionGuard));

/**
 * Composite decorator: Require theme approval permission
 *
 * @example
 * @ApproverOnly()
 */
export const ApproverOnly = () =>
  applyDecorators(
    RequirePermission('theme', 'approve'),
    UseGuards(PermissionGuard),
  );

/**
 * Composite decorator: Require any of admin or approver permissions
 *
 * @example
 * @AdminOrApprover()
 */
export const AdminOrApprover = () =>
  applyDecorators(
    RequirePermissions(
      [
        { resource: '*', action: 'manage' },
        { resource: 'theme', action: 'approve' },
      ],
      'any',
    ),
    UseGuards(PermissionGuard),
  );

// ============================================================================
// Permission Guard
// ============================================================================

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for single permission requirement
    const singlePermission = this.reflector.getAllAndOverride<
      PermissionRequirement | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // Check for multiple permissions requirement
    const multiplePermissions = this.reflector.getAllAndOverride<
      PermissionRequirement[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // Check for role requirements
    const singleRole = this.reflector.getAllAndOverride<string | undefined>(
      ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const multipleRoles = this.reflector.getAllAndOverride<
      string[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // No requirements = allow access (public route)
    const hasNoRequirements =
      !singlePermission &&
      (!multiplePermissions || multiplePermissions.length === 0) &&
      !singleRole &&
      (!multipleRoles || multipleRoles.length === 0);

    if (hasNoRequirements) {
      return true;
    }

    // Get user from request
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id: string } }>();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }

    // Check permission-based requirements
    if (singlePermission) {
      const hasPermission = await this.authService.hasPermission(
        user.id,
        singlePermission.resource,
        singlePermission.action,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Permission denied: ${singlePermission.resource}:${singlePermission.action}`,
        );
      }
    }

    if (multiplePermissions && multiplePermissions.length > 0) {
      const strategy =
        this.reflector.getAllAndOverride<PermissionStrategy>(
          PERMISSION_STRATEGY_KEY,
          [context.getHandler(), context.getClass()],
        ) ?? 'all';

      const hasPermission =
        strategy === 'all'
          ? await this.authService.hasAllPermissions(
              user.id,
              multiplePermissions,
            )
          : await this.authService.hasAnyPermission(
              user.id,
              multiplePermissions,
            );

      if (!hasPermission) {
        const permissionList = multiplePermissions
          .map((p) => `${p.resource}:${p.action}`)
          .join(', ');

        throw new ForbiddenException(
          `Permission denied: requires ${strategy === 'all' ? 'all of' : 'any of'} [${permissionList}]`,
        );
      }
    }

    // Check role-based requirements
    if (singleRole) {
      const hasRole = await this.authService.hasRole(user.id, singleRole);

      if (!hasRole) {
        throw new ForbiddenException(
          `Permission denied: requires role "${singleRole}"`,
        );
      }
    }

    if (multipleRoles && multipleRoles.length > 0) {
      let hasAnyRole = false;
      for (const roleName of multipleRoles) {
        if (await this.authService.hasRole(user.id, roleName)) {
          hasAnyRole = true;
          break;
        }
      }

      if (!hasAnyRole) {
        throw new ForbiddenException(
          `Permission denied: requires any of roles [${multipleRoles.join(', ')}]`,
        );
      }
    }

    return true;
  }
}
