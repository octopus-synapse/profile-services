/**
 * Notifications SSE Controller
 *
 * Streams real-time notifications to the authenticated user. Mirrors the
 * pattern in `activity-feed-sse.controller.ts`. The notification service emits
 * to the `notif:user:{userId}` namespace on the shared EventEmitter bus.
 */

import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { filter, fromEvent, map, Observable } from 'rxjs';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';

interface NotificationStreamEvent {
  id: string;
  userId: string;
  type: string;
  message: string;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}

@SdkExport({
  tag: 'notifications',
  description: 'Notifications real-time stream',
  requiresAuth: true,
})
@ApiTags('Notifications SSE')
@ApiBearerAuth()
@Controller('v1/notifications')
export class NotificationsSseController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('subscribe')
  @RequirePermission(Permission.NOTIFICATION_READ)
  @ApiOperation({
    summary: 'Subscribe to notification stream',
    description: 'Pushes new notifications as they are created for the authenticated user.',
  })
  subscribe(@CurrentUser() user: UserPayload): Observable<MessageEvent> {
    return fromEvent<NotificationStreamEvent>(this.eventEmitter, `notif:user:${user.userId}`).pipe(
      filter((n): n is NotificationStreamEvent => Boolean(n)),
      map((n) => ({
        data: n,
        id: n.id,
        type: 'notification',
        retry: 10000,
      })),
    );
  }
}
