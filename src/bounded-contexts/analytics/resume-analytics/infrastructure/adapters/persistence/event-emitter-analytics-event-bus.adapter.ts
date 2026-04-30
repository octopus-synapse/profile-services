import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import { AnalyticsEventBusPort } from '../../../application/ports/analytics-event-bus.port';

/**
 * `AnalyticsEventBusPort` adapter that forwards channel emissions
 * straight to the framework-free `SseStreamPort`. The Nest-side
 * `NestSseStreamAdapter` and the Elysia-side `InMemorySseStreamAdapter`
 * share semantics — emit + subscribe via the same in-process channel —
 * so the analytics SSE bundle reads exactly the same payloads in either
 * runtime.
 *
 * Class name kept for module/import compatibility during the
 * dual-mode migration; the implementation no longer touches
 * `@nestjs/event-emitter` directly.
 */
export class EventEmitterAnalyticsEventBusAdapter extends AnalyticsEventBusPort {
  constructor(private readonly sseStream: SseStreamPort) {
    super();
  }

  emit(eventName: string, payload: unknown): void {
    this.sseStream.publish(eventName, payload);
  }
}
