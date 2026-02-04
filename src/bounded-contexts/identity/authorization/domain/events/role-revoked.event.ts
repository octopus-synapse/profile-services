/**
 * Role Revoked Event
 *
 * Emitted when a role is removed from a user.
 */

import { DomainEvent } from '@/shared-kernel';

export interface RoleRevokedPayload {
  readonly roleId: string;
  readonly revokedBy: string;
  readonly reason: string;
}

export class RoleRevokedEvent extends DomainEvent<RoleRevokedPayload> {
  static readonly TYPE = 'identity.authorization.role.revoked';

  constructor(userId: string, payload: RoleRevokedPayload) {
    super(RoleRevokedEvent.TYPE, userId, payload);
  }
}
