import { randomUUID } from 'node:crypto';

/**
 * P2-098 — `schemaVersion` is required on every event so consumers
 * (audit handlers, analytics pipelines, downstream replay) can
 * branch on payload shape changes instead of silently corrupting
 * older rows. Default is `1`; bump explicitly in the subclass when
 * you change the payload contract in a non-additive way.
 */
export abstract class DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly schemaVersion: number;

  constructor(
    readonly eventType: string,
    readonly aggregateId: string,
    readonly payload: TPayload,
    schemaVersion = 1,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    this.schemaVersion = schemaVersion;
  }
}
