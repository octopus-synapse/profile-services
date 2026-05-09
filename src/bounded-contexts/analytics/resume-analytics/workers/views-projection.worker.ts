import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runGuardedJob } from '@/shared-kernel/jobs';

const CTX = 'ViewsProjectionWorker';
// p99: daily projection rolls up one day of events; ~3 minutes on busy days.
const EXPECTED_DURATION_MS = 3 * 60_000;

/**
 * Views Projection Worker
 *
 * Rolls up ResumeViewEvent rows from the past 24h into the
 * ResumeViewsDailyProjection table so the admin + per-user analytics
 * dashboards can read pre-aggregated daily counts instead of doing heavy
 * GROUP BYs at request time.
 *
 * Runs at 00:30 UTC every day.
 *
 * Framework-free POJO. Wired by the resume-analytics module via
 * `CronPort`. Public `refreshDay(...)` is exposed so admin tooling /
 * backfill scripts can request a specific day.
 */
export class ViewsProjectionWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
    private readonly lock: DistributedLockPort,
  ) {}

  async run(): Promise<void> {
    const now = new Date();
    // Target day = yesterday (00:00 UTC to 00:00 UTC today).
    const endOfYesterday = startOfUtcDay(now);
    const startOfYesterday = new Date(endOfYesterday.getTime() - 24 * 60 * 60 * 1000);

    // P0-010: lock prevents two pods from re-rolling the same day's events.
    await runGuardedJob(
      {
        name: CTX,
        expectedDurationMs: EXPECTED_DURATION_MS,
        failureMode: 'LOG_AND_CONTINUE',
        lock: this.lock,
        logger: this.logger,
      },
      () => this.refreshDay(startOfYesterday).then(() => {}),
    );
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
        update: { viewCount: b.viewCount, uniqueVisitorCount: b.uniqueVisitors.size },
      });
      upserted += 1;
    }

    this.logger.log(
      `Rolled up ${events.length} view events into ${upserted} rows for ${dayStart.toISOString().slice(0, 10)}`,
      CTX,
    );
    return { rowsUpserted: upserted };
  }
}

function startOfUtcDay(d: Date): Date {
  const day = new Date(d);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}
