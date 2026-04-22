/**
 * Candidate Directory Repository Port (Outbound).
 *
 * Loads a bounded pool of opt-in candidates + their aggregated skill list.
 * The repository is responsible for:
 *   - Filtering out private profiles (only `profileVisibility in public|link`).
 *   - Excluding inactive users and users who never finished onboarding.
 *   - Excluding the calling recruiter themselves.
 *   - Capping the pool so the caller's sort stays O(N) bounded.
 *
 * The implementation returns plain read-model records (no Prisma types),
 * so the use-case + entity construction stays framework-agnostic per ADR-001.
 */

export interface SearchableCandidateRecord {
  readonly userId: string;
  readonly username: string | null;
  readonly name: string | null;
  readonly photoURL: string | null;
  readonly bio: string | null;
  /**
   * Union of the user's primary-resume `primaryStack` and skill-section
   * item names, already deduplicated by the adapter.
   */
  readonly skills: ReadonlyArray<string>;
}

export interface CandidateDirectoryRepositoryPort {
  /**
   * Fetch up to `poolCap` opt-in candidates whose resumes will be scored
   * against the supplied job. Ordering is not guaranteed — the use-case
   * sorts by `FitScore.score` after computing it for every record.
   */
  loadSearchablePool(params: {
    excludeUserId: string;
    poolCap: number;
  }): Promise<ReadonlyArray<SearchableCandidateRecord>>;
}

export const CANDIDATE_DIRECTORY_REPOSITORY_PORT = Symbol('CandidateDirectoryRepositoryPort');
