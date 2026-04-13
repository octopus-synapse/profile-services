import { DomainEvent } from '@/shared-kernel';

export interface ConnectionAcceptedPayload {
  readonly requesterId: string;
  readonly targetId: string;
}

export class ConnectionAcceptedEvent extends DomainEvent<ConnectionAcceptedPayload> {
  static readonly TYPE = 'social.connection.accepted';

  constructor(userId: string, payload: ConnectionAcceptedPayload) {
    super(ConnectionAcceptedEvent.TYPE, userId, payload);
  }
}
