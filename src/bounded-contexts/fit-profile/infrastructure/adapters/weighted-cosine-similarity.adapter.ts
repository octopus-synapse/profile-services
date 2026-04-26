import { Injectable } from '@nestjs/common';
import { JobFitProfileRepositoryPort } from '../../domain/ports/job-fit-profile.repository.port';
import { SimilarityPort, type SimilarityResult } from '../../domain/ports/similarity.port';
import { UserFitProfileRepositoryPort } from '../../domain/ports/user-fit-profile.repository.port';
import { weightedCosineScore } from '../../domain/rules/fit-similarity.rules';
import { FIT_RULES_VERSION } from '../../domain/types';

/**
 * Default `SimilarityPort` implementation. Role Match fetches a
 * `JobFitProfile`; Culture Match is a placeholder that currently
 * returns `null` — there's no "company profile" table yet in this
 * refactor (`SCORES_TODO.md` tracks it), and we'd rather return an
 * explicit `null` so job-match surfaces the missing data than fake
 * a neutral 50 that gets averaged into a recruiter-facing number.
 *
 * Swap this adapter in the module when Mahalanobis lands.
 */
@Injectable()
export class WeightedCosineSimilarityAdapter extends SimilarityPort {
  constructor(
    private readonly userProfiles: UserFitProfileRepositoryPort,
    private readonly jobProfiles: JobFitProfileRepositoryPort,
  ) {
    super();
  }

  async culture(_userId: string, _companyId: string): Promise<SimilarityResult> {
    // Culture profiles live behind a future `CompanyFitProfile` table.
    // Until that exists, surface `null` so the caller can decide
    // whether to degrade to a neutral Fit or propagate the gap.
    return { score: null, algorithm: 'weighted-cosine', rulesVersion: FIT_RULES_VERSION };
  }

  async role(userId: string, jobId: string): Promise<SimilarityResult> {
    const [user, job] = await Promise.all([
      this.userProfiles.findByUserId(userId),
      this.jobProfiles.findByJobId(jobId),
    ]);

    if (!user || user.vector === null || !job) {
      return { score: null, algorithm: 'weighted-cosine', rulesVersion: FIT_RULES_VERSION };
    }

    const score = weightedCosineScore(user.vector, job.vector);
    return { score, algorithm: 'weighted-cosine', rulesVersion: FIT_RULES_VERSION };
  }
}
