/**
 * Permission Granted Event
 *
 * Emitted when a direct permission is granted to a user.
 */

import { DomainEvent } from '../../../shared-kernel/domain/events';

export interface PermissionGrantedPayload {
  readonly permissionId: string;
  readonly grantedBy: string;
  readonly expiresAt?: Date;
}

export class PermissionGrantedEvent extends DomainEvent<PermissionGrantedPayload> {
  static readonly TYPE = 'identity.authorization.permission.granted';

  readonly eventType = PermissionGrantedEvent.TYPE;
  readonly aggregateId: string;
  readonly payload: PermissionGrantedPayload;

  constructor(userId: string, payload: PermissionGrantedPayload) {
    super();
    this.aggregateId = userId;
    this.payload = payload;
  }

  protected getPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
