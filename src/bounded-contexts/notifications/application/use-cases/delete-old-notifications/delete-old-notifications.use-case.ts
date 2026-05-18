/**
 * Hard-deletes notifications older than `days` days. Currently
 * unwired in production but kept around as a maintenance hook for
 * future retention crons.
 */

import { ValidationException } from '@/shared-kernel/exceptions';
import { NotificationsRepositoryPort } from '../../../domain/ports/notifications.repository.port';

export class DeleteOldNotificationsUseCase {
  constructor(private readonly repository: NotificationsRepositoryPort) {}

  execute(days = 90, now: Date = new Date()): Promise<{ count: number }> {
    // P2-#17: `days <= 0` would cut at-or-after `now` and wipe every
    // notification. Refuse so a typo can't truncate the table.
    if (!Number.isInteger(days) || days < 1) {
      throw new ValidationException(
        `DeleteOldNotifications: days must be an integer >= 1 (got ${days})`,
      );
    }
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return this.repository.deleteOlderThan(cutoff);
  }
}
