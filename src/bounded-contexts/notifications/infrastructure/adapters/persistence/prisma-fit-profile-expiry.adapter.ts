/**
 * Prisma adapter for `FitProfileExpiryReadPort`. Reads from the
 * `UserFitProfile` table owned by the fit-profile BC; we do this
 * cross-BC at the infrastructure layer (allowed) rather than going
 * through an HTTP/use-case boundary because the cron job needs raw
 * row access for the window scan.
 *
 * Skips anonymized profiles (no vector) — those need a fresh
 * questionnaire anyway and the lockout-on-action path will surface it.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { FitProfileExpiringRow } from '../../../domain/entities/notification.entity';
import { FitProfileExpiryReadPort } from '../../../domain/ports/fit-profile-expiry.port';

export class PrismaFitProfileExpiryAdapter extends FitProfileExpiryReadPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findExpiringInWindow(windowStart: Date, windowEnd: Date): Promise<FitProfileExpiringRow[]> {
    const rows = await this.prisma.userFitProfile.findMany({
      where: {
        expiresAt: { gte: windowStart, lt: windowEnd },
        NOT: { vectorJson: { equals: 'null' } },
      },
      select: { userId: true, expiresAt: true, user: { select: { roles: true } } },
    });
    return rows.map((r) => ({
      userId: r.userId,
      expiresAt: r.expiresAt,
      userRoles: r.user.roles,
    }));
  }
}
