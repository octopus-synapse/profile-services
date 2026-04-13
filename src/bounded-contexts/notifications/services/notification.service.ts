import { Injectable } from '@nestjs/common';
import type { NotificationType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.notification.create({
      data: {
        userId,
        type,
        actorId,
        message,
        entityType,
        entityId,
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
