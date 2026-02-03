/**
 * Permission Denied Event
 *
 * Emitted when a permission is explicitly denied to a user.
 */

import { DomainEvent } from '@/shared-kernel';

export interface PermissionDeniedPayload {
  readonly permissionId: string;
  readonly deniedBy: string;
  readonly reason: string;
}

export class PermissionDeniedEvent extends DomainEvent<PermissionDeniedPayload> {
  static readonly TYPE = 'identity.authorization.permission.denied';

  constructor(userId: string, payload: PermissionDeniedPayload) {
    super(PermissionDeniedEvent.TYPE, userId, payload);
  }
}
