import type { PermissionId } from './permission.entity';
import type { RoleId } from './role.entity';

/** Unique identifier for a Group */
export type GroupId = string;

/** Group value object properties */
export interface GroupProps {
  readonly id: GroupId;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly isSystem: boolean;
  readonly parentId?: GroupId;
  readonly roleIds: Set<RoleId>;
  readonly permissionIds: Set<PermissionId>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Group creation input */
export interface CreateGroupInput {
  name: string;
  displayName: string;
  description?: string;
  isSystem?: boolean;
  parentId?: GroupId;
}

/** Group update input */
export interface UpdateGroupInput {
  displayName?: string;
  description?: string;
  parentId?: GroupId | null;
}

/** Serialized group for persistence */
export interface SerializedGroup extends Omit<GroupProps, 'roleIds' | 'permissionIds'> {
  roleIds: RoleId[];
  permissionIds: PermissionId[];
}
