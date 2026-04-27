/**
 * In-memory `EngagementNotifierPort` for use-case specs. Captures every
 * notification call so tests can assert on the resulting events.
 */

import {
  type EngagementNotificationInput,
  EngagementNotifierPort,
} from '../domain/ports/engagement-notifier.port';

export class InMemoryEngagementNotifier extends EngagementNotifierPort {
  readonly events: EngagementNotificationInput[] = [];

  async notify(input: EngagementNotificationInput): Promise<void> {
    this.events.push(input);
  }
}
