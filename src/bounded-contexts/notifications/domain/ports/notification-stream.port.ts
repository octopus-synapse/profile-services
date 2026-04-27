/**
 * Outbound port for emitting in-process notification events to the SSE
 * channel. The adapter wraps NestJS's `EventEmitter2`; the SSE
 * controller listens on the same bus.
 */

import type { NotificationStreamEvent } from '../entities/notification';

export abstract class NotificationStreamPort {
  abstract emit(userId: string, event: NotificationStreamEvent): void;
}
