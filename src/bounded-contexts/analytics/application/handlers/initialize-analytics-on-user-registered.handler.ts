/**
 * Initialize Analytics on User Registered Handler
 *
 * Cross-context event handler that reacts to UserRegisteredEvent
 * from Identity context. Currently a placeholder for future user-level
 * analytics initialization.
 *
 * NOTE: Analytics projections are created per-resume via SyncProjectionOnResumeCreatedHandler.
 * This handler exists for future user-level analytics (e.g., aggregated stats).
 */

import { UserRegisteredEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import type { LoggerPort } from '@/shared-kernel';

export class InitializeAnalyticsOnUserRegisteredHandler {
  constructor(private readonly logger: LoggerPort) {}

  handle(event: UserRegisteredEvent): void {
    // Future: Initialize user-level analytics aggregations
    // Current design: Analytics projections are per-resume, created by SyncProjectionOnResumeCreatedHandler
    this.logger.debug(
      `User registered: ${event.aggregateId} (${event.payload.email}) - analytics will be initialized per-resume`,
    );
  }
}
