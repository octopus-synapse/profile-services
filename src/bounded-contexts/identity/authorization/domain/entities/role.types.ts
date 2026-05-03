import type { PermissionId } from './permission.entity';

/** Unique identifier for a Role */
export type RoleId = string;

/** Role value object properties */
export interface RoleProps {
  readonly id: RoleId;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly isSystem: boolean;
  readonly priority: number;
  readonly permissionIds: Set<PermissionId>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Role creation input */
export interface CreateRoleInput {
  name: string;
  displayName: string;
  description?: string;
  isSystem?: boolean;
  priority?: number;
}

/** Role update input */
export interface UpdateRoleInput {
  displayName?: string;
  description?: string;
  priority?: number;
}
