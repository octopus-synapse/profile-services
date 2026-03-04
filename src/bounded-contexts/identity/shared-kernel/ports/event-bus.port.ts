/**
 * Event Bus Port
 *
 * Abstraction for publishing domain events.
 * Allows use-cases to publish events without knowing the infrastructure.
 */
import type { DomainEvent } from '../domain/events';

export interface EventBusPort {
  /**
   * Publishes a single domain event
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events
   */
  publishAll(events: DomainEvent[]): Promise<void>;
}

export const EVENT_BUS_PORT = Symbol('EventBusPort');
