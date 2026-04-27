/**
 * Adapter for `NotificationStreamPort` that wraps NestJS's in-process
 * `EventEmitter2`. Emits on the `notif:user:{ userId }` channel — the
 * SSE controller subscribes to the same channel.
 */

import { EventEmitter2 } from '@nestjs/event-emitter';
import type { NotificationStreamEvent } from '../../../domain/entities/notification';
import { NotificationStreamPort } from '../../../domain/ports/notification-stream.port';

export class EventEmitterNotificationStreamAdapter extends NotificationStreamPort {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  emit(userId: string, event: NotificationStreamEvent): void {
    this.emitter.emit(`notif:user:${userId}`, event);
  }
}
