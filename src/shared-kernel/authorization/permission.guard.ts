/**
 * Permission Guard
 *
 * NestJS guard that enforces permission requirements.
 * Works with @RequirePermission and @RequirePermissions decorators.
 *
 * Supports BOTH:
 * - Static permissions (Permission enum, resolved via pure functions from user.roles)
 * - Dynamic permissions (resource+action objects, resolved via AuthorizationCheckPort)
 *
 * Expects request.user to have a `roles` array populated by JwtAuthGuard.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationCheckPort } from './authorization-check.port';
import { Permission } from './permission.enum';
import { hasAllPermissions, hasAnyPermission, hasPermission } from './permission-resolver';
import {
  PERMISSION_KEY,
  PERMISSION_STRATEGY_KEY,
  PERMISSIONS_KEY,
  type PermissionStrategy,
} from './require-permission.decorator';

// ============================================================================
// Metadata Keys for Role-based Decorators
// ============================================================================

export const ROLE_KEY = 'required_role';
export const ROLES_KEY = 'required_roles';

// ============================================================================
// Types
// ============================================================================

interface DynamicPermission {
  resource: string;
  action: string;
}

interface AuthenticatedUser {
  id: string;
  roles: string[];
}

type PermissionMetadata = Permission | DynamicPermission;
type PermissionsMetadata = Permission[] | DynamicPermission[];

function isDynamicPermission(value: unknown): value is DynamicPermission {
  return typeof value === 'object' && value !== null && 'resource' in value && 'action' in value;
}

function isDynamicPermissionArray(value: unknown[]): value is DynamicPermission[] {
  return value.length > 0 && isDynamicPermission(value[0]);
}

// ============================================================================
// Guard
// ============================================================================

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(AuthorizationCheckPort)
    private readonly authCheck?: AuthorizationCheckPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get user from request (needed for all checks)
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // ========================================================================
    // Role-based checks (ROLE_KEY / ROLES_KEY)
    // ========================================================================

    const singleRole = this.reflector.getAllAndOverride<string | undefined>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const multipleRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (singleRole || (multipleRoles && multipleRoles.length > 0)) {
      this.ensureUser(user);
      this.ensureAuthCheck('role-based');

      if (singleRole) {
        const has = await this.authCheck?.hasRole(user?.id, singleRole);
        if (!has) {
          throw new ForbiddenException(`Permission denied: requires role '${singleRole}'`);
        }
        return true;
      }

      if (multipleRoles && multipleRoles.length > 0) {
        // Check if user has ANY of the required roles
        const results = await Promise.all(
          multipleRoles.map((role) => this.authCheck?.hasRole(user?.id, role)),
        );
        if (!results.some(Boolean)) {
          throw new ForbiddenException(
            `Permission denied: requires any role of [${multipleRoles.join(', ')}]`,
          );
        }
        return true;
      }
    }

    // ========================================================================
    // Single permission check (PERMISSION_KEY)
    // ========================================================================

    const singlePermission = this.reflector.getAllAndOverride<PermissionMetadata | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // ========================================================================
    // Multiple permissions check (PERMISSIONS_KEY)
    // ========================================================================

    const multiplePermissions = this.reflector.getAllAndOverride<PermissionsMetadata | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission required = allow (route is public or auth-only)
    if (!singlePermission && (!multiplePermissions || multiplePermissions.length === 0)) {
      return true;
    }

    this.ensureUser(user);

    // Handle single permission
    if (singlePermission) {
      if (isDynamicPermission(singlePermission)) {
        // Dynamic: use AuthorizationCheckPort
        this.ensureAuthCheck('dynamic permission');
        const allowed = await this.authCheck?.hasPermission(
          user?.id,
          singlePermission.resource,
          singlePermission.action,
        );
        if (!allowed) {
          throw new ForbiddenException(
            `Permission denied: ${singlePermission.resource}:${singlePermission.action}`,
          );
        }
      } else {
        // Static: use pure function with roles
        if (!hasPermission(user?.roles, singlePermission)) {
          throw new ForbiddenException(`Permission denied: ${singlePermission}`);
        }
      }
      return true;
    }

    // Handle multiple permissions
    if (multiplePermissions && multiplePermissions.length > 0) {
      const strategy = this.reflector.getAllAndOverride<PermissionStrategy>(
        PERMISSION_STRATEGY_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (isDynamicPermissionArray(multiplePermissions)) {
        // Dynamic: use AuthorizationCheckPort
        this.ensureAuthCheck('dynamic permissions');
        const allowed =
          strategy === 'any'
            ? await this.authCheck?.hasAnyPermission(user?.id, multiplePermissions)
            : await this.authCheck?.hasAllPermissions(user?.id, multiplePermissions);

        if (!allowed) {
          const permList = multiplePermissions.map((p) => `${p.resource}:${p.action}`).join(', ');
          throw new ForbiddenException(
            `Permission denied: requires ${strategy === 'any' ? 'any of' : 'all of'} [${permList}]`,
          );
        }
      } else {
        // Static: use pure functions with roles
        const staticPerms = multiplePermissions as Permission[];
        const allowed =
          strategy === 'any'
            ? hasAnyPermission(user?.roles, staticPerms)
            : hasAllPermissions(user?.roles, staticPerms);

        if (!allowed) {
          const permList = staticPerms.join(', ');
          throw new ForbiddenException(
            `Permission denied: requires ${strategy === 'any' ? 'any of' : 'all of'} [${permList}]`,
          );
        }
      }
    }

    return true;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private ensureUser(user: AuthenticatedUser | undefined): asserts user is AuthenticatedUser {
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (!user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('User roles not available');
    }
  }

  private ensureAuthCheck(context: string): void {
    if (!this.authCheck) {
      throw new ForbiddenException(
        `AuthorizationCheckPort is not available. Cannot perform ${context} check. ` +
          'Ensure AuthorizationModule is imported.',
      );
    }
  }
}
