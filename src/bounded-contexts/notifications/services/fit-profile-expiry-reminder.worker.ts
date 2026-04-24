import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { NotificationService } from './notification.service';

export const FIT_PROFILE_EXPIRY_REMINDER_QUEUE = 'fit-profile-expiry-reminder';

export type FitProfileExpiryReminderJobData =
  | { readonly kind: 'schedule' }
  | {
      readonly kind: 'remind-user';
      readonly userId: string;
      readonly daysLeft: 7 | 3 | 1;
      readonly expiresAt: string;
    };

const REMINDER_WINDOWS: ReadonlyArray<7 | 3 | 1> = [7, 3, 1];
/** Idempotence: one reminder per user per window. The cache key
 *  encodes both. TTL outlives the window so a duplicate scan in the
 *  same day skips. */
const SENT_FLAG_TTL_SECONDS = 60 * 60 * 24 * 8; // 8 days
/** A standard user is anyone with `role_user_standard`; the rest
 *  (admins, recruiters) bypass the lockout entirely so we don't
 *  bother emailing them about expiry. */
const STANDARD_ROLE = 'role_user_standard';

/**
 * Daily cron that emits anticipatory reminders ahead of UserFitProfile
 * expiry. Three windows: 7d, 3d, 1d before `expiresAt`. Each user
 * receives at most one reminder per window thanks to a Redis
 * already-sent flag.
 *
 * Why three discrete reminders instead of one closer to expiry?
 * Because behavioural data on similar verifications shows the first
 * notification is often dismissed; a recurring nudge with a shrinking
 * countdown converts noticeably better. The three windows are coarse
 * enough that the user never feels spammed.
 *
 * Scheduled at 09:00 America/Sao_Paulo so reminders land mid-morning
 * (highest open rates), staggered far from the other crons.
 */
@Injectable()
@Processor(FIT_PROFILE_EXPIRY_REMINDER_QUEUE, { concurrency: 4 })
export class FitProfileExpiryReminderWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(FitProfileExpiryReminderWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly notifications: NotificationService,
    @InjectQueue(FIT_PROFILE_EXPIRY_REMINDER_QUEUE)
    private readonly queue: Queue<FitProfileExpiryReminderJobData>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      'fit-profile-expiry-reminder-schedule',
      { kind: 'schedule' },
      {
        repeat: { pattern: '0 9 * * *', tz: 'America/Sao_Paulo' },
        jobId: 'fit-profile-expiry-reminder-schedule-cron',
      },
    );
  }

  async process(job: Job<FitProfileExpiryReminderJobData>): Promise<void> {
    if (job.data.kind === 'schedule') {
      await this.enqueueDueReminders();
      return;
    }
    if (job.data.kind === 'remind-user') {
      await this.remind(job.data.userId, job.data.daysLeft, job.data.expiresAt);
    }
  }

  /**
   * Scans `UserFitProfile.expiresAt` for rows that fall inside any of
   * the three reminder windows (centred on midnight America/Sao_Paulo
   * for the day in question). Already-sent users are filtered at the
   * fanout level so we don't pay for a job-per-user round-trip.
   */
  private async enqueueDueReminders(): Promise<void> {
    const now = Date.now();
    for (const daysLeft of REMINDER_WINDOWS) {
      // Window: [now + (daysLeft-0.5)d, now + (daysLeft+0.5)d)
      const windowStart = new Date(now + (daysLeft - 0.5) * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(now + (daysLeft + 0.5) * 24 * 60 * 60 * 1000);

      const dueProfiles = await this.prisma.userFitProfile.findMany({
        where: {
          expiresAt: { gte: windowStart, lt: windowEnd },
          // Skip anonymized profiles (no vector); they need a fresh
          // questionnaire anyway and the lockout-on-action path will
          // surface that.
          NOT: { vectorJson: { equals: 'null' } },
        },
        select: { userId: true, expiresAt: true, user: { select: { roles: true } } },
      });

      for (const p of dueProfiles) {
        if (!p.user.roles.includes(STANDARD_ROLE)) continue;
        const flagKey = this.flagKey(p.userId, daysLeft);
        const already = await this.cache.get<boolean>(flagKey);
        if (already) continue;
        await this.queue.add('remind-user', {
          kind: 'remind-user',
          userId: p.userId,
          daysLeft,
          expiresAt: p.expiresAt.toISOString(),
        });
      }
    }
  }

  private async remind(userId: string, daysLeft: 7 | 3 | 1, expiresAt: string): Promise<void> {
    const flagKey = this.flagKey(userId, daysLeft);
    const already = await this.cache.get<boolean>(flagKey);
    if (already) return;
    try {
      await this.notifications.create(
        userId,
        'FIT_PROFILE_EXPIRY_REMINDER',
        'system',
        `Seu perfil de fit expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} (${expiresAt}). Refaça o questionário antes para não perder o match.`,
        'UserFitProfile',
        userId,
      );
      await this.cache.set(flagKey, true, SENT_FLAG_TTL_SECONDS).catch(() => {});
    } catch (err) {
      this.logger.warn(
        `expiry-reminder failed user=${userId} daysLeft=${daysLeft}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  private flagKey(userId: string, daysLeft: number): string {
    return `notif:fit-expiry-reminder:${userId}:${daysLeft}`;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<FitProfileExpiryReminderJobData>, err: Error): void {
    this.logger.error(`expiry-reminder failed kind=${job?.data?.kind} err=${err.message}`);
  }
}
