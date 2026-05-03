/**
 * Lists notifications for the authenticated user, paginated by cursor.
 * The repository owns the actual ordering and the cursor encoding;
 * the use case just clamps the limit so callers can't ask for more
 * than 100 rows in one request.
 */

import type { NotificationListPage } from '../../../domain/entities/notification.entity';
import { NotificationsRepositoryPort } from '../../../domain/ports/notifications.repository.port';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ListNotificationsUseCase {
  constructor(private readonly repository: NotificationsRepositoryPort) {}

  execute(userId: string, cursor?: string, limit?: number): Promise<NotificationListPage> {
    const effective = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.repository.listForUser(userId, cursor, effective);
  }
}
