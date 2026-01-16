/**
 * Role Entity
 *
 * Core domain entity representing a named collection of permissions.
 * Roles are the primary way to group permissions for assignment to users.
 *
 * Single Responsibility: Encapsulates role definition and permission aggregation.
 *
 * Design Decision: Roles contain permission references (IDs), not full objects.
 * This follows the Aggregate pattern - Role is the aggregate root.
 */

import type { Permission, PermissionId } from './permission.entity';

/**
 * Unique identifier for a Role
 */
export type RoleId = string;

/**
 * Role value object properties
 */
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

/**
 * Role creation input
 */
export interface CreateRoleInput {
  name: string;
  displayName: string;
  description?: string;
  isSystem?: boolean;
  priority?: number;
}

/**
 * Role update input
 */
export interface UpdateRoleInput {
  displayName?: string;
  description?: string;
  priority?: number;
}

/**
 * Role Entity
 *
 * Immutable domain entity. All modifications return new instances.
 */
export class Role {
  private constructor(private readonly props: RoleProps) {
    this.validate();
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create a new Role instance
   */
  static create(input: CreateRoleInput): Role {
    return new Role({
      id: '', // Will be assigned by repository
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

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(
    props: Omit<RoleProps, 'permissionIds'> & { permissionIds: PermissionId[] },
  ): Role {
    return new Role({
      ...props,
      permissionIds: new Set(props.permissionIds),
    });
  }

  // ============================================================================
  // Getters (Read-Only Access)
  // ============================================================================

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

  // ============================================================================
  // Domain Behavior
  // ============================================================================

  /**
   * Add a permission to this role
   */
  addPermission(permissionId: PermissionId): Role {
    if (this.props.permissionIds.has(permissionId)) {
      return this; // No change needed
    }

    const newPermissionIds = new Set(this.props.permissionIds);
    newPermissionIds.add(permissionId);

    return new Role({
      ...this.props,
      permissionIds: newPermissionIds,
      updatedAt: new Date(),
    });
  }

  /**
   * Add multiple permissions to this role
   */
  addPermissions(permissionIds: PermissionId[]): Role {
    const newPermissionIds = new Set(this.props.permissionIds);
    let changed = false;

    for (const permissionId of permissionIds) {
      if (!newPermissionIds.has(permissionId)) {
        newPermissionIds.add(permissionId);
        changed = true;
      }
    }

    if (!changed) {
      return this;
    }

    return new Role({
      ...this.props,
      permissionIds: newPermissionIds,
      updatedAt: new Date(),
    });
  }

  /**
   * Remove a permission from this role
   */
  removePermission(permissionId: PermissionId): Role {
    if (!this.props.permissionIds.has(permissionId)) {
      return this; // No change needed
    }

    const newPermissionIds = new Set(this.props.permissionIds);
    newPermissionIds.delete(permissionId);

    return new Role({
      ...this.props,
      permissionIds: newPermissionIds,
      updatedAt: new Date(),
    });
  }

  /**
   * Check if this role has a specific permission
   */
  hasPermission(permissionId: PermissionId): boolean {
    return this.props.permissionIds.has(permissionId);
  }

  /**
   * Check if this role can be deleted
   */
  canBeDeleted(): boolean {
    return !this.isSystem;
  }

  /**
   * Check if this role can be modified
   */
  canBeModified(): boolean {
    // System roles can have permissions changed, but not name/isSystem
    return true;
  }

  /**
   * Update role properties (not permissions)
   */
  update(input: UpdateRoleInput): Role {
    return new Role({
      ...this.props,
      displayName: input.displayName?.trim() ?? this.props.displayName,
      description: input.description?.trim() ?? this.props.description,
      priority: input.priority ?? this.props.priority,
      updatedAt: new Date(),
    });
  }

  /**
   * Set all permissions at once (replace)
   */
  setPermissions(permissionIds: PermissionId[]): Role {
    return new Role({
      ...this.props,
      permissionIds: new Set(permissionIds),
      updatedAt: new Date(),
    });
  }

  // ============================================================================
  // Equality
  // ============================================================================

  /**
   * Roles are equal if they have the same name
   */
  equals(other: Role): boolean {
    return this.name === other.name;
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  toJSON(): Omit<RoleProps, 'permissionIds'> & {
    permissionIds: PermissionId[];
  } {
    return {
      ...this.props,
      permissionIds: Array.from(this.props.permissionIds),
    };
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private validate(): void {
    if (!this.props.name || this.props.name.length === 0) {
      throw new Error('Role name cannot be empty');
    }

    if (!this.props.displayName || this.props.displayName.length === 0) {
      throw new Error('Role displayName cannot be empty');
    }

    const validNamePattern = /^[a-z][a-z0-9_]*$/;

    if (!validNamePattern.test(this.props.name)) {
      throw new Error(
        `Role name "${this.props.name}" must start with lowercase letter and contain only lowercase letters, numbers, and underscores`,
      );
    }

    if (this.props.name.length > 50) {
      throw new Error('Role name cannot exceed 50 characters');
    }

    if (this.props.displayName.length > 100) {
      throw new Error('Role displayName cannot exceed 100 characters');
    }

    if (this.props.description && this.props.description.length > 500) {
      throw new Error('Role description cannot exceed 500 characters');
    }
  }
}
