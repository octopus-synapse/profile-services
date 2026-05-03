/**
 * Adapter for `NotificationStreamPort` that fans events out via the
 * shared `SseStreamPort`. Emits on the `notif:user:{ userId }` channel
 * — the SSE route subscribes to the same channel through
 * `SseStreamPort.subscribe(...)`.
 *
 * Framework-free POJO. The Nest adapter for `SseStreamPort` is the
 * only place that knows about `EventEmitter2`; this BC stays clean.
 */

import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import type { NotificationStreamEvent } from '../../../domain/entities/notification.entity';
import { NotificationStreamPort } from '../../../domain/ports/notification-stream.port';

export class EventEmitterNotificationStreamAdapter extends NotificationStreamPort {
  constructor(private readonly sse: SseStreamPort) {
    super();
  }

  emit(userId: string, event: NotificationStreamEvent): void {
    this.sse.publish<NotificationStreamEvent>(`notif:user:${userId}`, event);
  }
}
