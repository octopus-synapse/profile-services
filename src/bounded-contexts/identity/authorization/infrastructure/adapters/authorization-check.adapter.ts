import {
  AuthorizationCheckPort,
  type PermissionSpec,
} from '@/shared-kernel/authorization/authorization-check.port';
import type { AuthorizationCheckUseCases } from '../../application/ports/authorization-use-cases.port';

/**
 * Concrete `AuthorizationCheckPort` over the authorization BC's check
 * use-cases. Lets other BCs (e.g. chat message-privacy) ask permission/role
 * questions without reaching into authorization internals.
 */
export class AuthorizationCheckAdapter extends AuthorizationCheckPort {
  /**
   * Takes a getter (not the bundle directly) so the bootstrap can wire this
   * before the authorization bundle is constructed — the closure resolves it
   * lazily at request time, by which point bootstrap has finished.
   */
  constructor(private readonly getChecks: () => AuthorizationCheckUseCases) {
    super();
  }

  hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    return this.getChecks().checkPermissionUseCase.execute(userId, resource, action);
  }

  hasAnyPermission(userId: string, permissions: ReadonlyArray<PermissionSpec>): Promise<boolean> {
    return this.getChecks().checkAnyPermissionUseCase.execute(
      userId,
      permissions.map((p) => ({ resource: p.resource, action: p.action })),
    );
  }

  hasAllPermissions(userId: string, permissions: ReadonlyArray<PermissionSpec>): Promise<boolean> {
    return this.getChecks().checkAllPermissionsUseCase.execute(
      userId,
      permissions.map((p) => ({ resource: p.resource, action: p.action })),
    );
  }

  hasRole(userId: string, roleIdOrName: string): Promise<boolean> {
    return this.getChecks().checkRoleUseCase.execute(userId, roleIdOrName);
  }

  countUsersWithRole(roleName: string): Promise<number> {
    return this.getChecks().countUsersWithRoleUseCase.execute(roleName);
  }
}
