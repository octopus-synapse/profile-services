/**
 * Prisma adapter for `BadgesRepositoryPort`. Owns the
 * `(userId, kind)` unique-constraint handling and the count of
 * accepted applications used by the "5 interviews" trigger.
 */

import type { BadgeKind, Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type { AwardedBadge } from '../../../domain/entities/badge';
import { BadgesRepositoryPort } from '../../../domain/ports/badges.repository.port';

export class PrismaBadgesRepository extends BadgesRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async listForUser(userId: string): Promise<AwardedBadge[]> {
    const rows = await this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { awardedAt: 'asc' },
      select: { kind: true, awardedAt: true, context: true },
    });
    return rows as AwardedBadge[];
  }

  async listForManyUsers(userIds: string[]): Promise<Map<string, BadgeKind[]>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.userBadge.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, kind: true },
    });
    const byUser = new Map<string, BadgeKind[]>();
    for (const r of rows) {
      const arr = byUser.get(r.userId) ?? [];
      arr.push(r.kind);
      byUser.set(r.userId, arr);
    }
    return byUser;
  }

  async award(
    userId: string,
    kind: BadgeKind,
    context?: Prisma.InputJsonValue,
  ): Promise<{ awarded: boolean }> {
    try {
      await this.prisma.userBadge.create({ data: { userId, kind, context } });
      return { awarded: true };
    } catch (err) {
      // Unique constraint violation → already owned.
      if ((err as { code?: string }).code === 'P2002') {
        return { awarded: false };
      }
      throw err;
    }
  }

  async countAcceptedApplications(userId: string): Promise<number> {
    return this.prisma.jobApplication.count({
      where: { userId, status: 'ACCEPTED' },
    });
  }
}
