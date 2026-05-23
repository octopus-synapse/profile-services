/**
 * Role Entity
 *
 * Core domain entity representing a named collection of permissions.
 * Roles are the primary way to group permissions for assignment to users.
 *
 * Design Decision: Roles contain permission references (IDs), not full objects.
 * This follows the Aggregate pattern - Role is the aggregate root.
 */

import { assertRoleValid } from '../validation/role-validation';
import type { PermissionId } from './permission.entity';
import type { CreateRoleInput, RoleId, RoleProps, UpdateRoleInput } from './role.types';

export type { CreateRoleInput, RoleId, RoleProps, UpdateRoleInput };

/**
 * Immutable domain entity. All modifications return new instances.
 */
export class Role {
  private constructor(private readonly props: RoleProps) {
    assertRoleValid(props);
  }

  static create(input: CreateRoleInput): Role {
    return new Role({
      id: '',
      name: input.name.toLowerCase().trim().replace(/\s+/g, '_'),
      displayName: input.displayName.trim(),
      description: input.description?.trim(),
      isSystem: input.isSystem ?? false,
      priority: input.priority ?? 0,
      permissionIds: new Set(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(
    props: Omit<RoleProps, 'permissionIds'> & { permissionIds: PermissionId[] },
  ): Role {
    return new Role({ ...props, permissionIds: new Set(props.permissionIds) });
  }

  get id(): RoleId {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get displayName(): string {
    return this.props.displayName;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get isSystem(): boolean {
    return this.props.isSystem;
  }
  get priority(): number {
    return this.props.priority;
  }
  get permissionIds(): ReadonlySet<PermissionId> {
    return this.props.permissionIds;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  addPermission(permissionId: PermissionId): Role {
    if (this.props.permissionIds.has(permissionId)) return this;
    return this.withPermissions(new Set([...this.props.permissionIds, permissionId]));
  }

  addPermissions(permissionIds: PermissionId[]): Role {
    const next = new Set(this.props.permissionIds);
    let changed = false;
    for (const id of permissionIds) {
      if (!next.has(id)) {
        next.add(id);
        changed = true;
      }
    }
    return changed ? this.withPermissions(next) : this;
  }

  removePermission(permissionId: PermissionId): Role {
    if (!this.props.permissionIds.has(permissionId)) return this;
    const next = new Set(this.props.permissionIds);
    next.delete(permissionId);
    return this.withPermissions(next);
  }

  setPermissions(permissionIds: PermissionId[]): Role {
    return this.withPermissions(new Set(permissionIds));
  }

  hasPermission(permissionId: PermissionId): boolean {
    return this.props.permissionIds.has(permissionId);
  }

  canBeDeleted(): boolean {
    return !this.isSystem;
  }

  canBeModified(): boolean {
    return true;
  }

  update(input: UpdateRoleInput): Role {
    return new Role({
      ...this.props,
      displayName: input.displayName?.trim() ?? this.props.displayName,
      description: input.description?.trim() ?? this.props.description,
      priority: input.priority ?? this.props.priority,
      updatedAt: new Date(),
    });
  }

  /** Roles are equal if they have the same name */
  equals(other: Role): boolean {
    return this.name === other.name;
  }

  toJSON(): Omit<RoleProps, 'permissionIds'> & { permissionIds: PermissionId[] } {
    return { ...this.props, permissionIds: Array.from(this.props.permissionIds) };
  }

  private withPermissions(permissionIds: Set<PermissionId>): Role {
    return new Role({ ...this.props, permissionIds, updatedAt: new Date() });
  }
}
