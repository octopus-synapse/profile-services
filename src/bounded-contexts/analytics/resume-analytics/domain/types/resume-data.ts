/**
 * Resume Data Types for Analytics
 *
 * Defines the minimal resume structure needed for
 * analytics calculations without depending on Prisma types.
 */

export type ResumeForATS = {
  readonly summary?: string | null;
  readonly emailContact?: string | null;
  readonly phone?: string | null;
  readonly skills: ReadonlyArray<{ name: string }>;
  readonly experiences: ReadonlyArray<{
    description?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }>;
};

export type ResumeForKeywords = {
  readonly summary?: string | null;
  readonly jobTitle?: string | null;
  readonly skills: ReadonlyArray<{ name: string }>;
  readonly experiences: ReadonlyArray<{
    position?: string | null;
    company?: string | null;
    description?: string | null;
  }>;
};
