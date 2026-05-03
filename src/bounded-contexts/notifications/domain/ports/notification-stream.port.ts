/**
 * Outbound port for emitting in-process notification events to the SSE
 * channel. The adapter fans into the shared `SseStreamPort.publish`;
 * the SSE route subscribes to the same channel via
 * `SseStreamPort.subscribe`.
 */

import type { NotificationStreamEvent } from '../entities/notification.entity';

export abstract class NotificationStreamPort {
  abstract emit(userId: string, event: NotificationStreamEvent): void;
}
