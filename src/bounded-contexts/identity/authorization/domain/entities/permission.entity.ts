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
 */

import { assertPermissionValid } from '../validation/permission-validation';
import { StandardActions } from './permission.constants';

export type { StandardAction, StandardResource } from './permission.constants';
export { StandardActions, StandardResources } from './permission.constants';

/** Unique identifier for a Permission */
export type PermissionId = string;

/** Permission value object properties */
export interface PermissionProps {
  readonly id: PermissionId;
  readonly resource: string;
  readonly action: string;
  readonly description?: string;
  readonly isSystem: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Permission creation input */
export interface CreatePermissionInput {
  resource: string;
  action: string;
  description?: string;
  isSystem?: boolean;
}

/**
 * Immutable domain entity. All modifications return new instances.
 */
export class Permission {
  private constructor(private readonly props: PermissionProps) {
    assertPermissionValid(props);
  }

  static create(input: CreatePermissionInput): Permission {
    return new Permission({
      id: '',
      resource: input.resource.toLowerCase().trim(),
      action: input.action.toLowerCase().trim(),
      description: input.description?.trim(),
      isSystem: input.isSystem ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: PermissionProps): Permission {
    return new Permission(props);
  }

  static createKey(resource: string, action: string): string {
    return `${resource.toLowerCase()}:${action.toLowerCase()}`;
  }

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
  get key(): string {
    return Permission.createKey(this.resource, this.action);
  }

  matches(resource: string, action: string): boolean {
    const normalizedResource = resource.toLowerCase().trim();
    const normalizedAction = action.toLowerCase().trim();

    if (this.resource === normalizedResource && this.action === normalizedAction) return true;
    if (this.resource === normalizedResource && this.action === StandardActions.MANAGE) return true;
    if (this.resource === '*' && this.action === StandardActions.MANAGE) return true;

    return false;
  }

  canBeDeleted(): boolean {
    return !this.isSystem;
  }

  withDescription(description: string): Permission {
    return new Permission({
      ...this.props,
      description: description.trim(),
      updatedAt: new Date(),
    });
  }

  /** Permissions are equal if they have the same resource:action */
  equals(other: Permission): boolean {
    return this.key === other.key;
  }

  toJSON(): PermissionProps {
    return { ...this.props };
  }
}
