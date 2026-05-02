/**
 * Prisma adapter for `NotificationsRepositoryPort`. Owns the schema-
 * to-domain conversion and every direct Prisma call. The use cases
 * never see a `Prisma*` type.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
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
} from '../../../domain/entities/notification';
import {
  type MarkReadResult,
  NotificationsRepositoryPort,
  type SetPreferenceInput,
  type UnreadPreferenceLookup,
} from '../../../domain/ports/notifications.repository.port';

export class PrismaNotificationsRepository extends NotificationsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateNotificationData): Promise<NotificationView> {
    const row = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        actorId: data.actorId,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      actorId: row.actorId,
      entityType: row.entityType,
      entityId: row.entityId,
      message: row.message,
      read: row.read,
      createdAt: row.createdAt,
      actor: null,
    };
  }

  async markEmailSentAt(notificationId: string, sentAt: Date): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { emailSentAt: sentAt },
    });
  }

  async findRecipient(userId: string): Promise<NotificationRecipient | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user?.email) return null;
    return { id: user.id, name: user.name, email: user.email };
  }

  async listForUser(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<NotificationListPage> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, username: true, photoURL: true },
        },
      },
    });

    const data: NotificationView[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      type: r.type,
      actorId: r.actorId,
      entityType: r.entityType,
      entityId: r.entityId,
      message: r.message,
      read: r.read,
      createdAt: r.createdAt,
      actor: r.actor
        ? {
            id: r.actor.id,
            name: r.actor.name,
            username: r.actor.username,
            photoURL: r.actor.photoURL,
          }
        : null,
    }));

    const nextCursor = data.length === limit ? (data[data.length - 1]?.id ?? null) : null;
    return { data, nextCursor };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, notificationId: string | undefined): Promise<MarkReadResult> {
    if (notificationId) {
      const r = await this.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { read: true },
      });
      return { count: r.count };
    }
    const r = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { count: r.count };
  }

  async findOwnerById(notificationId: string): Promise<string | null> {
    const row = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }

  async deleteOlderThan(cutoff: Date): Promise<{ count: number }> {
    const r = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return { count: r.count };
  }

  async findUserPreference(
    userId: string,
    type: NotificationType,
  ): Promise<UnreadPreferenceLookup | null> {
    const row = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
      select: { enabled: true, emailEnabled: true, emailDelivery: true },
    });
    if (!row) return null;
    return {
      enabled: row.enabled,
      emailEnabled: row.emailEnabled,
      emailDelivery: row.emailDelivery as EmailDeliveryMode,
    };
  }

  async listUserPreferences(userId: string): Promise<NotificationPreferenceView[]> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId },
      select: { type: true, enabled: true, emailEnabled: true, emailDelivery: true },
    });
    return rows.map((p) => ({
      type: p.type,
      enabled: p.enabled,
      emailEnabled: p.emailEnabled,
      emailDelivery: p.emailDelivery as EmailDeliveryMode,
    }));
  }

  async setPreference(
    userId: string,
    type: NotificationType,
    input: SetPreferenceInput,
  ): Promise<NotificationPreferenceView> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: {
        userId,
        type,
        enabled: input.enabled ?? true,
        emailEnabled: input.emailEnabled ?? true,
        emailDelivery: input.emailDelivery ?? 'INSTANT',
      },
      update: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.emailEnabled !== undefined ? { emailEnabled: input.emailEnabled } : {}),
        ...(input.emailDelivery !== undefined ? { emailDelivery: input.emailDelivery } : {}),
      },
      select: { type: true, enabled: true, emailEnabled: true, emailDelivery: true },
    });
    return {
      type: row.type,
      enabled: row.enabled,
      emailEnabled: row.emailEnabled,
      emailDelivery: row.emailDelivery as EmailDeliveryMode,
    };
  }

  async listDailyDigestPreferences(): Promise<DailyDigestPreference[]> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { emailDelivery: 'DAILY', emailEnabled: true },
      select: { userId: true, type: true },
    });
    return rows.map((r) => ({ userId: r.userId, type: r.type }));
  }

  async listPendingDigestNotifications(
    userId: string,
    types: NotificationType[],
    cutoff: Date,
    take: number,
  ): Promise<PendingDigestNotification[]> {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        type: { in: types },
        emailDigestSentAt: null,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, message: true, createdAt: true, type: true },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      message: r.message,
      createdAt: r.createdAt,
    }));
  }

  async markDigestEmailSent(notificationIds: string[], sentAt: Date): Promise<void> {
    if (notificationIds.length === 0) return;
    await this.prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { emailDigestSentAt: sentAt },
    });
  }

  async listWeeklyOptInUserIds(): Promise<string[]> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { emailDelivery: 'WEEKLY', emailEnabled: true },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((r) => r.userId);
  }
}
