import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { LoggerPort } from '@/shared-kernel';
import { NotificationsUseCases } from '../../application/ports/notifications.port';
import type { ExpiryReminderJob } from '../../application/use-cases/enqueue-expiry-reminders/enqueue-expiry-reminders.use-case';

export const FIT_PROFILE_EXPIRY_REMINDER_QUEUE = 'fit-profile-expiry-reminder';

export type FitProfileExpiryReminderJobData =
  | { readonly kind: 'schedule' }
  | ({ readonly kind: 'remind-user' } & ExpiryReminderJob);

const CTX = 'FitProfileExpiryReminderWorker';

/**
 * Daily cron that emits anticipatory reminders ahead of UserFitProfile
 * expiry. Three windows: 7d, 3d, 1d before `expiresAt`. Each user
 * receives at most one reminder per window thanks to a Redis
 * already-sent flag (managed by `SendExpiryReminderUseCase`).
 *
 * Why three discrete reminders instead of one closer to expiry?
 * Behavioural data on similar verifications shows the first
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
  constructor(
    private readonly bc: NotificationsUseCases,
    @InjectQueue(FIT_PROFILE_EXPIRY_REMINDER_QUEUE)
    private readonly queue: Queue<FitProfileExpiryReminderJobData>,
    private readonly logger: LoggerPort,
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
      await this.fanOut();
      return;
    }
    if (job.data.kind === 'remind-user') {
      await this.bc.sendExpiryReminder.execute({
        userId: job.data.userId,
        daysLeft: job.data.daysLeft,
        expiresAt: job.data.expiresAt,
      });
    }
  }

  private async fanOut(): Promise<void> {
    const jobs = await this.bc.enqueueExpiryReminders.execute();
    for (const j of jobs) {
      await this.queue.add('remind-user', { kind: 'remind-user', ...j });
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<FitProfileExpiryReminderJobData>, err: Error): void {
    this.logger.error(
      `expiry-reminder failed kind=${job?.data?.kind} err=${err.message}`,
      err.stack,
      CTX,
    );
  }
}
