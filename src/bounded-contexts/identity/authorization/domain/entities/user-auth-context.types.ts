import type { GroupId } from './group.entity';
import type { Permission } from './permission.entity';
import type { RoleId } from './role.entity';

/** User identifier */
export type UserId = string;

/** Source of a permission grant */
export interface PermissionSource {
  readonly type: 'direct' | 'role' | 'group';
  readonly sourceId: string;
  readonly sourceName: string;
  readonly inherited: boolean; // For groups: was this inherited from parent?
}

/** A resolved permission with its source(s) */
export interface ResolvedPermission {
  readonly permission: Permission;
  readonly sources: PermissionSource[];
  readonly granted: boolean; // false if explicitly denied
}

/** User Authorization Context Properties */
export interface UserAuthContextProps {
  readonly userId: UserId;
  readonly roleIds: Set<RoleId>;
  readonly groupIds: Set<GroupId>;
  readonly permissions: Map<string, ResolvedPermission>; // key = "resource:action"
  readonly resolvedAt: Date;
}
