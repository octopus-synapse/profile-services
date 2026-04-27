/**
 * Adapter wrapping the notifications BC's `CreateNotificationUseCase` to
 * satisfy `EngagementNotifierPort`. Keeps the feed application layer
 * free of cross-BC imports.
 */

import type { NotificationsUseCases } from '@/bounded-contexts/notifications/application/ports/notifications.port';
import {
  type EngagementNotificationInput,
  EngagementNotifierPort,
} from '../../../domain/ports/engagement-notifier.port';

export class NotificationsEngagementNotifierAdapter extends EngagementNotifierPort {
  constructor(private readonly create: NotificationsUseCases['createNotification']) {
    super();
  }

  async notify(input: EngagementNotificationInput): Promise<void> {
    await this.create.execute({
      userId: input.recipientId,
      type: input.type,
      actorId: input.actorId,
      message: input.message,
      entityType: 'post',
      entityId: input.postId,
    });
  }
}
