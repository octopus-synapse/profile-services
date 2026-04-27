/**
 * Prisma adapter for `WeeklyDigestLogPort`. Owns the
 * `UserWeeklyDigestLog` table (per-user idempotence per ISO week)
 * plus the active-user filter for the recipient list.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { WeeklyDigestLogPort } from '../../../domain/ports/weekly-digest-log.port';

export class PrismaWeeklyDigestLogAdapter extends WeeklyDigestLogPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async wasSentThisWeek(userId: string, weekKey: string): Promise<boolean> {
    const row = await this.prisma.userWeeklyDigestLog.findUnique({
      where: { userId_weekKey: { userId, weekKey } },
    });
    return row !== null;
  }

  async recordSent(userId: string, weekKey: string): Promise<void> {
    await this.prisma.userWeeklyDigestLog.create({ data: { userId, weekKey } });
  }

  async listEligibleRecipients(
    userIds: readonly string[],
  ): Promise<Array<{ id: string; name: string | null; email: string }>> {
    if (userIds.length === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: {
        id: { in: [...userIds] },
        email: { not: '' },
        emailVerified: { not: null },
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    });
    return rows
      .filter((r): r is typeof r & { email: string } => Boolean(r.email))
      .map((r) => ({ id: r.id, name: r.name, email: r.email }));
  }
}
