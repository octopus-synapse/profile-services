import type { EnglishLevel, RemotePolicy } from '../../../domain';

export interface MatchCandidatesForJobInput {
  readonly requesterId: string;
  readonly jobSkills: ReadonlyArray<string>;
  readonly jobMinEnglish: EnglishLevel | null;
  readonly jobRemotePolicy: RemotePolicy | null;
  readonly limit: number;
}

export interface MatchCandidatesForJobOutputItem {
  readonly userId: string;
  readonly username: string | null;
  readonly name: string | null;
  readonly photoURL: string | null;
  readonly bio: string | null;
  readonly primaryStack: ReadonlyArray<string>;
  readonly fit: {
    readonly score: number;
    readonly breakdown: {
      readonly skillOverlap: number;
      readonly englishMatch: number;
      readonly remoteMatch: number;
      readonly matchedSkills: ReadonlyArray<string>;
      readonly missingSkills: ReadonlyArray<string>;
    };
  };
}

export interface MatchCandidatesForJobOutput {
  readonly candidates: ReadonlyArray<MatchCandidatesForJobOutputItem>;
  readonly poolSize: number;
}
