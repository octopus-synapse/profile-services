import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { type Job, type Queue } from 'bullmq';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/services/resume-tailor/resume-tailor.service';
import { CuratedSelectorService } from '../services/curated-selector.service';

export const AUTO_APPLY_QUEUE = 'auto-apply';

export type AutoApplyJobData = { kind: 'schedule' } | { kind: 'run-for-user'; userId: string };

/** Hard cap on applications per user per hour — keeps us friendly to
 * recruiters and avoids burning through the user's reputation. */
const HOURLY_CAP_PER_USER = 5;

@Injectable()
@Processor(AUTO_APPLY_QUEUE, { concurrency: 2 })
export class AutoApplyWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AutoApplyWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly selector: CuratedSelectorService,
    private readonly tailor: ResumeTailorService,
    @InjectQueue(AUTO_APPLY_QUEUE) private readonly queue: Queue<AutoApplyJobData>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Hourly at minute 15 — staggers us away from the weekly-curated cron so
    // the two workers don't fight for DB connections on Monday 9am.
    await this.queue.add(
      'auto-apply-schedule',
      { kind: 'schedule' },
      {
        repeat: { pattern: '15 * * * *', tz: 'America/Sao_Paulo' },
        jobId: 'auto-apply-schedule-cron',
      },
    );
  }

  async process(job: Job<AutoApplyJobData>): Promise<void> {
    if (job.data.kind === 'schedule') {
      await this.enqueuePerUser();
      return;
    }
    if (job.data.kind === 'run-for-user') {
      await this.runForUser(job.data.userId);
    }
  }

  private async enqueuePerUser(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        preferences: { applyMode: 'AUTO_APPLY' },
      },
      select: { id: true },
    });
    this.logger.log(`Enqueueing auto-apply for ${users.length} users`);
    for (const u of users) {
      await this.queue.add('auto-apply-run', { kind: 'run-for-user', userId: u.id });
    }
  }

  private async runForUser(userId: string): Promise<void> {
    // Rate limit: count applications submitted in the last 60 min.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.jobApplication.count({
      where: { userId, createdAt: { gte: oneHourAgo } },
    });
    if (recent >= HOURLY_CAP_PER_USER) {
      this.logger.log(`User ${userId} hit hourly cap (${recent}/${HOURLY_CAP_PER_USER})`);
      return;
    }

    const remaining = HOURLY_CAP_PER_USER - recent;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryResumeId: true,
        preferences: { select: { applyCriteria: true } },
      },
    });
    if (!user?.primaryResumeId) return;

    const minFit = user.preferences?.applyCriteria?.minFit ?? 85;

    // Scan jobs created in the last 24h — we only want fresh ones so the
    // candidate pool stays manageable and we don't reapply to aging listings.
    const picks = await this.selector.selectForUser({
      userId,
      since: new Date(Date.now() - 24 * 3600 * 1000),
      minFit,
      limit: remaining,
    });
    if (picks.length === 0) return;

    let submitted = 0;
    for (const pick of picks) {
      try {
        // Generate a tailored variant first so the cover letter reflects
        // the job. We fire-and-forget the result id — the JobApplication
        // links back by resumeId so we can surface it later.
        await this.tailor.tailorForJob({
          resumeId: user.primaryResumeId,
          userId,
          jobId: pick.jobId,
        });

        // Idempotent — the unique (jobId, userId) constraint protects us.
        const existing = await this.prisma.jobApplication.findUnique({
          where: { jobId_userId: { jobId: pick.jobId, userId } },
        });
        if (existing) continue;

        await this.prisma.jobApplication.create({
          data: {
            jobId: pick.jobId,
            userId,
            resumeId: user.primaryResumeId,
            coverLetter: user.preferences?.applyCriteria?.defaultCover ?? null,
          },
        });
        submitted++;
      } catch (err) {
        this.logger.warn(
          `Auto-apply for user=${userId} job=${pick.jobId} failed: ${(err as Error).message}`,
        );
      }
    }
    this.logger.log(`Auto-apply: user=${userId} submitted=${submitted} (of ${picks.length})`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AutoApplyJobData>, err: Error): void {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}
