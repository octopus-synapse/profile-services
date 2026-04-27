import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { ExpireFitProfileUseCase } from '../../application/use-cases/expire-fit-profile.use-case';

export const FIT_PROFILE_EXPIRE_QUEUE = 'fit-profile-expire';

export type FitProfileExpireJobData =
  | { readonly kind: 'schedule' }
  | { readonly kind: 'expire-user'; readonly userId: string };

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
 */
const CTX = 'FitProfileExpireWorker';

@Injectable()
@Processor(FIT_PROFILE_EXPIRE_QUEUE, { concurrency: 2 })
export class FitProfileExpireWorker extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expireUseCase: ExpireFitProfileUseCase,
    @InjectQueue(FIT_PROFILE_EXPIRE_QUEUE)
    private readonly queue: Queue<FitProfileExpireJobData>,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      'fit-profile-expire-schedule',
      { kind: 'schedule' },
      {
        repeat: { pattern: '0 3 * * *', tz: 'America/Sao_Paulo' },
        jobId: 'fit-profile-expire-schedule-cron',
      },
    );
  }

  async process(job: Job<FitProfileExpireJobData>): Promise<void> {
    if (job.data.kind === 'schedule') {
      await this.enqueueExpiredUsers();
      return;
    }
    if (job.data.kind === 'expire-user') {
      await this.expireUseCase.execute(job.data.userId);
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
    await this.queue.addBulk(
      rows.map((r) => ({
        name: 'fit-profile-expire-user',
        // `jobId` guards against double-queuing in a narrow window —
        // if a second schedule tick lands before the first finishes,
        // BullMQ collapses into a single job per user per day.
        data: { kind: 'expire-user' as const, userId: r.userId },
        opts: { jobId: `fit-profile-expire:${r.userId}:${now.toISOString().slice(0, 10)}` },
      })),
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<FitProfileExpireJobData>, err: Error): void {
    const userId = job?.data?.kind === 'expire-user' ? job.data.userId : '(schedule)';
    this.logger.error(
      `fit-profile-expire failed user=${userId} err=${err.message}`,
      err.stack,
      CTX,
    );
  }
}
