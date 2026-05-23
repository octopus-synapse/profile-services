/**
 * Marks one notification as read (when `notificationId` is supplied)
 * or every unread notification for the user (when omitted).
 *
 * When `notificationId` is supplied we first resolve the row's owner —
 * if the row exists but belongs to another user we throw
 * `NotificationNotOwnedException` so the boundary maps it to a 403,
 * rather than silently no-oping at the repository (which would leak
 * the existence of arbitrary ids and behave inconsistently with
 * /delete or /dismiss flows added later).
 */

import { NotificationNotOwnedException } from '../../../domain/exceptions/notifications.exceptions';
import {
  type MarkReadResult,
  NotificationsRepositoryPort,
} from '../../../domain/ports/notifications.repository.port';

export class MarkNotificationsReadUseCase {
  constructor(private readonly repository: NotificationsRepositoryPort) {}

  async execute(userId: string, notificationId?: string): Promise<MarkReadResult> {
    if (notificationId) {
      const ownerId = await this.repository.findOwnerById(notificationId);
      if (ownerId !== null && ownerId !== userId) {
        throw new NotificationNotOwnedException();
      }
    }

    return this.repository.markRead(userId, notificationId);
  }
}
