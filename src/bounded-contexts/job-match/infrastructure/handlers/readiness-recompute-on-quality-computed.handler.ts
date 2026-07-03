import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events/resume-quality-computed.event';
import type { LoggerPort } from '@/shared-kernel';
import type { ComputeReadinessUseCase } from '../../application/use-cases/compute-readiness.use-case';

const CTX = 'ReadinessRecomputeOnQualityComputedHandler';

/**
 * Recomputes and persists the Readiness Score whenever a resume's
 * Quality Score is (re)computed — but only for the MASTER (primary)
 * resume, since Readiness is a master-level metric. Riding the
 * quality-computed event means Readiness always blends a fresh Quality
 * number, and the recompute cadence naturally follows meaningful edits.
 *
 * Best-effort: the Readiness history row is a trend nicety, so a failure
 * here is swallowed rather than aborting the quality event chain (which
 * also feeds notifications + metrics). Mirrors the quality-on-create
 * swallow policy.
 */
export class ReadinessRecomputeOnQualityComputedHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly computeReadiness: ComputeReadinessUseCase,
    private readonly logger: LoggerPort,
  ) {}

  async onQualityComputed(event: ResumeQualityComputedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    try {
      // Readiness is scored on the master only. Find the owner for whom
      // this resume is the primary; if none, this is a derived resume —
      // skip.
      const owner = await this.prisma.user.findFirst({
        where: { primaryResumeId: resumeId },
        select: { id: true },
      });
      if (!owner) return;

      await this.computeReadiness.execute({ userId: owner.id, resumeId, persist: true });
    } catch (err) {
      this.logger.warn(
        `Readiness recompute failed for resume=${resumeId}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
    }
  }
}
