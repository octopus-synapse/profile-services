/**
 * Returns the user's notification preferences merged with defaults.
 * Every supported `NotificationType` appears in the response; for
 * types without an explicit row the defaults (enabled + email-on +
 * INSTANT) are filled in so the UI can render the full grid without
 * a second round-trip.
 */

import type {
  NotificationPreferenceView,
  NotificationType,
} from '../../../domain/entities/notification.entity';
import { NotificationsRepositoryPort } from '../../../domain/ports/notifications.repository.port';

const ALL_TYPES: readonly NotificationType[] = [
  'POST_LIKED',
  'POST_COMMENTED',
  'POST_REPOSTED',
  'POST_BOOKMARKED',
  'COMMENT_REPLIED',
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'FOLLOW_NEW',
  'SKILL_DECAY',
  'APPLICATION_STALE',
  'CONNECTION_RECOMMENDATION',
  'FIT_PROFILE_EXPIRED',
  'FIT_PROFILE_EXPIRY_REMINDER',
  'MATCH_RECOMMENDATIONS_READY',
  'RESUME_QUALITY_IMPROVED',
  'RESUME_QUALITY_REGRESSED',
];

export class GetPreferencesUseCase {
  constructor(private readonly repository: NotificationsRepositoryPort) {}

  async execute(userId: string): Promise<NotificationPreferenceView[]> {
    const overrides = await this.repository.listUserPreferences(userId);
    const overrideMap = new Map(overrides.map((p) => [p.type, p]));
    return ALL_TYPES.map((type) => {
      const o = overrideMap.get(type);
      return {
        type,
        enabled: o?.enabled ?? true,
        emailEnabled: o?.emailEnabled ?? true,
        emailDelivery: o?.emailDelivery ?? 'INSTANT',
      };
    });
  }
}
