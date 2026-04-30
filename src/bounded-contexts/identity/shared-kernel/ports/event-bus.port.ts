/**
 * Event Bus Port
 *
 * Abstraction for publishing domain events.
 * Allows use-cases to publish events without knowing the infrastructure.
 */
import { DomainEvent } from '../domain/events';

export abstract class EventBusPort {
  /**
   * Publishes a single domain event
   */
  abstract publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events
   */
  abstract publishAll(events: DomainEvent[]): Promise<void>;
}
