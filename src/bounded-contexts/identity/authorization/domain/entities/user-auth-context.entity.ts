/**
 * User Authorization Context
 *
 * Value object representing a user's complete authorization context — the
 * aggregated view of all permissions a user has from direct grants, roles,
 * groups, and inheritance.
 *
 * Snapshot semantics: permissions can change, refresh when needed.
 */

import type { GroupId } from './group.entity';
import type { RoleId } from './role.entity';
import type {
  PermissionSource,
  ResolvedPermission,
  UserAuthContextProps,
  UserId,
} from './user-auth-context.types';

export type { PermissionSource, ResolvedPermission, UserAuthContextProps, UserId };

/** Immutable value object representing a user's complete permissions. */
export class UserAuthContext {
  private constructor(private readonly props: UserAuthContextProps) {}

  static empty(userId: UserId): UserAuthContext {
    return new UserAuthContext({
      userId,
      roleIds: new Set(),
      groupIds: new Set(),
      permissions: new Map(),
      resolvedAt: new Date(),
    });
  }

  static create(props: {
    userId: UserId;
    roleIds: RoleId[];
    groupIds: GroupId[];
    permissions: ResolvedPermission[];
  }): UserAuthContext {
    const permissionMap = new Map<string, ResolvedPermission>();
    for (const resolved of props.permissions) {
      permissionMap.set(resolved.permission.key, resolved);
    }
    return new UserAuthContext({
      userId: props.userId,
      roleIds: new Set(props.roleIds),
      groupIds: new Set(props.groupIds),
      permissions: permissionMap,
      resolvedAt: new Date(),
    });
  }

  get userId(): UserId {
    return this.props.userId;
  }
  get roleIds(): ReadonlySet<RoleId> {
    return this.props.roleIds;
  }
  get groupIds(): ReadonlySet<GroupId> {
    return this.props.groupIds;
  }
  get resolvedAt(): Date {
    return this.props.resolvedAt;
  }

  /** Get all granted permission keys */
  get grantedPermissionKeys(): string[] {
    const keys: string[] = [];
    for (const [key, resolved] of this.props.permissions) {
      if (resolved.granted) keys.push(key);
    }
    return keys;
  }

  hasPermission(resource: string, action: string): boolean {
    const r = resource.toLowerCase();
    const resolved = this.props.permissions.get(`${r}:${action.toLowerCase()}`);
    if (resolved) return resolved.granted;
    // `{r}:manage` implies all actions on resource; `*:manage` is super-admin
    if (this.props.permissions.get(`${r}:manage`)?.granted) return true;
    if (this.props.permissions.get('*:manage')?.granted) return true;
    return false;
  }

  hasAnyPermission(permissions: Array<{ resource: string; action: string }>): boolean {
    return permissions.some((p) => this.hasPermission(p.resource, p.action));
  }

  hasAllPermissions(permissions: Array<{ resource: string; action: string }>): boolean {
    return permissions.every((p) => this.hasPermission(p.resource, p.action));
  }

  hasRole(roleId: RoleId): boolean {
    return this.props.roleIds.has(roleId);
  }

  hasAnyRole(roleIds: RoleId[]): boolean {
    return roleIds.some((id) => this.props.roleIds.has(id));
  }

  inGroup(groupId: GroupId): boolean {
    return this.props.groupIds.has(groupId);
  }

  inAnyGroup(groupIds: GroupId[]): boolean {
    return groupIds.some((id) => this.props.groupIds.has(id));
  }

  getPermissionSources(resource: string, action: string): PermissionSource[] {
    const key = `${resource.toLowerCase()}:${action.toLowerCase()}`;
    return this.props.permissions.get(key)?.sources ?? [];
  }

  getResourcePermissions(resource: string): ResolvedPermission[] {
    const results: ResolvedPermission[] = [];
    const prefix = `${resource.toLowerCase()}:`;
    for (const [key, resolved] of this.props.permissions) {
      if (key.startsWith(prefix) && resolved.granted) results.push(resolved);
    }
    return results;
  }

  /** Check if context is stale (older than specified seconds) */
  isStale(maxAgeSeconds: number): boolean {
    return Date.now() - this.props.resolvedAt.getTime() > maxAgeSeconds * 1000;
  }

  toJSON(): {
    userId: UserId;
    roleIds: RoleId[];
    groupIds: GroupId[];
    permissions: string[];
    resolvedAt: string;
  } {
    return {
      userId: this.props.userId,
      roleIds: Array.from(this.props.roleIds),
      groupIds: Array.from(this.props.groupIds),
      permissions: this.grantedPermissionKeys,
      resolvedAt: this.props.resolvedAt.toISOString(),
    };
  }
}
