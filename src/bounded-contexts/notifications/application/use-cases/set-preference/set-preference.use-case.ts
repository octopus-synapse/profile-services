/**
 * Upserts a notification preference for the user. Partial inputs are
 * merged into the existing row by the repository (or fall back to the
 * defaults when no row existed).
 */

import type {
  NotificationPreferenceView,
  NotificationType,
} from '../../../domain/entities/notification';
import {
  NotificationsRepositoryPort,
  type SetPreferenceInput,
} from '../../../domain/ports/notifications.repository.port';

export class SetPreferenceUseCase {
  constructor(private readonly repository: NotificationsRepositoryPort) {}

  execute(
    userId: string,
    type: NotificationType,
    input: SetPreferenceInput,
  ): Promise<NotificationPreferenceView> {
    return this.repository.setPreference(userId, type, input);
  }
}
