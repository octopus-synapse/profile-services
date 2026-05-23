/**
 * Notification domain shapes consumed by the use cases.
 *
 * These are kept intentionally separate from the Prisma row shape so
 * the schema can evolve without rippling through the application layer.
 * `NotificationType` mirrors the Prisma enum literal union — using the
 * `type` import keeps the domain free of any actual Prisma runtime
 * dependency while still tracking the enum values.
 */

import type { NotificationType as PrismaNotificationType } from '@prisma/client';

export type NotificationType = PrismaNotificationType;

export type EmailDeliveryMode = 'INSTANT' | 'DAILY' | 'WEEKLY' | 'OFF';

export interface NotificationActorView {
  readonly id: string;
  readonly name: string | null;
  readonly username: string | null;
  readonly photoURL: string | null;
}

export interface NotificationView {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly actorId: string | null;
  readonly entityType: string | null;
  readonly entityId: string | null;
  readonly message: string;
  readonly read: boolean;
  readonly createdAt: Date;
  readonly actor: NotificationActorView | null;
}

/** What we emit on the in-process bus when a notification is created.
 *  The SSE controller subscribes to this shape. */
export interface NotificationStreamEvent {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly message: string;
  readonly actorId: string | null;
  readonly entityType: string | null;
  readonly entityId: string | null;
  readonly createdAt: Date;
}

export interface NotificationPreferenceView {
  readonly type: NotificationType;
  readonly enabled: boolean;
  readonly emailEnabled: boolean;
  readonly emailDelivery: EmailDeliveryMode;
}

/** Fields the persistence layer needs to persist a brand-new
 *  notification. Mirrors the columns on `Notification` minus the
 *  generated id/createdAt. */
export interface CreateNotificationData {
  readonly userId: string;
  readonly type: NotificationType;
  readonly actorId: string;
  readonly message: string;
  readonly entityType?: string;
  readonly entityId?: string;
  /**
   * P1 #23 — stable i18n key for re-rendering at display time. When set
   * together with `messageParams`, consumers should prefer rendering
   * via `NOTIFICATION_DICTIONARY[messageKey]` over the literal
   * `message` (which remains as a fallback for old rows / plain-text
   * channels).
   */
  readonly messageKey?: string;
  readonly messageParams?: Readonly<Record<string, string | number>>;
}

/** Minimal user contact row used when sending instant / digest /
 *  weekly emails. */
export interface NotificationRecipient {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  /** User's preferred UI language (mirror of `User.language`). Defaults
   *  to `'en'` when the column is null. Drives template rendering for
   *  the instant email (P1 #23). */
  readonly language: string;
}

/** Pending notification row pulled into the daily digest. */
export interface PendingDigestNotification {
  readonly id: string;
  readonly type: NotificationType;
  readonly message: string;
  readonly createdAt: Date;
}

export interface DailyDigestPreference {
  readonly userId: string;
  readonly type: NotificationType;
}

/** Aggregated weekly stats for a user — produced by the repository
 *  and consumed by `BuildWeeklyDigestService`. */
export interface WeeklyDigestStats {
  readonly resumeViews: number;
  readonly newFollowers: number;
  readonly newEndorsements: number;
  readonly profileViews: number;
}

/** Reminder window for the fit-profile expiry cron. */
export type FitProfileReminderDaysLeft = 7 | 3 | 1;

/** Row shape for the expiry-reminder fanout. */
export interface FitProfileExpiringRow {
  readonly userId: string;
  readonly expiresAt: Date;
  readonly userRoles: readonly string[];
}

export interface NotificationListPage {
  readonly items: NotificationView[];
  readonly nextCursor: string | null;
  readonly hasNext: boolean;
}
