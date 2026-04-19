import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface MeDashboardPayload {
  viewer: { id: string; name: string | null; email: string | null };
  counts: {
    resumes: number;
    applications: number;
    unreadNotifications: number;
    followers: number;
    following: number;
  };
  recentNotifications: Array<{
    id: string;
    type: string;
    message: string;
    messageKey: string | null;
    messageParams: unknown;
    read: boolean;
    createdAt: Date;
  }>;
  pendingFollowUps: number;
}

@Injectable()
export class MeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string): Promise<MeDashboardPayload> {
    const [
      viewer,
      resumesCount,
      applicationsCount,
      unreadCount,
      followersCount,
      followingCount,
      recentNotifications,
      pendingFollowUps,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.resume.count({ where: { userId } }),
      this.prisma.jobApplication.count({
        where: { userId, status: { not: 'WITHDRAWN' } },
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          message: true,
          messageKey: true,
          messageParams: true,
          read: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({
        where: { userId, type: 'APPLICATION_STALE', read: false },
      }),
    ]);

    return {
      viewer: viewer ?? { id: userId, name: null, email: null },
      counts: {
        resumes: resumesCount,
        applications: applicationsCount,
        unreadNotifications: unreadCount,
        followers: followersCount,
        following: followingCount,
      },
      recentNotifications,
      pendingFollowUps,
    };
  }
}
