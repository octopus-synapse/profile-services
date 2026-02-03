/**
 * Permission Granted Event
 *
 * Emitted when a direct permission is granted to a user.
 */

import { DomainEvent } from '@/shared-kernel';

export interface PermissionGrantedPayload {
  readonly permissionId: string;
  readonly grantedBy: string;
  readonly expiresAt?: Date;
}

export class PermissionGrantedEvent extends DomainEvent<PermissionGrantedPayload> {
  static readonly TYPE = 'identity.authorization.permission.granted';

  constructor(userId: string, payload: PermissionGrantedPayload) {
    super(PermissionGrantedEvent.TYPE, userId, payload);
  }
}
