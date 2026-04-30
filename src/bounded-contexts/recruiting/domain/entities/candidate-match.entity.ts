/**
 * RankedCandidate — read-model built by the `MatchCandidatesForJob` use-case.
 *
 * Captures a single candidate's visible profile info plus the `FitScore`
 * produced by the local `computeFitScore`. Encapsulates behavior so callers
 * don't reach into `fit.score` directly for sorting or threshold filtering.
 */

import { computeFitScore, type EnglishLevel, type FitScore, type RemotePolicy } from './fit-score';

export interface RankedCandidateProps {
  readonly userId: string;
  readonly username: string | null;
  readonly name: string | null;
  readonly photoURL: string | null;
  readonly bio: string | null;
  readonly primaryStack: ReadonlyArray<string>;
  readonly fit: FitScore;
}

export interface CandidateMatchInput {
  userId: string;
  username: string | null;
  name: string | null;
  photoURL: string | null;
  bio: string | null;
  candidateSkills: ReadonlyArray<string>;
  jobSkills: ReadonlyArray<string>;
  jobMinEnglish: EnglishLevel | null;
  jobRemotePolicy: RemotePolicy | null;
}

export class RankedCandidate {
  private constructor(private readonly props: RankedCandidateProps) {}

  static forJob(input: CandidateMatchInput): RankedCandidate {
    const fit = computeFitScore({
      resumeSkills: [...input.candidateSkills],
      resumeEnglish: null,
      resumeRemotePref: null,
      jobSkills: [...input.jobSkills],
      jobMinEnglish: input.jobMinEnglish,
      jobRemotePolicy: input.jobRemotePolicy,
    });
    return new RankedCandidate({
      userId: input.userId,
      username: input.username,
      name: input.name,
      photoURL: input.photoURL,
      bio: input.bio,
      primaryStack: [...input.candidateSkills],
      fit,
    });
  }

  get userId(): string {
    return this.props.userId;
  }

  get score(): number {
    return this.props.fit.score;
  }

  meetsMinimum(min: number): boolean {
    return this.props.fit.score >= min;
  }

  toPlain(): RankedCandidateProps {
    return this.props;
  }

  /** Sort descending by score — highest fit first. Stable on tie via userId. */
  static compareByScoreDesc(a: RankedCandidate, b: RankedCandidate): number {
    if (b.props.fit.score !== a.props.fit.score) return b.props.fit.score - a.props.fit.score;
    return a.props.userId.localeCompare(b.props.userId);
  }
}
