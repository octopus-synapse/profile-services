import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { NotificationType } from '@prisma/client';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly email: EmailService,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    actorId: string,
    message: string,
    entityType?: string,
    entityId?: string,
  ) {
    if (userId === actorId) {
      return null;
    }

    // Respect user preferences — if explicitly disabled for this type, skip.
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    if (pref && !pref.enabled) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        actorId,
        message,
        entityType,
        entityId,
      },
    });

    this.eventEmitter.emit(`notif:user:${userId}`, notification);

    // Fire-and-forget email delivery; never block notification creation on SMTP.
    void this.maybeSendInstantEmail(userId, type, notification.id, message);

    return notification;
  }

  private async maybeSendInstantEmail(
    userId: string,
    type: NotificationType,
    notificationId: string,
    message: string,
  ): Promise<void> {
    try {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: { userId_type: { userId, type } },
      });
      // Default: INSTANT + emailEnabled=true, unless user overrode to OFF/DAILY.
      const mode = pref?.emailDelivery ?? 'INSTANT';
      if (mode !== 'INSTANT' || pref?.emailEnabled === false) return;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (!user?.email) return;

      await this.email.sendEmail({
        to: user.email,
        subject: `[ProFile] ${humanizeType(type)}`,
        html: `<p>Hi ${user.name ?? 'there'},</p><p>${escapeHtml(message)}</p>`,
        text: message,
      });

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { emailSentAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(
        `Notification email failed for user ${userId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  /**
   * Sends a daily digest of unread notifications to each user with
   * emailDelivery=DAILY. Called by a scheduled cron job (see
   * NotificationDigestWorker). Idempotent via `emailDigestSentAt` timestamp.
   */
  async sendDailyDigests(): Promise<{ usersEmailed: number; notificationsBatched: number }> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { emailDelivery: 'DAILY', emailEnabled: true },
      select: { userId: true, type: true },
    });
    const byUser = new Map<string, NotificationType[]>();
    for (const p of prefs) {
      if (!byUser.has(p.userId)) byUser.set(p.userId, []);
      byUser.get(p.userId)?.push(p.type);
    }

    let usersEmailed = 0;
    let notificationsBatched = 0;

    for (const [userId, types] of byUser.entries()) {
      const pending = await this.prisma.notification.findMany({
        where: {
          userId,
          type: { in: types },
          emailDigestSentAt: null,
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, message: true, createdAt: true, type: true },
      });
      if (pending.length === 0) continue;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (!user?.email) continue;

      const items = pending
        .map(
          (n) =>
            `<li><strong>${humanizeType(n.type)}</strong>: ${escapeHtml(n.message)} <em>(${n.createdAt.toISOString()})</em></li>`,
        )
        .join('');

      try {
        await this.email.sendEmail({
          to: user.email,
          subject: `[ProFile] Your daily digest — ${pending.length} new notifications`,
          html: `<p>Hi ${user.name ?? 'there'},</p><p>Here's what you missed in the last 24h:</p><ul>${items}</ul>`,
          text: pending.map((n) => `${humanizeType(n.type)}: ${n.message}`).join('\n'),
        });
        await this.prisma.notification.updateMany({
          where: { id: { in: pending.map((n) => n.id) } },
          data: { emailDigestSentAt: new Date() },
        });
        usersEmailed += 1;
        notificationsBatched += pending.length;
      } catch (err) {
        this.logger.warn(
          `Digest email failed for user ${userId}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    return { usersEmailed, notificationsBatched };
  }

  /**
   * Returns the user's preferences merged with defaults — every type appears
   * in the response, defaulting to `enabled: true` when no record exists.
   */
  async getPreferences(userId: string): Promise<
    Array<{
      type: NotificationType;
      enabled: boolean;
      emailEnabled: boolean;
      emailDelivery: string;
    }>
  > {
    const overrides = await this.prisma.notificationPreference.findMany({
      where: { userId },
      select: { type: true, enabled: true, emailEnabled: true, emailDelivery: true },
    });
    const overrideMap = new Map(overrides.map((p) => [p.type, p]));
    const allTypes: NotificationType[] = [
      'POST_LIKED',
      'POST_COMMENTED',
      'POST_REPOSTED',
      'POST_BOOKMARKED',
      'COMMENT_REPLIED',
      'CONNECTION_REQUEST',
      'CONNECTION_ACCEPTED',
      'FOLLOW_NEW',
    ];
    return allTypes.map((type) => {
      const o = overrideMap.get(type);
      return {
        type,
        enabled: o?.enabled ?? true,
        emailEnabled: o?.emailEnabled ?? true,
        emailDelivery: o?.emailDelivery ?? 'INSTANT',
      };
    });
  }

  async setPreference(
    userId: string,
    type: NotificationType,
    input: {
      enabled?: boolean;
      emailEnabled?: boolean;
      emailDelivery?: 'INSTANT' | 'DAILY' | 'OFF';
    },
  ) {
    return this.prisma.notificationPreference.upsert({
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
    });
  }

  async getByUser(userId: string, cursor?: string, limit = 20) {
    limit = Math.min(limit, 100);

    const where = { userId };

    const notifications = await this.prisma.notification.findMany({
      where,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            photoURL: true,
          },
        },
      },
    });

    const nextCursor =
      notifications.length === limit ? notifications[notifications.length - 1].id : null;

    return {
      data: notifications,
      nextCursor,
    };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markRead(userId: string, notificationId?: string) {
    if (notificationId) {
      return this.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { read: true },
      });
    }

    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async deleteOld(days = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
  }
}

function humanizeType(type: NotificationType): string {
  return type
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
