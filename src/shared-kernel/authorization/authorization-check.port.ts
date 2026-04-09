/**
 * Authorization Check Port (ISP)
 *
 * Cross-cutting authorization abstraction for consumers outside the identity BC.
 * Narrow interface with only the permission-checking methods needed by guards and services.
 * Identity BC provides the implementation via its @Global() AuthorizationModule.
 */

export abstract class AuthorizationCheckPort {
  abstract hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  abstract hasAnyPermission(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean>;
  abstract hasAllPermissions(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean>;
  abstract hasRole(userId: string, roleIdOrName: string): Promise<boolean>;
}
