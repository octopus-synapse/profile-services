import { CandidateDirectoryRepositoryPort, RankedCandidate } from '../../../domain';
import type {
  MatchCandidatesForJobInput,
  MatchCandidatesForJobOutput,
  MatchCandidatesForJobOutputItem,
} from './match-candidates-for-job.dto';

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
    const pool = await this.directory.loadSearchablePool({
      excludeUserId: input.requesterId,
      poolCap: CANDIDATE_POOL_CAP,
    });

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
    return { candidates, poolSize: candidates.length };
  }
}
