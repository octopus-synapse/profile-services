/**
 * Resumes Repository Port
 *
 * Abstract port for ResumesRepository - enables dependency inversion.
 * Services depend on this abstraction, allowing proper testing without type assertions.
 */

import type { CreateResumeData, UpdateResumeData } from '@/shared-kernel';
import type { DomainException } from '@/shared-kernel/exceptions';

export interface ResumeEntity {
  id: string;
  userId: string;
  title: string | null;
  summary?: string | null;
  template?: string | null;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class ResumesRepositoryPort {
  abstract listUserResumes(userId: string): Promise<ResumeEntity[]>;

  abstract listUserResumesPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<ResumeEntity[]>;

  abstract findResumeByIdAndUserId(id: string, userId: string): Promise<ResumeEntity | null>;

  abstract findResumeByUserId(userId: string): Promise<ResumeEntity | null>;

  abstract countUserResumes(userId: string): Promise<number>;

  abstract createResumeForUser(
    userId: string,
    resumeCreationData: CreateResumeData,
  ): Promise<ResumeEntity>;

  /**
   * Race-free create (concurrency-sweep ticket). Counts the user's resumes
   * inside a tx with `FOR UPDATE` so concurrent creators serialise on
   * the locked rows; throws `exception` (an instance the caller
   * pre-constructs) when the cap is reached, otherwise inserts. The
   * TOCTOU window between count and insert is collapsed into a
   * single locked tx.
   */
  abstract createResumeForUserWithQuota(
    userId: string,
    resumeCreationData: CreateResumeData,
    quota: { readonly max: number; readonly exception: DomainException },
  ): Promise<ResumeEntity>;

  abstract updateResumeForUser(
    id: string,
    userId: string,
    resumeUpdateData: UpdateResumeData,
  ): Promise<ResumeEntity | null>;

  abstract deleteResumeForUser(id: string, userId: string): Promise<boolean>;
}
