import { randomUUID } from 'crypto';

export abstract class DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly occurredAt: Date;

  constructor(
    readonly eventType: string,
    readonly aggregateId: string,
    readonly payload: TPayload,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }
}
