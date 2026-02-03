/**
 * Permission Entity
 *
 * Core domain entity representing an atomic authorization permission.
 * A permission defines what ACTION can be performed on which RESOURCE.
 *
 * Single Responsibility: Encapsulates the concept of a permission
 * with its validation rules and behavior.
 *
 * @example
 * // "resume:create" - Can create resumes
 * // "user:delete" - Can delete users
 * // "theme:approve" - Can approve themes
 */

/**
 * Unique identifier for a Permission
 */
export type PermissionId = string;

/**
 * Standard actions in the system
 */
export const StandardActions = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  APPROVE: 'approve',
  REJECT: 'reject',
  EXPORT: 'export',
  IMPORT: 'import',
  SHARE: 'share',
  MANAGE: 'manage', // Super-action: implies all actions on resource
} as const;

export type StandardAction =
  (typeof StandardActions)[keyof typeof StandardActions];

/**
 * Standard resources in the system
 */
export const StandardResources = {
  USER: 'user',
  RESUME: 'resume',
  THEME: 'theme',
  SKILL: 'skill',
  ROLE: 'role',
  GROUP: 'group',
  PERMISSION: 'permission',
  AUDIT_LOG: 'audit_log',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  COLLABORATION: 'collaboration',
} as const;

export type StandardResource =
  (typeof StandardResources)[keyof typeof StandardResources];

/**
 * Permission value object properties
 */
export interface PermissionProps {
  readonly id: PermissionId;
  readonly resource: string;
  readonly action: string;
  readonly description?: string;
  readonly isSystem: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Permission creation input
 */
export interface CreatePermissionInput {
  resource: string;
  action: string;
  description?: string;
  isSystem?: boolean;
}

/**
 * Permission Entity
 *
 * Immutable domain entity. All modifications return new instances.
 */
export class Permission {
  private constructor(private readonly props: PermissionProps) {
    this.validate();
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create a new Permission instance
   */
  static create(input: CreatePermissionInput): Permission {
    return new Permission({
      id: '', // Will be assigned by repository
      resource: input.resource.toLowerCase().trim(),
      action: input.action.toLowerCase().trim(),
      description: input.description?.trim(),
      isSystem: input.isSystem ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: PermissionProps): Permission {
    return new Permission(props);
  }

  /**
   * Create standard permission key format
   */
  static createKey(resource: string, action: string): string {
    return `${resource.toLowerCase()}:${action.toLowerCase()}`;
  }

  // ============================================================================
  // Getters (Read-Only Access)
  // ============================================================================

  get id(): PermissionId {
    return this.props.id;
  }

  get resource(): string {
    return this.props.resource;
  }

  get action(): string {
    return this.props.action;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Get the permission key in format "resource:action"
   */
  get key(): string {
    return Permission.createKey(this.resource, this.action);
  }

  // ============================================================================
  // Domain Behavior
  // ============================================================================

  /**
   * Check if this permission matches a resource:action pair
   */
  matches(resource: string, action: string): boolean {
    const normalizedResource = resource.toLowerCase().trim();
    const normalizedAction = action.toLowerCase().trim();

    // Direct match
    if (
      this.resource === normalizedResource &&
      this.action === normalizedAction
    ) {
      return true;
    }

    // "manage" action implies all actions on the resource
    if (
      this.resource === normalizedResource &&
      this.action === StandardActions.MANAGE
    ) {
      return true;
    }

    // Wildcard resource "*" matches all resources (super admin)
    if (this.resource === '*' && this.action === StandardActions.MANAGE) {
      return true;
    }

    return false;
  }

  /**
   * Check if this is a system permission (cannot be deleted)
   */
  canBeDeleted(): boolean {
    return !this.isSystem;
  }

  /**
   * Update permission description
   */
  withDescription(description: string): Permission {
    return new Permission({
      ...this.props,
      description: description.trim(),
      updatedAt: new Date(),
    });
  }

  // ============================================================================
  // Equality
  // ============================================================================

  /**
   * Permissions are equal if they have the same resource:action
   */
  equals(other: Permission): boolean {
    return this.key === other.key;
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  toJSON(): PermissionProps {
    return { ...this.props };
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private validate(): void {
    if (!this.props.resource || this.props.resource.length === 0) {
      throw new Error('Permission resource cannot be empty');
    }

    if (!this.props.action || this.props.action.length === 0) {
      throw new Error('Permission action cannot be empty');
    }

    if (this.props.resource.includes(':')) {
      throw new Error('Permission resource cannot contain ":"');
    }

    if (this.props.action.includes(':')) {
      throw new Error('Permission action cannot contain ":"');
    }

    const validPattern = /^[a-z][a-z0-9_]*$/;

    if (
      this.props.resource !== '*' &&
      !validPattern.test(this.props.resource)
    ) {
      throw new Error(
        `Permission resource "${this.props.resource}" must start with lowercase letter and contain only lowercase letters, numbers, and underscores`,
      );
    }

    if (!validPattern.test(this.props.action)) {
      throw new Error(
        `Permission action "${this.props.action}" must start with lowercase letter and contain only lowercase letters, numbers, and underscores`,
      );
    }
  }
}
