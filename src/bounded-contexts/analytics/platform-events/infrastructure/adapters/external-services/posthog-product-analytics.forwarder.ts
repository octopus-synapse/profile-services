/**
 * PostHog implementation of `ProductAnalyticsForwarderPort`.
 *
 * Builds a PostHog `/batch/` payload and POSTs it with a 5-second
 * abort. When `host` or `apiKey` are missing the forwarder no-ops —
 * useful for local dev where PostHog isn't configured. Network
 * failures bubble up as rejected promises so the use case can log
 * them; the use case never awaits us, so they don't slow down the
 * 202 response.
 */

import { LoggerPort } from '@/shared-kernel';
import type { PlatformEvent } from '../../../domain/entities/platform-event';
import { ProductAnalyticsForwarderPort } from '../../../domain/ports/product-analytics-forwarder.port';

export interface PostHogConfig {
  readonly host?: string;
  readonly apiKey?: string;
}

export class PostHogProductAnalyticsForwarder extends ProductAnalyticsForwarderPort {
  constructor(
    private readonly config: PostHogConfig,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async forward(events: readonly PlatformEvent[]): Promise<void> {
    if (!this.config.host || !this.config.apiKey) return;
    const batch = events.map((e) => ({
      event: e.event,
      properties: { ...(e.props ?? {}), distinct_id: e.userId ?? 'anonymous' },
      timestamp: e.occurredAt.toISOString(),
      distinct_id: e.userId ?? 'anonymous',
    }));
    await fetch(`${this.config.host.replace(/\/$/, '')}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.config.apiKey, batch }),
      signal: AbortSignal.timeout(5_000),
    });
  }
}
