/**
 * Jobs similar to a reference job, ranked by skill overlap. Used on
 * the job detail page to surface adjacent opportunities without running
 * the full fit-score pipeline.
 */

import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';
import type { JobEnrichmentService } from '../../services/job-enrichment.service';

export interface FindSimilarJobsResult {
  readonly items: Array<Record<string, unknown> & { skillOverlap: number }>;
}

export class FindSimilarJobsUseCase {
  constructor(
    private readonly repository: JobsRepositoryPort,
    private readonly enrichment: JobEnrichmentService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    jobId: string,
    viewerId: string | undefined,
    limit = 5,
  ): Promise<FindSimilarJobsResult> {
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const source = await this.repository.findJobById(jobId);
    if (!source) throw new EntityNotFoundException('Job', jobId);

    const sourceSkills = (source.skills ?? []).filter((s) => s?.trim());
    if (sourceSkills.length === 0) {
      return { items: [] };
    }

    const candidates = await this.repository.findSimilarCandidates({
      excludeJobId: jobId,
      skills: sourceSkills,
      take: 100,
    });

    const sourceSet = new Set(sourceSkills.map((s) => s.toLowerCase()));
    const scored = candidates
      .map((job) => {
        const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase());
        const overlap = jobSkills.filter((s) => sourceSet.has(s)).length;
        return { job, overlap };
      })
      .filter((e) => e.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, safeLimit);

    const enriched = await this.enrichment.withBookmarkedAndApplied(
      scored.map((e) => e.job),
      viewerId,
    );
    return {
      items: enriched.map((job, i) => ({ ...job, skillOverlap: scored[i].overlap })),
    };
  }
}
