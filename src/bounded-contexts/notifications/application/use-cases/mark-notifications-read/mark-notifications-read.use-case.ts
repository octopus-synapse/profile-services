/**
 * Marks one notification as read (when `notificationId` is supplied)
 * or every unread notification for the user (when omitted). Ownership
 * is enforced inside the repository — cross-user attempts no-op.
 */

import {
  type MarkReadResult,
  NotificationsRepositoryPort,
} from '../../../domain/ports/notifications.repository.port';

export class MarkNotificationsReadUseCase {
  constructor(private readonly repository: NotificationsRepositoryPort) {}

  execute(userId: string, notificationId?: string): Promise<MarkReadResult> {
    return this.repository.markRead(userId, notificationId);
  }
}
