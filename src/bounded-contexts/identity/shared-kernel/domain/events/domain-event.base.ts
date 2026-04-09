/**
 * Domain Event Base Class
 *
 * All domain events MUST extend this class.
 * Events are immutable records of something that happened in the domain.
 */
export abstract class DomainEvent<TPayload = unknown> {
  /**
   * Unique event identifier
   */
  readonly eventId: string;

  /**
   * When the event occurred
   */
  readonly occurredAt: Date;

  /**
   * Event type name (for serialization/routing)
   */
  abstract readonly eventType: string;

  /**
   * Aggregate root ID that generated this event
   */
  abstract readonly aggregateId: string;

  /**
   * Event-specific data
   */
  abstract readonly payload: TPayload;

  constructor() {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }

  /**
   * Converts event to a plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredAt: this.occurredAt.toISOString(),
      payload: this.getPayload(),
    };
  }

  /**
   * Returns event-specific payload for serialization
   */
  protected abstract getPayload(): Record<string, unknown>;
}
