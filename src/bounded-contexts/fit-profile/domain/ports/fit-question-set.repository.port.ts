/** DB-shaped question set. The 25 sampled question IDs are NOT
 * stored — they are re-derived deterministically from `seed` + the
 * current active pool via `sampleQuestions` (the seed is the whole
 * point of storing this row in the first place). That keeps the
 * Prisma model aligned with the schema already committed and lets the
 * set survive a pool edit without the two drifting out of sync. */
export interface SavedFitQuestionSet {
  readonly id: string;
  readonly userId: string;
  readonly seed: string;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

export interface FitQuestionSetWrite {
  readonly userId: string;
  readonly seed: string;
}

export abstract class FitQuestionSetRepositoryPort {
  abstract findOpenByUserId(userId: string): Promise<SavedFitQuestionSet | null>;
  abstract findById(id: string): Promise<SavedFitQuestionSet | null>;
  abstract findBySeed(userId: string, seed: string): Promise<SavedFitQuestionSet | null>;
  abstract create(input: FitQuestionSetWrite): Promise<SavedFitQuestionSet>;
  abstract markCompleted(id: string, completedAt: Date): Promise<void>;
  abstract countByUser(userId: string): Promise<number>;
}
