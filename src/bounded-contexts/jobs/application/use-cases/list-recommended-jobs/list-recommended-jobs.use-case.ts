/**
 * Recommend jobs based on the user's resume skills. Fetches a generous
 * candidate pool, scores each candidate by skill-overlap percentage,
 * and pages client-side.
 */

import { LoggerPort } from '@/shared-kernel';
import type { Job } from '../../../domain/entities/job';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';
import type { JobEnrichmentService } from '../../services/job-enrichment.service';

export interface ListRecommendedJobsResult {
  readonly data: Array<Job & { matchScore: number; isBookmarked: boolean; hasApplied: boolean }>;
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export class ListRecommendedJobsUseCase {
  constructor(
    private readonly repository: JobsRepositoryPort,
    private readonly enrichment: JobEnrichmentService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, page = 1, limit = 20): Promise<ListRecommendedJobsResult> {
    const safeLimit = Math.min(limit, 50);
    const safePage = Math.max(1, page);

    const userSkills = await this.repository.collectUserSkills(userId);
    if (userSkills.length === 0) {
      return { data: [], total: 0, page: safePage, limit: safeLimit, totalPages: 0 };
    }

    const candidates = await this.repository.findRecommendableCandidates({
      excludeAuthorId: userId,
      skills: userSkills,
      take: 200,
    });

    const userSet = new Set(userSkills.map((s) => s.toLowerCase()));
    const scored = candidates
      .map((job) => {
        const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase());
        const intersect = jobSkills.filter((s) => userSet.has(s));
        const denominator = Math.max(jobSkills.length, 1);
        const matchScore = Math.round((intersect.length / denominator) * 100);
        return { job, matchScore, intersectCount: intersect.length };
      })
      .filter((entry) => entry.intersectCount > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    const total = scored.length;
    const totalPages = Math.ceil(total / safeLimit);
    const slice = scored.slice((safePage - 1) * safeLimit, safePage * safeLimit);

    const enriched = await this.enrichment.withBookmarkedAndApplied(
      slice.map((e) => e.job),
      userId,
    );

    return {
      data: enriched.map((job, i) => ({ ...job, matchScore: slice[i].matchScore })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }
}
