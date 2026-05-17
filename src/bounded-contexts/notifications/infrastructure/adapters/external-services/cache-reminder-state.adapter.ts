/**
 * Adapter for `ReminderStatePort` backed by the platform `CacheService`
 * (Redis in prod, in-memory in tests) for the fast-path dedup flag, and
 * by the `FitProfileReminderLog` Postgres table for the authoritative
 * slot claim (Wave 1.3 P1 #29).
 *
 * The cache flag is checked first to skip an obvious duplicate without
 * touching Postgres; on a cache miss we attempt an
 * `INSERT ... ON CONFLICT DO NOTHING` against the unique
 * `(userId, daysLeft, sentDate)` index. The rowcount tells us whether
 * this caller was the one that claimed the slot — concurrent workers
 * racing on the same key converge on a single successful claim.
 */

import { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { LoggerPort } from '@/shared-kernel/logger';
import {
  type ClaimReminderSlotInput,
  ReminderStatePort,
} from '../../../domain/ports/reminder-state.port';

const CTX = 'CacheReminderStateAdapter';

export class CacheReminderStateAdapter extends ReminderStatePort {
  constructor(
    private readonly cache: CachePort,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async wasReminderSent(key: string): Promise<boolean> {
    const v = await this.cache.get<boolean>(key);
    return v === true;
  }

  async recordReminderSent(key: string, ttlSeconds: number): Promise<void> {
    await this.cache.set(key, true, ttlSeconds);
  }

  async claimReminderSlot(input: ClaimReminderSlotInput): Promise<boolean> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO "fit_profile_reminder_logs" ("id", "userId", "daysLeft", "sentDate", "sentAt")
        VALUES (uuidv7(), ${input.userId}, ${input.daysLeft}, ${input.sentDate}, NOW())
        ON CONFLICT ("userId", "daysLeft", "sentDate") DO NOTHING
        RETURNING "id"
      `);
      return rows.length > 0;
    } catch (err) {
      this.logger.error('claimReminderSlot failed', {
        context: CTX,
        stack: err instanceof Error ? err.stack : undefined,
        userId: input.userId,
        daysLeft: input.daysLeft,
        sentDate: input.sentDate,
      });
      throw err;
    }
  }
}
