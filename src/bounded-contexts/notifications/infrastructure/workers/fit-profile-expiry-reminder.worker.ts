import type { LoggerPort } from '@/shared-kernel';
import { runWithFailureMode } from '@/shared-kernel/jobs';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { NotificationsUseCases } from '../../application/ports/notifications.port';
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
 *
 * Framework-free POJO. Wired by `registerNotificationsJobs` via
 * `JobQueuePort`.
 */
export class FitProfileExpiryReminderWorker {
  constructor(
    private readonly bc: NotificationsUseCases,
    private readonly queue: JobQueuePort,
    private readonly logger: LoggerPort,
  ) {}

  async process(job: { data: FitProfileExpiryReminderJobData; id?: string }): Promise<void> {
    this.logger.debug(`Processing kind=${job.data.kind}`, CTX);
    await runWithFailureMode({ worker: CTX, logger: this.logger }, 'RETRY', async () => {
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
    });
  }

  private async fanOut(): Promise<void> {
    const jobs = await this.bc.enqueueExpiryReminders.execute();
    for (const j of jobs) {
      await this.queue.enqueue<FitProfileExpiryReminderJobData>(FIT_PROFILE_EXPIRY_REMINDER_QUEUE, {
        kind: 'remind-user',
        ...j,
      });
    }
  }
}
