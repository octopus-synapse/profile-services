/**
 * Permission Guard
 *
 * NestJS guard that enforces permission requirements.
 * Works with @RequirePermission and @RequirePermissions decorators.
 *
 * Expects request.user to have a `roles` array populated by JwtAuthGuard.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from './permission.enum';
import { hasAllPermissions, hasAnyPermission, hasPermission } from './permission-resolver';
import {
  PERMISSION_KEY,
  PERMISSION_STRATEGY_KEY,
  PERMISSIONS_KEY,
  type PermissionStrategy,
} from './require-permission.decorator';

interface AuthenticatedUser {
  id: string;
  roles: string[];
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get single permission requirement
    const singlePermission = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get multiple permissions requirement
    const multiplePermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission required = allow (route is public or auth-only)
    if (!singlePermission && (!multiplePermissions || multiplePermissions.length === 0)) {
      return true;
    }

    // Get user from request
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('User roles not available');
    }

    // Check single permission
    if (singlePermission) {
      if (!hasPermission(user.roles, singlePermission)) {
        throw new ForbiddenException(`Permission denied: ${singlePermission}`);
      }
      return true;
    }

    // Check multiple permissions
    if (multiplePermissions && multiplePermissions.length > 0) {
      const strategy = this.reflector.getAllAndOverride<PermissionStrategy>(
        PERMISSION_STRATEGY_KEY,
        [context.getHandler(), context.getClass()],
      );

      const allowed =
        strategy === 'any'
          ? hasAnyPermission(user.roles, multiplePermissions)
          : hasAllPermissions(user.roles, multiplePermissions);

      if (!allowed) {
        const permList = multiplePermissions.join(', ');
        throw new ForbiddenException(
          `Permission denied: requires ${strategy === 'any' ? 'any of' : 'all of'} [${permList}]`,
        );
      }
    }

    return true;
  }
}
