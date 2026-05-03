/**
 * Group Entity
 *
 * Hierarchical grouping of roles. Immutable: all modifications return new instances.
 */

import { assertGroupValid } from '../validation/group-validation';
import type {
  CreateGroupInput,
  GroupId,
  GroupProps,
  SerializedGroup,
  UpdateGroupInput,
} from './group.types';
import type { PermissionId } from './permission.entity';
import type { RoleId } from './role.entity';

export type { CreateGroupInput, GroupId, GroupProps, UpdateGroupInput };

export class Group {
  private constructor(private readonly props: GroupProps) {
    assertGroupValid(props);
  }

  static create(input: CreateGroupInput): Group {
    return new Group({
      id: '',
      name: input.name.toLowerCase().trim().replace(/\s+/g, '_'),
      displayName: input.displayName.trim(),
      description: input.description?.trim(),
      isSystem: input.isSystem ?? false,
      parentId: input.parentId,
      roleIds: new Set(),
      permissionIds: new Set(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(
    props: Omit<GroupProps, 'roleIds' | 'permissionIds'> & {
      roleIds: RoleId[];
      permissionIds: PermissionId[];
    },
  ): Group {
    return new Group({
      ...props,
      roleIds: new Set(props.roleIds),
      permissionIds: new Set(props.permissionIds),
    });
  }

  get id(): GroupId {
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
  get parentId(): GroupId | undefined {
    return this.props.parentId;
  }
  get roleIds(): ReadonlySet<RoleId> {
    return this.props.roleIds;
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
  get isRoot(): boolean {
    return this.props.parentId === undefined;
  }

  addRole(roleId: RoleId): Group {
    if (this.props.roleIds.has(roleId)) return this;
    return this.withSet('roleIds', new Set([...this.props.roleIds, roleId]));
  }

  removeRole(roleId: RoleId): Group {
    if (!this.props.roleIds.has(roleId)) return this;
    const newSet = new Set(this.props.roleIds);
    newSet.delete(roleId);
    return this.withSet('roleIds', newSet);
  }

  hasRole(roleId: RoleId): boolean {
    return this.props.roleIds.has(roleId);
  }

  addPermission(permissionId: PermissionId): Group {
    if (this.props.permissionIds.has(permissionId)) return this;
    return this.withSet('permissionIds', new Set([...this.props.permissionIds, permissionId]));
  }

  removePermission(permissionId: PermissionId): Group {
    if (!this.props.permissionIds.has(permissionId)) return this;
    const newSet = new Set(this.props.permissionIds);
    newSet.delete(permissionId);
    return this.withSet('permissionIds', newSet);
  }

  hasPermission(permissionId: PermissionId): boolean {
    return this.props.permissionIds.has(permissionId);
  }

  setParent(parentId: GroupId | null): Group {
    return parentId === this.props.parentId ? this : this.with({ parentId: parentId ?? undefined });
  }

  wouldCreateCycle(potentialParentId: GroupId, ancestorIds: GroupId[]): boolean {
    return potentialParentId === this.props.id || ancestorIds.includes(this.props.id);
  }

  canBeDeleted(): boolean {
    return !this.isSystem;
  }

  update(input: UpdateGroupInput): Group {
    return new Group({
      ...this.props,
      displayName: input.displayName?.trim() ?? this.props.displayName,
      description: input.description?.trim() ?? this.props.description,
      parentId: input.parentId === null ? undefined : (input.parentId ?? this.props.parentId),
      updatedAt: new Date(),
    });
  }

  equals(other: Group): boolean {
    return this.name === other.name;
  }

  toJSON(): SerializedGroup {
    return {
      ...this.props,
      roleIds: [...this.props.roleIds],
      permissionIds: [...this.props.permissionIds],
    };
  }

  private with(partial: Partial<GroupProps>): Group {
    return new Group({ ...this.props, ...partial, updatedAt: new Date() });
  }
  private withSet<K extends 'roleIds' | 'permissionIds'>(key: K, value: GroupProps[K]): Group {
    return new Group({ ...this.props, [key]: value, updatedAt: new Date() });
  }
}
