import type { FitVector } from '../types';

/** Saved UserFitProfile projection. `vector === null` represents the
 * LGPD-anonymized state (answers deleted, vector wiped) — exposed so
 * the status endpoint can report `never` without inventing a separate
 * soft-delete column. */
export interface SavedUserFitProfile {
  readonly id: string;
  readonly userId: string;
  readonly vector: FitVector | null;
  readonly version: number;
  readonly computedAt: Date;
  readonly expiresAt: Date;
}

export interface UserFitProfileWrite {
  readonly userId: string;
  readonly vector: FitVector;
  readonly expiresAt: Date;
}

export abstract class UserFitProfileRepositoryPort {
  abstract findByUserId(userId: string): Promise<SavedUserFitProfile | null>;
  /**
   * Atomic upsert: the version column is the adapter's responsibility —
   * concurrent submissions land on different versions because the
   * adapter relies on a single SQL UPDATE statement (Prisma's
   * `increment`) rather than a read-then-write. The use case must never
   * compute the next version itself.
   */
  abstract upsert(input: UserFitProfileWrite): Promise<SavedUserFitProfile>;
  /** LGPD path — keep the row so a composite key references don't
   * dangle but clear the vector. */
  abstract anonymize(userId: string): Promise<void>;
}
