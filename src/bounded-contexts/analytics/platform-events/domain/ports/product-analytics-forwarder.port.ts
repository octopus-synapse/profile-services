/**
 * Outbound port for forwarding events to whatever product-analytics
 * provider the org happens to be using (PostHog today). Implementations
 * MUST be best-effort — a forwarder outage cannot drop the user-facing
 * request, so the use case fires-and-forgets and only logs failures.
 *
 * `forward` returns a void promise; rejections are caught upstream.
 */

import type { PlatformEvent } from '../entities/platform-event';

export abstract class ProductAnalyticsForwarderPort {
  abstract forward(events: readonly PlatformEvent[]): Promise<void>;
}
