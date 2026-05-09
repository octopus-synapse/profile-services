export interface PermissionSpec {
  readonly resource: string;
  readonly action: string;
}

export abstract class AuthorizationCheckPort {
  abstract hasPermission(userId: string, resource: string, action: string): Promise<boolean>;

  abstract hasAnyPermission(
    userId: string,
    permissions: ReadonlyArray<PermissionSpec>,
  ): Promise<boolean>;

  abstract hasAllPermissions(
    userId: string,
    permissions: ReadonlyArray<PermissionSpec>,
  ): Promise<boolean>;

  abstract hasRole(userId: string, roleIdOrName: string): Promise<boolean>;

  abstract countUsersWithRole(roleName: string): Promise<number>;
}
