/**
 * In-memory test doubles for the notification ports.
 *
 * These mirror the production adapters' contracts (defaults, ordering,
 * idempotence) but keep all state in arrays / maps so use case specs
 * stay deterministic and Prisma-free.
 */

import type {
  CreateNotificationData,
  DailyDigestPreference,
  EmailDeliveryMode,
  FitProfileExpiringRow,
  NotificationListPage,
  NotificationPreferenceView,
  NotificationRecipient,
  NotificationStreamEvent,
  NotificationType,
  NotificationView,
  PendingDigestNotification,
  WeeklyDigestStats,
} from '../domain/entities/notification.entity';
import { FitProfileExpiryReadPort } from '../domain/ports/fit-profile-expiry.port';
import {
  type NotificationEmailMessage,
  NotificationEmailPort,
} from '../domain/ports/notification-email.port';
import { NotificationStreamPort } from '../domain/ports/notification-stream.port';
import {
  type MarkReadResult,
  NotificationsRepositoryPort,
  type SetPreferenceInput,
  type UnreadPreferenceLookup,
} from '../domain/ports/notifications.repository.port';
import { ReminderStatePort } from '../domain/ports/reminder-state.port';
import {
  type ResumeQualitySnapshot,
  ResumeQualitySnapshotPort,
} from '../domain/ports/resume-quality-snapshot.port';
import { WeeklyDigestLogPort } from '../domain/ports/weekly-digest-log.port';
import { WeeklyDigestStatsPort } from '../domain/ports/weekly-digest-stats.port';

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

interface InMemoryNotificationRow extends NotificationView {
  emailSentAt: Date | null;
  emailDigestSentAt: Date | null;
}

export class InMemoryNotificationsRepository extends NotificationsRepositoryPort {
  readonly notifications: InMemoryNotificationRow[] = [];
  readonly preferences = new Map<
    string,
    {
      enabled: boolean;
      inAppEnabled: boolean;
      emailEnabled: boolean;
      pushEnabled: boolean;
      emailDelivery: EmailDeliveryMode;
    }
  >();
  readonly recipients = new Map<string, NotificationRecipient>();

  private prefKey(userId: string, type: NotificationType): string {
    return `${userId}:${type}`;
  }

  setRecipient(userId: string, recipient: NotificationRecipient | null): void {
    if (recipient === null) {
      this.recipients.delete(userId);
    } else {
      this.recipients.set(userId, recipient);
    }
  }

  setPreferenceRow(
    userId: string,
    type: NotificationType,
    pref: {
      enabled: boolean;
      inAppEnabled?: boolean;
      emailEnabled: boolean;
      pushEnabled?: boolean;
      emailDelivery: EmailDeliveryMode;
    },
  ): void {
    this.preferences.set(this.prefKey(userId, type), {
      enabled: pref.enabled,
      inAppEnabled: pref.inAppEnabled ?? true,
      emailEnabled: pref.emailEnabled,
      pushEnabled: pref.pushEnabled ?? false,
      emailDelivery: pref.emailDelivery,
    });
  }

  async create(data: CreateNotificationData): Promise<NotificationView> {
    const row: InMemoryNotificationRow = {
      id: nextId('notif'),
      userId: data.userId,
      type: data.type,
      actorId: data.actorId,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      message: data.message,
      read: false,
      createdAt: new Date(),
      actor: null,
      emailSentAt: null,
      emailDigestSentAt: null,
    };
    this.notifications.push(row);
    return row;
  }

  async markEmailSentAt(notificationId: string, sentAt: Date): Promise<void> {
    const row = this.notifications.find((n) => n.id === notificationId);
    if (row) row.emailSentAt = sentAt;
  }

  async findRecipient(userId: string): Promise<NotificationRecipient | null> {
    return this.recipients.get(userId) ?? null;
  }

