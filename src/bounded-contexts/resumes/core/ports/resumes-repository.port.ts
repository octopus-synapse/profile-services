/**
 * Resumes Repository Port
 *
 * Abstract port for ResumesRepository - enables dependency inversion.
 * Services depend on this abstraction, allowing proper testing without type assertions.
 */

import type { CreateResumeData, UpdateResumeData } from '@/shared-kernel';

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
  abstract findAllUserResumes(userId: string): Promise<ResumeEntity[]>;

  abstract findAllUserResumesPaginated(
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

  abstract updateResumeForUser(
    id: string,
    userId: string,
    resumeUpdateData: UpdateResumeData,
  ): Promise<ResumeEntity | null>;

  abstract deleteResumeForUser(id: string, userId: string): Promise<boolean>;
}
