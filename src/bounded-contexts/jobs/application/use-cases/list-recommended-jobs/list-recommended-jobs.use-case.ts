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
    // P1 #36 — clamp limit to [1, 50] so a hostile / accidental
    // `limit=0` returns the first page (not an empty page) and a huge
    // `limit=999` doesn't blow up the response size.
    const safeLimit = Math.max(1, Math.min(limit, 50));
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
        const jobSkillsLower = (job.skills ?? []).map((s) => s.toLowerCase());
        const jobSet = new Set(jobSkillsLower);
        // P1 #36 — symmetric Jaccard match score (|A ∩ B| / |A ∪ B|)
        // instead of |intersect| / |jobSkills|. Previous formula
        // overweighted narrow job postings (one skill match against a
        // 50-skill resume scored 100%) and produced asymmetric ranking
        // between two otherwise-comparable candidates.
        let intersectCount = 0;
        for (const s of jobSet) if (userSet.has(s)) intersectCount++;
        const unionCount = userSet.size + jobSet.size - intersectCount;
        const matchScore = unionCount === 0 ? 0 : Math.round((intersectCount / unionCount) * 100);
        return { job, matchScore, intersectCount };
      })
      .filter((entry) => entry.intersectCount > 0)
      // P1 #36 — deterministic tiebreaker. Equal matchScore rows fall
      // back to newest first (createdAt desc), then stable id desc so
      // pagination doesn't shuffle on every request.
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        const ta = a.job.createdAt?.getTime() ?? 0;
        const tb = b.job.createdAt?.getTime() ?? 0;
        if (tb !== ta) return tb - ta;
        return b.job.id < a.job.id ? -1 : b.job.id > a.job.id ? 1 : 0;
      });

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
