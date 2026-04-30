/**
 * Access Modifier — domain entity.
 *
 * Sits on top of state columns (`User.emailVerified`,
 * `User.hasCompletedOnboarding`) and capability rows
 * (`UserRoleAssignment.role`) to express temporary suspensions or
 * grants without mutating the underlying truth.
 *
 * Modifiers are immutable history: revoke by setting `revokedAt`,
 * never delete the row. This makes audit log queries a simple
 * `findMany(where: { userId })`.
 */

export type AccessModifierId = string;
export type UserId = string;
export type PermissionId = string;

export type ModifierEffect = 'DENY' | 'GRANT';

export type ModifierType =
  | 'SUSPEND_EMAIL_VERIFIED'
  | 'SUSPEND_ONBOARDING'
  | 'SUSPEND_ROLE_USER'
  | 'SUSPEND_ROLE_ADMIN'
  | 'GRANT_PERMISSION';

export interface AccessModifierProps {
  readonly id: AccessModifierId;
  readonly userId: UserId;
  readonly modifierType: ModifierType;
  readonly effect: ModifierEffect;
  readonly permissionId: PermissionId | null;
  readonly reason: string;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly createdBy: UserId;
  readonly revokedAt: Date | null;
  readonly revokedBy: UserId | null;
  readonly createdAt: Date;
}

export interface CreateAccessModifierInput {
  readonly userId: UserId;
  readonly modifierType: ModifierType;
  readonly effect: ModifierEffect;
  readonly permissionId?: PermissionId | null;
  readonly reason: string;
  readonly startsAt?: Date;
  readonly endsAt?: Date | null;
  readonly createdBy: UserId;
}

export class AccessModifier {
  private constructor(private readonly props: AccessModifierProps) {}

  static fromProps(props: AccessModifierProps): AccessModifier {
    return new AccessModifier(props);
  }

  /** True when the modifier is currently in effect for `at` (default: now). */
  isActiveAt(at: Date = new Date()): boolean {
    if (this.props.revokedAt && this.props.revokedAt <= at) return false;
    if (at < this.props.startsAt) return false;
    if (this.props.endsAt && at >= this.props.endsAt) return false;
    return true;
  }

  isSuspension(): boolean {
    return this.props.effect === 'DENY';
  }

  isGrant(): boolean {
    return this.props.effect === 'GRANT';
  }

  get id(): AccessModifierId {
    return this.props.id;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get modifierType(): ModifierType {
    return this.props.modifierType;
  }

  get effect(): ModifierEffect {
    return this.props.effect;
  }

  get permissionId(): PermissionId | null {
    return this.props.permissionId;
  }

  get reason(): string {
    return this.props.reason;
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }

  get endsAt(): Date | null {
    return this.props.endsAt;
  }

  get createdBy(): UserId {
    return this.props.createdBy;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get revokedBy(): UserId | null {
    return this.props.revokedBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON(): AccessModifierProps {
    return { ...this.props };
  }
}
