/**
 * Freezes the Match Score onto a JobApplication when the user applies with a
 * résumé (`JobApplicationSubmittedEvent`, emitted by the jobs BC). Computes
 * the match for (résumé, job) and writes `matchScoreSnapshot` back.
 *
 * Best-effort: if the user has no fit profile (match throws 403) or the job
 * isn't matchable, we leave the snapshot null — the application already
 * succeeded and an absent snapshot is a cosmetic gap, not a failure. So this
 * swallows (logger.warn) rather than rethrowing into the event-bus loop.
 */

import type { JobApplicationSubmittedEvent } from '@/bounded-contexts/jobs/domain/events';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { ComputeMatchUseCase } from '../../application/use-cases/compute-match.use-case';

const CTX = 'SnapshotMatchOnApplicationSubmitted';

export class SnapshotMatchOnApplicationSubmittedHandler {
  constructor(
    private readonly computeMatch: ComputeMatchUseCase,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async onApplicationSubmitted(event: JobApplicationSubmittedEvent): Promise<void> {
    const applicationId = event.aggregateId;
    const { userId, jobId, resumeId } = event.payload;
    try {
      const breakdown = await this.computeMatch.execute({ userId, resumeId, jobId });
      await this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: { matchScoreSnapshot: breakdown.overallScore },
      });
      this.logger.log(
        `match snapshot frozen application=${applicationId} score=${breakdown.overallScore}`,
        CTX,
      );
    } catch (err) {
      this.logger.warn(
        `snapshot skipped application=${applicationId}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
    }
  }
}
