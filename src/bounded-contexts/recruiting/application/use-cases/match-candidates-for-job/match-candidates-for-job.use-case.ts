import { CandidateDirectoryRepositoryPort, RankedCandidate } from '../../../domain';
import {
  CandidateDirectoryUnavailableException,
  CandidatePoolEmptyException,
  MatchCandidatesInvalidLimitException,
  MatchCandidatesNoCriteriaException,
} from '../../../domain/exceptions/recruiting.exceptions';
import type {
  MatchCandidatesForJobInput,
  MatchCandidatesForJobOutput,
  MatchCandidatesForJobOutputItem,
} from './match-candidates-for-job.schema';

const MAX_LIMIT = 100;

/**
 * MatchCandidatesForJobUseCase.
 *
 * Reverse of the candidate-side `scoreJobsForUser`: given a job's skills +
 * preferences, rank up to `limit` opt-in candidates by `FitScore`.
 *
 * Pool is capped at 200 by the repository port contract so the in-memory
 * sort stays bounded. Phase 2 can swap the adapter for a vector-search
 * index without touching this use-case.
 */

const CANDIDATE_POOL_CAP = 200;

export class MatchCandidatesForJobUseCase {
  constructor(private readonly directory: CandidateDirectoryRepositoryPort) {}

  async execute(input: MatchCandidatesForJobInput): Promise<MatchCandidatesForJobOutput> {
    if (!Number.isFinite(input.limit) || input.limit < 1 || input.limit > MAX_LIMIT) {
      throw new MatchCandidatesInvalidLimitException(input.limit);
    }
    if (
      input.jobSkills.length === 0 &&
      input.jobMinEnglish === null &&
      input.jobRemotePolicy === null
    ) {
      throw new MatchCandidatesNoCriteriaException();
    }

    let pool: Awaited<ReturnType<CandidateDirectoryRepositoryPort['loadSearchablePool']>>;
    try {
      pool = await this.directory.loadSearchablePool({
        excludeUserId: input.requesterId,
        poolCap: CANDIDATE_POOL_CAP,
      });
    } catch (err) {
      // P2-#A2-30: forward root cause so logs / exception filter see why
      // the repository failed, instead of erasing it with a bare `catch`.
      throw new CandidateDirectoryUnavailableException(err);
    }

    if (pool.length === 0) {
      throw new CandidatePoolEmptyException();
    }

    const ranked = pool
      .map((record) =>
        RankedCandidate.forJob({
          userId: record.userId,
          username: record.username,
          name: record.name,
          photoURL: record.photoURL,
          bio: record.bio,
          candidateSkills: record.skills,
          jobSkills: input.jobSkills,
          jobMinEnglish: input.jobMinEnglish,
          jobRemotePolicy: input.jobRemotePolicy,
        }),
      )
      .sort(RankedCandidate.compareByScoreDesc)
      .slice(0, input.limit);

    const candidates: MatchCandidatesForJobOutputItem[] = ranked.map((c) => c.toPlain());
    // P2-#11: report the SIZE OF THE POOL we scanned, not the slice we
    // returned — the former is what callers care about to gauge match
    // strength; the latter is just `min(limit, candidates.length)` and
    // can be recomputed client-side.
    return { candidates, poolSize: pool.length };
  }
}
