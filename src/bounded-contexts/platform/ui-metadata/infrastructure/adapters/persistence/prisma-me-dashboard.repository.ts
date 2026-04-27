/**
 * Prisma adapter for `MeDashboardRepositoryPort`.
 *
 * Owns the parallel fan-out across the half-dozen counts + lookups
 * the dashboard page needs. The use case sees a single typed
 * `MeDashboardPayload`; this is the only place that knows about
 * `Prisma`/`PrismaService`.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type { MeDashboardPayload } from '../../../domain/entities/me-dashboard';
import type { PermissionGrant } from '../../../domain/entities/permission-grant';
import { MeDashboardRepositoryPort } from '../../../domain/ports/me-dashboard.repository.port';

const CTX = 'PrismaMeDashboardRepository';

export class PrismaMeDashboardRepository extends MeDashboardRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async loadDashboard(userId: string): Promise<MeDashboardPayload> {
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

    if (!viewer) {
      this.logger.warn(`Dashboard requested for unknown user ${userId}`, CTX);
    }

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

  async listActivePermissionGrants(userId: string): Promise<PermissionGrant[]> {
    const grants = await this.prisma.userPermission.findMany({
      where: {
        userId,
        granted: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { permission: { select: { resource: true, action: true } } },
    });

    const out: PermissionGrant[] = [];
    for (const g of grants) {
      if (g.permission) out.push(`${g.permission.resource}:${g.permission.action}`);
    }
    return out;
  }
}
