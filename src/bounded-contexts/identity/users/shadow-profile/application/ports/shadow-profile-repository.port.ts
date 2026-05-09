export interface ShadowProfileSnapshot {
  readonly id: string;
  readonly source: string;
  readonly externalHandle: string;
  readonly contactEmail: string | null;
  readonly payload: unknown;
  readonly claimedByUserId: string | null;
}

export interface UpsertShadowProfileInput {
  readonly source: string;
  readonly externalHandle: string;
  readonly contactEmail: string | null;
  readonly payload: unknown;
}

export interface FindShadowCandidatesInput {
  readonly email?: string;
  readonly githubLogin?: string;
}

export abstract class ShadowProfileRepositoryPort {
  abstract upsert(input: UpsertShadowProfileInput): Promise<ShadowProfileSnapshot>;
  abstract findCandidates(input: FindShadowCandidatesInput): Promise<ShadowProfileSnapshot[]>;
  abstract findById(id: string): Promise<ShadowProfileSnapshot | null>;
  abstract markClaimed(id: string, userId: string): Promise<ShadowProfileSnapshot>;
}