  async listForUser(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<NotificationListPage> {
    const sorted = this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    let start = 0;
    if (cursor) {
      const idx = sorted.findIndex((n) => n.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = sorted.slice(start, start + limit);
    const nextCursor = slice.length === limit ? (slice[slice.length - 1]?.id ?? null) : null;
    return { items: slice, nextCursor, hasNext: nextCursor !== null };
  }

  async countUnread(userId: string): Promise<number> {
    return this.notifications.filter((n) => n.userId === userId && !n.read).length;
  }

  async markRead(userId: string, notificationId: string | undefined): Promise<MarkReadResult> {
    let count = 0;
    for (const row of this.notifications) {
      if (row.userId !== userId) continue;
      if (notificationId && row.id !== notificationId) continue;
      if (!row.read) {
        (row as InMemoryNotificationRow & { read: boolean }).read = true;
        count++;
      }
    }
    return { count };
  }

  async findOwnerById(notificationId: string): Promise<string | null> {
    return this.notifications.find((n) => n.id === notificationId)?.userId ?? null;
  }

  async deleteOlderThan(cutoff: Date): Promise<{ count: number }> {
    let count = 0;
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      if (this.notifications[i]?.createdAt.getTime() < cutoff.getTime()) {
        this.notifications.splice(i, 1);
        count++;
      }
    }
    return { count };
  }

  async findUserPreference(
    userId: string,
    type: NotificationType,
  ): Promise<UnreadPreferenceLookup | null> {
    return this.preferences.get(this.prefKey(userId, type)) ?? null;
  }

  async listUserPreferences(userId: string): Promise<NotificationPreferenceView[]> {
    const out: NotificationPreferenceView[] = [];
    for (const [key, pref] of this.preferences.entries()) {
      const [u, t] = key.split(':') as [string, NotificationType];
      if (u !== userId) continue;
      out.push({
        type: t,
        enabled: pref.enabled,
        inAppEnabled: pref.inAppEnabled,
        emailEnabled: pref.emailEnabled,
        pushEnabled: pref.pushEnabled,
        emailDelivery: pref.emailDelivery,
      });
    }
    return out;
  }

  async setPreference(
    userId: string,
    type: NotificationType,
    input: SetPreferenceInput,
  ): Promise<NotificationPreferenceView> {
    const prev = this.preferences.get(this.prefKey(userId, type)) ?? {
      enabled: true,
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
      emailDelivery: 'INSTANT' as EmailDeliveryMode,
    };
    const next = {
      enabled: input.enabled ?? prev.enabled,
      inAppEnabled: input.inAppEnabled ?? prev.inAppEnabled,
      emailEnabled: input.emailEnabled ?? prev.emailEnabled,
      pushEnabled: input.pushEnabled ?? prev.pushEnabled,
      emailDelivery: input.emailDelivery ?? prev.emailDelivery,
    };
    this.preferences.set(this.prefKey(userId, type), next);
    return { type, ...next };
  }

  async listDailyDigestPreferences(): Promise<DailyDigestPreference[]> {
    const out: DailyDigestPreference[] = [];
    for (const [key, pref] of this.preferences.entries()) {
      if (pref.emailDelivery !== 'DAILY' || !pref.emailEnabled) continue;
      const [u, t] = key.split(':') as [string, NotificationType];
      out.push({ userId: u, type: t });
    }
    return out;
  }

  async listPendingDigestNotifications(
    userId: string,
    types: NotificationType[],
    cutoff: Date,
    take: number,
  ): Promise<PendingDigestNotification[]> {
    return this.notifications
      .filter(
        (n) =>
          n.userId === userId &&
          types.includes(n.type) &&
          n.emailDigestSentAt === null &&
          n.createdAt.getTime() >= cutoff.getTime(),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take)
      .map((n) => ({ id: n.id, type: n.type, message: n.message, createdAt: n.createdAt }));
  }

  async markDigestEmailSent(notificationIds: string[], sentAt: Date): Promise<void> {
    for (const row of this.notifications) {
      if (notificationIds.includes(row.id)) row.emailDigestSentAt = sentAt;
    }
  }

  async listWeeklyOptInUserIds(): Promise<string[]> {
    const out = new Set<string>();
    for (const [key, pref] of this.preferences.entries()) {
      if (pref.emailDelivery !== 'WEEKLY' || !pref.emailEnabled) continue;
      const [u] = key.split(':');
      if (u) out.add(u);
    }
    return [...out];
  }
}

export class InMemoryNotificationStream extends NotificationStreamPort {
  readonly emissions: Array<{ userId: string; event: NotificationStreamEvent }> = [];

  emit(userId: string, event: NotificationStreamEvent): void {
    this.emissions.push({ userId, event });
  }
}

export class InMemoryNotificationEmail extends NotificationEmailPort {
  readonly sent: NotificationEmailMessage[] = [];
  shouldThrow: Error | null = null;

  async send(message: NotificationEmailMessage): Promise<void> {
    if (this.shouldThrow) throw this.shouldThrow;
    this.sent.push(message);
  }
}

export class InMemoryWeeklyDigestStats extends WeeklyDigestStatsPort {
  readonly statsByUser = new Map<string, WeeklyDigestStats>();

  async collect(userId: string, _since: Date): Promise<WeeklyDigestStats> {
    return (
      this.statsByUser.get(userId) ?? {
        resumeViews: 0,
        newFollowers: 0,
        newEndorsements: 0,
        profileViews: 0,
      }
    );
  }
}

export class InMemoryWeeklyDigestLog extends WeeklyDigestLogPort {
  readonly sent = new Set<string>();
  readonly recipients = new Map<string, { id: string; name: string | null; email: string }>();

  setRecipient(row: { id: string; name: string | null; email: string }): void {
    this.recipients.set(row.id, row);
  }

  private key(userId: string, weekKey: string): string {
    return `${userId}:${weekKey}`;
  }

  async wasSentThisWeek(userId: string, weekKey: string): Promise<boolean> {
    return this.sent.has(this.key(userId, weekKey));
  }

  async recordSent(userId: string, weekKey: string): Promise<void> {
    this.sent.add(this.key(userId, weekKey));
  }

  async listEligibleRecipients(
    userIds: readonly string[],
  ): Promise<Array<{ id: string; name: string | null; email: string }>> {
    const out: Array<{ id: string; name: string | null; email: string }> = [];
    for (const id of userIds) {
      const row = this.recipients.get(id);
      if (row) out.push(row);
    }
    return out;
  }
}

export class InMemoryFitProfileExpiryRead extends FitProfileExpiryReadPort {
  readonly rows: FitProfileExpiringRow[] = [];

  async findExpiringInWindow(windowStart: Date, windowEnd: Date): Promise<FitProfileExpiringRow[]> {
    return this.rows.filter(
      (r) =>
        r.expiresAt.getTime() >= windowStart.getTime() &&
        r.expiresAt.getTime() < windowEnd.getTime(),
    );
  }
}

export class InMemoryReminderState extends ReminderStatePort {
  readonly seen = new Set<string>();
  readonly claimedSlots = new Set<string>();

  async wasReminderSent(key: string): Promise<boolean> {
    return this.seen.has(key);
  }

  async recordReminderSent(key: string, _ttlSeconds: number): Promise<void> {
    this.seen.add(key);
  }

  async claimReminderSlot(input: {
    userId: string;
    daysLeft: number;
    sentDate: string;
  }): Promise<boolean> {
    const slotKey = `${input.userId}:${input.daysLeft}:${input.sentDate}`;
    if (this.claimedSlots.has(slotKey)) return false;
    this.claimedSlots.add(slotKey);
    return true;
  }
}

export class InMemoryResumeQualitySnapshot extends ResumeQualitySnapshotPort {
  readonly snapshotsByResume = new Map<string, ResumeQualitySnapshot[]>();
  readonly ownerByResume = new Map<string, string>();

  setSnapshots(resumeId: string, rows: ResumeQualitySnapshot[]): void {
    // Caller passes already-ordered (newest first) snapshots.
    this.snapshotsByResume.set(resumeId, rows);
  }

  setOwner(resumeId: string, userId: string): void {
    this.ownerByResume.set(resumeId, userId);
  }

  async findRecentSnapshots(resumeId: string, take: number): Promise<ResumeQualitySnapshot[]> {
    const all = this.snapshotsByResume.get(resumeId) ?? [];
    return all.slice(0, take);
  }

  async findResumeOwnerId(resumeId: string): Promise<string | null> {
    return this.ownerByResume.get(resumeId) ?? null;
  }
}
