/**
 * Group Entity
 *
 * Core domain entity representing a hierarchical grouping of roles.
 * Groups can inherit from parent groups, creating a tree structure
 * that allows for flexible permission inheritance.
 *
 * Single Responsibility: Encapsulates group hierarchy and role aggregation.
 *
 * Design Decision:
 * - Groups can have ONE parent (tree, not graph)
 * - Permissions flow DOWN the hierarchy (parent → child)
 * - Direct permissions on group ADD to inherited permissions
 * - No circular references allowed
 */

import type { RoleId } from './role.entity';
import type { PermissionId } from './permission.entity';

/**
 * Unique identifier for a Group
 */
export type GroupId = string;

/**
 * Group value object properties
 */
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

/**
 * Group creation input
 */
export interface CreateGroupInput {
  name: string;
  displayName: string;
  description?: string;
  isSystem?: boolean;
  parentId?: GroupId;
}

/**
 * Group update input
 */
export interface UpdateGroupInput {
  displayName?: string;
  description?: string;
  parentId?: GroupId | null; // null to remove parent
}

/**
 * Group Entity
 *
 * Immutable domain entity. All modifications return new instances.
 */
export class Group {
  private constructor(private readonly props: GroupProps) {
    this.validate();
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create a new Group instance
   */
  static create(input: CreateGroupInput): Group {
    return new Group({
      id: '', // Will be assigned by repository
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

  /**
   * Reconstitute from persistence
   */
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

  // ============================================================================
  // Getters (Read-Only Access)
  // ============================================================================

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

  /**
   * Check if this is a root group (no parent)
   */
  get isRoot(): boolean {
    return this.props.parentId === undefined;
  }

  // ============================================================================
  // Domain Behavior: Roles
  // ============================================================================

  /**
   * Add a role to this group
   */
  addRole(roleId: RoleId): Group {
    if (this.props.roleIds.has(roleId)) {
      return this;
    }

    const newRoleIds = new Set(this.props.roleIds);
    newRoleIds.add(roleId);

    return new Group({
      ...this.props,
      roleIds: newRoleIds,
      updatedAt: new Date(),
    });
  }

  /**
   * Add multiple roles to this group
   */
  addRoles(roleIds: RoleId[]): Group {
    const newRoleIds = new Set(this.props.roleIds);
    let changed = false;

    for (const roleId of roleIds) {
      if (!newRoleIds.has(roleId)) {
        newRoleIds.add(roleId);
        changed = true;
      }
    }

    if (!changed) {
      return this;
    }

    return new Group({
      ...this.props,
      roleIds: newRoleIds,
      updatedAt: new Date(),
    });
  }

  /**
   * Remove a role from this group
   */
  removeRole(roleId: RoleId): Group {
    if (!this.props.roleIds.has(roleId)) {
      return this;
    }

    const newRoleIds = new Set(this.props.roleIds);
    newRoleIds.delete(roleId);

    return new Group({
      ...this.props,
      roleIds: newRoleIds,
      updatedAt: new Date(),
    });
  }

  /**
   * Check if this group has a specific role
   */
  hasRole(roleId: RoleId): boolean {
    return this.props.roleIds.has(roleId);
  }

  // ============================================================================
  // Domain Behavior: Permissions
  // ============================================================================

  /**
   * Add a direct permission to this group
   */
  addPermission(permissionId: PermissionId): Group {
    if (this.props.permissionIds.has(permissionId)) {
      return this;
    }

    const newPermissionIds = new Set(this.props.permissionIds);
    newPermissionIds.add(permissionId);

    return new Group({
      ...this.props,
      permissionIds: newPermissionIds,
      updatedAt: new Date(),
    });
  }

  /**
   * Remove a direct permission from this group
   */
  removePermission(permissionId: PermissionId): Group {
    if (!this.props.permissionIds.has(permissionId)) {
      return this;
    }

    const newPermissionIds = new Set(this.props.permissionIds);
    newPermissionIds.delete(permissionId);

    return new Group({
      ...this.props,
      permissionIds: newPermissionIds,
      updatedAt: new Date(),
    });
  }

  /**
   * Check if this group has a specific direct permission
   */
  hasPermission(permissionId: PermissionId): boolean {
    return this.props.permissionIds.has(permissionId);
  }

  // ============================================================================
  // Domain Behavior: Hierarchy
  // ============================================================================

  /**
   * Set the parent group
   */
  setParent(parentId: GroupId | null): Group {
    if (parentId === this.props.parentId) {
      return this;
    }

    return new Group({
      ...this.props,
      parentId: parentId ?? undefined,
      updatedAt: new Date(),
    });
  }

  /**
   * Check if setting a parent would create a cycle
   * Note: This requires the full ancestor chain - domain service responsibility
   */
  wouldCreateCycle(
    potentialParentId: GroupId,
    ancestorIds: GroupId[],
  ): boolean {
    // Cannot be own parent
    if (potentialParentId === this.props.id) {
      return true;
    }

    // Cannot have descendant as parent
    return ancestorIds.includes(this.props.id);
  }

  // ============================================================================
  // Domain Behavior: Lifecycle
  // ============================================================================

  /**
   * Check if this group can be deleted
   */
  canBeDeleted(): boolean {
    return !this.isSystem;
  }

  /**
   * Update group properties (not roles/permissions)
   */
  update(input: UpdateGroupInput): Group {
    return new Group({
      ...this.props,
      displayName: input.displayName?.trim() ?? this.props.displayName,
      description: input.description?.trim() ?? this.props.description,
      parentId:
        input.parentId === null
          ? undefined
          : (input.parentId ?? this.props.parentId),
      updatedAt: new Date(),
    });
  }

  // ============================================================================
  // Equality
  // ============================================================================

  /**
   * Groups are equal if they have the same name
   */
  equals(other: Group): boolean {
    return this.name === other.name;
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  toJSON(): Omit<GroupProps, 'roleIds' | 'permissionIds'> & {
    roleIds: RoleId[];
    permissionIds: PermissionId[];
  } {
    return {
      ...this.props,
      roleIds: Array.from(this.props.roleIds),
      permissionIds: Array.from(this.props.permissionIds),
    };
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private validate(): void {
    if (!this.props.name || this.props.name.length === 0) {
      throw new Error('Group name cannot be empty');
    }

    if (!this.props.displayName || this.props.displayName.length === 0) {
      throw new Error('Group displayName cannot be empty');
    }

    const validNamePattern = /^[a-z][a-z0-9_]*$/;

    if (!validNamePattern.test(this.props.name)) {
      throw new Error(
        `Group name "${this.props.name}" must start with lowercase letter and contain only lowercase letters, numbers, and underscores`,
      );
    }

    if (this.props.name.length > 50) {
      throw new Error('Group name cannot exceed 50 characters');
    }

    if (this.props.displayName.length > 100) {
      throw new Error('Group displayName cannot exceed 100 characters');
    }

    if (this.props.description && this.props.description.length > 500) {
      throw new Error('Group description cannot exceed 500 characters');
    }

    // Cannot be own parent
    if (
      this.props.parentId &&
      this.props.parentId === this.props.id &&
      this.props.id !== ''
    ) {
      throw new Error('Group cannot be its own parent');
    }
  }
}
