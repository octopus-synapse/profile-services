import { DomainEvent } from '@/shared-kernel';

export interface ConnectionRequestedPayload {
  readonly requesterId: string;
}

export class ConnectionRequestedEvent extends DomainEvent<ConnectionRequestedPayload> {
  static readonly TYPE = 'social.connection.requested';

  constructor(userId: string, payload: ConnectionRequestedPayload) {
    super(ConnectionRequestedEvent.TYPE, userId, payload);
  }
}
