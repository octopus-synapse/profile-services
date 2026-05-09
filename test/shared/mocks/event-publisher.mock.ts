import { mock } from 'bun:test';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';

/**
 * Build a mock `EventPublisherPort` that captures every published event
 * into a returned `events` array. Both sync `publish` and async
 * `publishAsync` push into the same buffer so assertions are uniform.
 *
 * Replaces the inline mock construction copied across BC `*.service.spec.ts`
 * files (Q59 in the duplication audit).
 *
 * @example
 *   const { publisher, events } = createEventPublisherMock();
 *   await service.followUser(...);
 *   expect(events.map((e) => e.type)).toEqual([UserFollowedEvent.TYPE]);
 */
export function createEventPublisherMock(): {
  publisher: EventPublisherPort;
  events: DomainEvent<unknown>[];
} {
  const events: DomainEvent<unknown>[] = [];

  const publisher: EventPublisherPort = {
    publish: mock(<T>(event: DomainEvent<T>) => {
      events.push(event);
    }),
    publishAsync: mock(async <T>(event: DomainEvent<T>) => {
      events.push(event);
    }),
  } as unknown as EventPublisherPort;

  return { publisher, events };
}
