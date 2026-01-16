/**
 * User Authorization Context
 *
 * Value object representing a user's complete authorization context.
 * This is the aggregated view of all permissions a user has from
 * all sources: direct permissions, roles, groups, and inheritance.
 *
 * Single Responsibility: Represents the resolved authorization state
 * for a single user at a point in time.
 *
 * Design Decision: This is a snapshot - permissions can change,
 * so this should be refreshed when needed.
 */

import type { Permission, PermissionId } from './permission.entity';
import type { RoleId } from './role.entity';
import type { GroupId } from './group.entity';

/**
 * User identifier
 */
export type UserId = string;

/**
 * Source of a permission grant
 */
export interface PermissionSource {
  readonly type: 'direct' | 'role' | 'group';
  readonly sourceId: string;
  readonly sourceName: string;
  readonly inherited: boolean; // For groups: was this inherited from parent?
}

/**
 * A resolved permission with its source(s)
 */
export interface ResolvedPermission {
  readonly permission: Permission;
  readonly sources: PermissionSource[];
  readonly granted: boolean; // false if explicitly denied
}

/**
 * User Authorization Context Properties
 */
export interface UserAuthContextProps {
  readonly userId: UserId;
  readonly roleIds: Set<RoleId>;
  readonly groupIds: Set<GroupId>;
  readonly permissions: Map<string, ResolvedPermission>; // key = "resource:action"
  readonly resolvedAt: Date;
}

/**
 * User Authorization Context
 *
 * Immutable value object representing a user's complete permissions.
 */
export class UserAuthContext {
  private constructor(private readonly props: UserAuthContextProps) {}

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create an empty context (no permissions)
   */
  static empty(userId: UserId): UserAuthContext {
    return new UserAuthContext({
      userId,
      roleIds: new Set(),
      groupIds: new Set(),
      permissions: new Map(),
      resolvedAt: new Date(),
    });
  }

  /**
   * Create from resolved data
   */
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

  // ============================================================================
  // Getters
  // ============================================================================

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

  /**
   * Get all granted permission keys
   */
  get grantedPermissionKeys(): string[] {
    const keys: string[] = [];
    for (const [key, resolved] of this.props.permissions) {
      if (resolved.granted) {
        keys.push(key);
      }
    }
    return keys;
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  /**
   * Check if user has a specific permission
   */
  hasPermission(resource: string, action: string): boolean {
    const key = `${resource.toLowerCase()}:${action.toLowerCase()}`;

    // Check for explicit permission
    const resolved = this.props.permissions.get(key);
    if (resolved) {
      return resolved.granted;
    }

    // Check for "manage" permission on resource (implies all actions)
    const manageKey = `${resource.toLowerCase()}:manage`;
    const manageResolved = this.props.permissions.get(manageKey);
    if (manageResolved?.granted) {
      return true;
    }

    // Check for super-admin (*:manage)
    const superAdminKey = '*:manage';
    const superAdminResolved = this.props.permissions.get(superAdminKey);
    if (superAdminResolved?.granted) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(
    permissions: Array<{ resource: string; action: string }>,
  ): boolean {
    return permissions.some((p) => this.hasPermission(p.resource, p.action));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(
    permissions: Array<{ resource: string; action: string }>,
  ): boolean {
    return permissions.every((p) => this.hasPermission(p.resource, p.action));
  }

  /**
   * Check if user has a specific role
   */
  hasRole(roleId: RoleId): boolean {
    return this.props.roleIds.has(roleId);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roleIds: RoleId[]): boolean {
    return roleIds.some((id) => this.props.roleIds.has(id));
  }

  /**
   * Check if user belongs to a specific group
   */
  inGroup(groupId: GroupId): boolean {
    return this.props.groupIds.has(groupId);
  }

  /**
   * Check if user belongs to any of the specified groups
   */
  inAnyGroup(groupIds: GroupId[]): boolean {
    return groupIds.some((id) => this.props.groupIds.has(id));
  }

  // ============================================================================
  // Introspection
  // ============================================================================

  /**
   * Get the source(s) of a specific permission
   */
  getPermissionSources(resource: string, action: string): PermissionSource[] {
    const key = `${resource.toLowerCase()}:${action.toLowerCase()}`;
    return this.props.permissions.get(key)?.sources ?? [];
  }

  /**
   * Get all permissions for a specific resource
   */
  getResourcePermissions(resource: string): ResolvedPermission[] {
    const results: ResolvedPermission[] = [];
    const prefix = `${resource.toLowerCase()}:`;

    for (const [key, resolved] of this.props.permissions) {
      if (key.startsWith(prefix) && resolved.granted) {
        results.push(resolved);
      }
    }

    return results;
  }

  /**
   * Check if context is stale (older than specified seconds)
   */
  isStale(maxAgeSeconds: number): boolean {
    const ageMs = Date.now() - this.props.resolvedAt.getTime();
    return ageMs > maxAgeSeconds * 1000;
  }

  // ============================================================================
  // Serialization
  // ============================================================================

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
