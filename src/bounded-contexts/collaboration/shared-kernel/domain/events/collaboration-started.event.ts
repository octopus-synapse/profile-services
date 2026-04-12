import { DomainEvent } from '@/shared-kernel';

export interface CollaborationStartedPayload {
  readonly resumeId: string;
  readonly ownerId: string;
}

export class CollaborationStartedEvent extends DomainEvent<CollaborationStartedPayload> {
  static readonly TYPE = 'collaboration.started';

  constructor(sessionId: string, payload: CollaborationStartedPayload) {
    super(CollaborationStartedEvent.TYPE, sessionId, payload);
  }
}
