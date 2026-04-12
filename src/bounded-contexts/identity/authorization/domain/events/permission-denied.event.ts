/**
 * Permission Denied Event
 *
 * Emitted when a permission is explicitly denied to a user.
 */

import { DomainEvent } from '../../../shared-kernel/domain/events';

export interface PermissionDeniedPayload {
  readonly permissionId: string;
  readonly deniedBy: string;
  readonly reason: string;
}

export class PermissionDeniedEvent extends DomainEvent<PermissionDeniedPayload> {
  static readonly TYPE = 'identity.authorization.permission.denied';

  readonly eventType = PermissionDeniedEvent.TYPE;
  readonly aggregateId: string;
  readonly payload: PermissionDeniedPayload;

  constructor(userId: string, payload: PermissionDeniedPayload) {
    super();
    this.aggregateId = userId;
    this.payload = payload;
  }

  protected getPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
