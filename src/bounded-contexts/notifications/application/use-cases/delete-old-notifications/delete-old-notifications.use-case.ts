/**
 * Hard-deletes notifications older than `days` days. Currently
 * unwired in production but kept around as a maintenance hook for
 * future retention crons.
 */

import { NotificationsRepositoryPort } from '../../../domain/ports/notifications.repository.port';

export class DeleteOldNotificationsUseCase {
  constructor(private readonly repository: NotificationsRepositoryPort) {}

  execute(days = 90, now: Date = new Date()): Promise<{ count: number }> {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return this.repository.deleteOlderThan(cutoff);
  }
}
