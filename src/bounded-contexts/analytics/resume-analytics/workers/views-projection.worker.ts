import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

/**
 * Views Projection Worker
 *
 * Rolls up ResumeViewEvent rows from the past 24h into the
 * ResumeViewsDailyProjection table so the admin + per-user analytics
 * dashboards can read pre-aggregated daily counts instead of doing heavy
 * GROUP BYs at request time.
 *
 * Runs at 00:30 UTC every day.
 */
@Injectable()
export class ViewsProjectionWorker {
  private readonly logger = new Logger(ViewsProjectionWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('30 0 * * *')
  async run(): Promise<void> {
    const now = new Date();
    // Target day = yesterday (00:00 UTC to 00:00 UTC today).
    const endOfYesterday = startOfUtcDay(now);
    const startOfYesterday = new Date(endOfYesterday.getTime() - 24 * 60 * 60 * 1000);

    try {
      await this.refreshDay(startOfYesterday);
    } catch (err) {
      this.logger.error(
        `Views projection failed for ${startOfYesterday.toISOString()}: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
    }
  }

  /**
   * Exposed so admin tooling / a backfill script can request a specific day.
   */
  async refreshDay(day: Date): Promise<{ rowsUpserted: number }> {
    const dayStart = startOfUtcDay(day);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const events = await this.prisma.resumeViewEvent.findMany({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
      select: {
        resumeId: true,
        ipHash: true,
        resume: { select: { userId: true } },
      },
    });

    type Bucket = { userId: string; viewCount: number; uniqueVisitors: Set<string> };
    const byResume = new Map<string, Bucket>();
    for (const ev of events) {
      const bucket = byResume.get(ev.resumeId) ?? {
        userId: ev.resume?.userId ?? '',
        viewCount: 0,
        uniqueVisitors: new Set<string>(),
      };
      bucket.viewCount += 1;
      if (ev.ipHash) bucket.uniqueVisitors.add(ev.ipHash);
      byResume.set(ev.resumeId, bucket);
    }

    let upserted = 0;
    for (const [resumeId, b] of byResume.entries()) {
      if (!b.userId) continue;
      await this.prisma.resumeViewsDailyProjection.upsert({
        where: { resumeId_day: { resumeId, day: dayStart } },
        create: {
          resumeId,
          userId: b.userId,
          day: dayStart,
          viewCount: b.viewCount,
          uniqueVisitorCount: b.uniqueVisitors.size,
        },
        update: {
          viewCount: b.viewCount,
          uniqueVisitorCount: b.uniqueVisitors.size,
        },
      });
      upserted += 1;
    }

    this.logger.log(
      `Rolled up ${events.length} view events into ${upserted} rows for ${dayStart.toISOString().slice(0, 10)}`,
    );
    return { rowsUpserted: upserted };
  }
}

function startOfUtcDay(d: Date): Date {
  const day = new Date(d);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}
