/**
 * Recommend jobs based on the user's resume skills. Fetches a generous
 * candidate pool, scores each candidate by skill-overlap percentage,
 * and pages client-side.
 */

import { LoggerPort } from '@/shared-kernel';
import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import type { Job } from '../../../domain/entities/job.entity';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';
import type { JobEnrichmentService } from '../../services/job-enrichment.service';

export type RecommendedJobItem = Job & {
  matchScore: number;
  isBookmarked: boolean;
  hasApplied: boolean;
};

export type ListRecommendedJobsResult = PaginatedResponse<RecommendedJobItem>;

export class ListRecommendedJobsUseCase {
  constructor(
    private readonly repository: JobsRepositoryPort,
    private readonly enrichment: JobEnrichmentService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, page = 1, limit = 20): Promise<ListRecommendedJobsResult> {
    const safeLimit = Math.min(limit, 50);
    const safePage = Math.max(1, page);
    const pagination = { page: safePage, limit: safeLimit };

    const userSkills = await this.repository.collectUserSkills(userId);
    if (userSkills.length === 0) {
      return buildPaginatedResponse<RecommendedJobItem>([], 0, pagination);
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
    const slice = scored.slice((safePage - 1) * safeLimit, safePage * safeLimit);

    const enriched = await this.enrichment.withBookmarkedAndApplied(
      slice.map((e) => e.job),
      userId,
    );

    const items: RecommendedJobItem[] = enriched.map((job, i) => ({
      ...job,
      matchScore: slice[i].matchScore,
    }));

    return buildPaginatedResponse(items, total, pagination);
  }
}
