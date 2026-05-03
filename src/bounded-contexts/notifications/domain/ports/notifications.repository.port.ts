/**
 * Outbound port for notification persistence. The Prisma adapter
 * handles every column; the use cases see only domain shapes.
 *
 * `setPreference` returns the upserted preference; `findUserPreference`
 * returns null when the user has no override row (defaults apply).
 */

import type {
  CreateNotificationData,
  DailyDigestPreference,
  EmailDeliveryMode,
  NotificationListPage,
  NotificationPreferenceView,
  NotificationRecipient,
  NotificationType,
  NotificationView,
  PendingDigestNotification,
} from '../entities/notification.entity';

export interface SetPreferenceInput {
  readonly enabled?: boolean;
  readonly emailEnabled?: boolean;
  readonly emailDelivery?: EmailDeliveryMode;
}

export interface MarkReadResult {
  readonly count: number;
}

export interface UnreadPreferenceLookup {
  readonly enabled: boolean;
  readonly emailEnabled: boolean;
  readonly emailDelivery: EmailDeliveryMode;
}

export abstract class NotificationsRepositoryPort {
  // ───────── notifications ─────────
  abstract create(data: CreateNotificationData): Promise<NotificationView>;
  abstract markEmailSentAt(notificationId: string, sentAt: Date): Promise<void>;
  abstract findRecipient(userId: string): Promise<NotificationRecipient | null>;
  abstract listForUser(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<NotificationListPage>;
  abstract countUnread(userId: string): Promise<number>;
  abstract markRead(userId: string, notificationId: string | undefined): Promise<MarkReadResult>;
  /** Resolve the `userId` that owns the given notification id. Returns
   *  `null` when no row exists. Used by the mark-read use case to
   *  surface a 403 when the caller targets someone else's id. */
  abstract findOwnerById(notificationId: string): Promise<string | null>;
  abstract deleteOlderThan(cutoff: Date): Promise<{ count: number }>;

  // ───────── preferences ─────────
  abstract findUserPreference(
    userId: string,
    type: NotificationType,
  ): Promise<UnreadPreferenceLookup | null>;
  abstract listUserPreferences(userId: string): Promise<NotificationPreferenceView[]>;
  abstract setPreference(
    userId: string,
    type: NotificationType,
    input: SetPreferenceInput,
  ): Promise<NotificationPreferenceView>;
  abstract listDailyDigestPreferences(): Promise<DailyDigestPreference[]>;
  abstract listPendingDigestNotifications(
    userId: string,
    types: NotificationType[],
    cutoff: Date,
    take: number,
  ): Promise<PendingDigestNotification[]>;
  abstract markDigestEmailSent(notificationIds: string[], sentAt: Date): Promise<void>;
  abstract listWeeklyOptInUserIds(): Promise<string[]>;
}
