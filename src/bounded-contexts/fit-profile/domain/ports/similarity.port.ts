/**
 * Public port consumed by `job-match/` (Task #18). The Fit sub-score is
 * computed as `Culture Match × α + Role Match × β` — where Culture Match
 * compares the user's vector to a company-level profile and Role Match
 * compares the user's vector to a specific job's profile. Both sides
 * resolve to a 0..100 number; `null` means "no usable signal" so the
 * caller can decide whether to degrade to a neutral 50 or surface the
 * gap to the recruiter.
 *
 * The first implementation uses weighted cosine (see
 * `fit-similarity.rules.ts`). Mahalanobis is tracked as a TODO in
 * `docs/scoring/SCORES_TODO.md` — the port stays stable so job-match
 * keeps its own math-free façade.
 */
export interface SimilarityResult {
  readonly score: number | null;
  readonly algorithm: 'weighted-cosine';
  readonly rulesVersion: string;
}

export abstract class SimilarityPort {
  /** Compare a user's fit vector against a company-level vector. */
  abstract culture(userId: string, companyId: string): Promise<SimilarityResult>;
  /** Compare a user's fit vector against a job's vector. */
  abstract role(userId: string, jobId: string): Promise<SimilarityResult>;
}
