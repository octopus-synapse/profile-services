import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import type { LoggerPort } from '@/shared-kernel';
import { hasPermission, Permission } from '@/shared-kernel/authorization';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { CuratedSelectorService } from '../application/services/curated-selector.service';
import {
  AutoApplyAllPicksFailedException,
  AutomationWorkerUnavailableException,
} from '../domain/exceptions/automation.exceptions';

export const AUTO_APPLY_QUEUE = 'auto-apply';

export type AutoApplyJobData = { kind: 'schedule' } | { kind: 'run-for-user'; userId: string };

/** Hard cap on applications per user per hour — keeps us friendly to
 * recruiters and avoids burning through the user's reputation. */
const HOURLY_CAP_PER_USER = 5;

const CTX = 'AutoApplyWorker';

/**
 * Framework-free POJO. Wired by `registerAutomationJobs` via
 * `JobQueuePort` (BullMQ adapter lives in
 * `infrastructure/nest-adapter/bullmq-job-queue.adapter.ts`).
 */
export class AutoApplyWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly selector: CuratedSelectorService,
    private readonly tailor: ResumeTailorService,
    private readonly queue: JobQueuePort,
    private readonly logger: LoggerPort,
  ) {}

  async process(job: { data: AutoApplyJobData; id?: string }): Promise<void> {
    try {
      if (job.data.kind === 'schedule') {
        await this.enqueuePerUser();
        return;
      }
      if (job.data.kind === 'run-for-user') {
        await this.runForUser(job.data.userId);
      }
    } catch (err) {
      this.logger.error(
        `Job ${job.id} failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
        CTX,
      );
      throw err;
    }
  }

  private async enqueuePerUser(): Promise<void> {
    const candidates = await this.prisma.user.findMany({
      where: {
        isActive: true,
        preferences: { applyMode: 'AUTO_APPLY' },
      },
      select: { id: true, roles: true },
    });
    // Allowlist-gated: only users with AUTO_APPLY permission (granted by the
    // BETA_TESTER role or ADMIN) are actually enqueued. Users that opted into
    // AUTO_APPLY in preferences but lack the permission are logged and skipped.
    const allowed = candidates.filter((u) => hasPermission(u.roles, Permission.AUTO_APPLY));
    const skipped = candidates.length - allowed.length;
    this.logger.log(
      `Enqueueing auto-apply for ${allowed.length} users (skipped ${skipped} without AUTO_APPLY permission)`,
      CTX,
    );
    if (allowed.length === 0) return;
    for (const u of allowed) {
      try {
        await this.queue.enqueue<AutoApplyJobData>(AUTO_APPLY_QUEUE, {
          kind: 'run-for-user',
          userId: u.id,
        });
      } catch (err) {
        // BullMQ / queue backend is down — fail fast with a domain
        // type so the scheduler retries via its standard backoff
        // policy instead of treating this as a per-user failure.
        this.logger.error(
          `Auto-apply enqueue failed for user=${u.id}: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? err.stack : undefined,
          CTX,
        );
        throw new AutomationWorkerUnavailableException();
      }
    }
  }

  private async runForUser(userId: string): Promise<void> {
    // Rate limit: count applications submitted in the last 60 min.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.jobApplication.count({
      where: { userId, createdAt: { gte: oneHourAgo } },
    });
    if (recent >= HOURLY_CAP_PER_USER) {
      this.logger.log(`User ${userId} hit hourly cap (${recent}/${HOURLY_CAP_PER_USER})`, CTX);
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
    const failures: Array<{ jobId: string; reason: string }> = [];
    const primaryResumeId = user.primaryResumeId;
    for (const pick of picks) {
      try {
        const existing = await this.prisma.jobApplication.findUnique({
          where: { jobId_userId: { jobId: pick.jobId, userId } },
        });
        if (existing) continue;

        const tailored = await this.tailor.tailorForJob({
          resumeId: primaryResumeId,
          userId,
          jobId: pick.jobId,
        });

        await this.prisma.$transaction(async (tx) => {
          const raceCheck = await tx.jobApplication.findUnique({
            where: { jobId_userId: { jobId: pick.jobId, userId } },
          });
          if (raceCheck) return;
          await tx.jobApplication.create({
            data: {
              jobId: pick.jobId,
              userId,
              resumeId: primaryResumeId,
              tailoredVersionId: tailored.versionId,
              coverLetter:
                tailored.summary ?? user.preferences?.applyCriteria?.defaultCover ?? null,
            },
          });
        });
        submitted++;
      } catch (err) {
        const reason = (err as Error).message;
        failures.push({ jobId: pick.jobId, reason });
        this.logger.error(
          `Auto-apply user=${userId} job=${pick.jobId} failed: ${reason}`,
          undefined,
          CTX,
        );
      }
    }
    this.logger.log(`Auto-apply: user=${userId} submitted=${submitted} (of ${picks.length})`, CTX);
    if (failures.length === picks.length && picks.length > 0) {
      throw new AutoApplyAllPicksFailedException(userId, picks.length, failures[0].reason);
    }
  }
}
