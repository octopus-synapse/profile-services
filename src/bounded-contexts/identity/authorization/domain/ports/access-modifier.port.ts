/**
 * AccessModifier repository port.
 *
 * Implementations live in the infrastructure layer; the domain only
 * sees this interface. Reads are tuned for the gate's hot path: list
 * all currently-active modifiers for a user in one query.
 */

import type {
  AccessModifier,
  AccessModifierId,
  CreateAccessModifierInput,
  UserId,
} from '../entities/access-modifier.entity';

export interface IAccessModifierRepository {
  create(input: CreateAccessModifierInput): Promise<AccessModifier>;

  /** Returns every modifier for a user, regardless of active state. */
  findAllForUser(userId: UserId): Promise<AccessModifier[]>;

  /** Returns only modifiers whose `startsAt <= now < endsAt` and that aren't revoked. */
  findActiveForUser(userId: UserId, at?: Date): Promise<AccessModifier[]>;

  findById(id: AccessModifierId): Promise<AccessModifier | null>;

  /** Set `revokedAt` + `revokedBy`. No-op on already-revoked rows. */
  revoke(id: AccessModifierId, revokedBy: UserId, revokedAt?: Date): Promise<void>;
}
