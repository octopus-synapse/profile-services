/**
 * Explicit registration of share-analytics-BC event handlers.
 *
 * The handler is a framework-free POJO; this file wires it to the
 * `EventBusPort` via `bus.on(eventType, ...)` for the two presentation
 * share events.
 */

import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import type { ShareAnalyticsService } from '../services/share-analytics.service';
import { ShareEventHandler } from './share-event.handler';

export interface ShareAnalyticsHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly analyticsService: ShareAnalyticsService;
  readonly logger: LoggerPort;
}

export function registerShareAnalyticsHandlers(deps: ShareAnalyticsHandlersDeps): void {
  const { eventBus, analyticsService, logger } = deps;

  const handler = new ShareEventHandler(analyticsService, logger);

  // Cross-context string event types (originating from presentation BC).
  eventBus.on('presentation.share.viewed', handler.handleShareViewed.bind(handler));
  eventBus.on('presentation.share.downloaded', handler.handleShareDownloaded.bind(handler));
}
