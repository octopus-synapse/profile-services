import type { Prisma } from '@prisma/client';

export type ResumeListItem = Prisma.ResumeGetPayload<{
  include: {
    resumeSections: {
      include: {
        sectionType: true;
        items: true;
      };
    };
    _count: {
      select: {
        resumeSections: true;
      };
    };
  };
}>;

export type ResumeDetails = Prisma.ResumeGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        name: true;
      };
    };
    resumeSections: {
      include: {
        sectionType: true;
        items: true;
      };
    };
  };
}>;

export abstract class ResumeManagementRepositoryPort {
  abstract findUserById(userId: string): Promise<{ id: string } | null>;

  abstract findResumesForUser(userId: string): Promise<ResumeListItem[]>;

  abstract findResumeDetailsById(resumeId: string): Promise<ResumeDetails | null>;

  abstract findResumeForDelete(resumeId: string): Promise<{ id: string; userId: string } | null>;

  abstract deleteResumeById(resumeId: string): Promise<void>;
}

export const RESUME_MANAGEMENT_USE_CASES = Symbol('RESUME_MANAGEMENT_USE_CASES');

export interface ResumeManagementUseCases {
  listResumesForUserUseCase: {
    execute: (userId: string) => Promise<{ resumes: ResumeListItem[] }>;
  };
  getResumeDetailsUseCase: {
    execute: (resumeId: string) => Promise<ResumeDetails>;
  };
  deleteResumeUseCase: {
    execute: (resumeId: string) => Promise<void>;
  };
}
