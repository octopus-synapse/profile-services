import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { ExpireFitProfileUseCase } from '../../application/use-cases/expire-fit-profile.use-case';

export const FIT_PROFILE_EXPIRE_QUEUE = 'fit-profile-expire';

export type FitProfileExpireJobData =
  | { readonly kind: 'schedule' }
  | { readonly kind: 'expire-user'; readonly userId: string };

const CTX = 'FitProfileExpireWorker';

/**
 * Nightly sweeper that flips stale `UserFitProfile` rows into the
 * "expired" state. The user-facing symptom of expiry is `GET
 * /v1/fit-profile/me` returning `status: 'expired'` and the Match
 * Score endpoint replying `409 fit_profile_required` — both fall out
 * naturally from the TTL column we read without any code path here.
 *
 * We still run the worker because `ExpireFitProfileUseCase` emits
 * lifecycle side-effects (notifications, audit log entries, remap
 * history) that a passive TTL read can't trigger. Scheduled at 03:00
 * America/Sao_Paulo for the same stagger-from-prod-peak reasoning as
 * the other nightly jobs.
 *
 * Framework-free POJO. Wired by `registerFitProfileJobs` via
 * `JobQueuePort`.
 */
export class FitProfileExpireWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expireUseCase: ExpireFitProfileUseCase,
    private readonly queue: JobQueuePort,
    private readonly logger: LoggerPort,
  ) {}

  async process(job: { data: FitProfileExpireJobData; id?: string }): Promise<void> {
    try {
      if (job.data.kind === 'schedule') {
        await this.enqueueExpiredUsers();
        return;
      }
      if (job.data.kind === 'expire-user') {
        await this.expireUseCase.execute(job.data.userId);
      }
    } catch (err) {
      const userId = job?.data?.kind === 'expire-user' ? job.data.userId : '(schedule)';
      this.logger.error(`fit-profile-expire failed user=${userId} err=${err instanceof Error ? err.message : String(err)}`, { context: CTX, stack: err instanceof Error ? err.stack : undefined });
      throw err;
    }
  }

  private async enqueueExpiredUsers(): Promise<void> {
    const now = new Date();
    const rows = await this.prisma.userFitProfile.findMany({
      where: { expiresAt: { lte: now } },
      select: { userId: true },
    });
    if (rows.length === 0) return;

    this.logger.log(`fit-profile-expire: enqueueing ${rows.length} users`, CTX);
    const today = now.toISOString().slice(0, 10);
    for (const r of rows) {
      // `jobId` guards against double-queuing in a narrow window —
      // if a second schedule tick lands before the first finishes,
      // BullMQ collapses into a single job per user per day.
      await this.queue.enqueue<FitProfileExpireJobData>(
        FIT_PROFILE_EXPIRE_QUEUE,
        { kind: 'expire-user', userId: r.userId },
        { jobId: `fit-profile-expire:${r.userId}:${today}` },
      );
    }
  }
}
