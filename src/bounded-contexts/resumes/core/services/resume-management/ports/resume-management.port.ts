import type { Prisma } from '@prisma/client';

export type ResumeListItem = Prisma.ResumeGetPayload<{
  include: {
    resumeSections: {
      include: { sectionType: true; items: true };
    };
    _count: {
      select: { resumeSections: true };
    };
  };
}>;

export type ResumeDetails = Prisma.ResumeGetPayload<{
  include: {
    user: {
      select: { id: true; email: true; name: true };
    };
    resumeSections: {
      include: { sectionType: true; items: true };
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

export abstract class ResumeManagementUseCases {
  abstract readonly listResumesForUserUseCase: {
    execute: (userId: string) => Promise<{ resumes: ResumeListItem[] }>;
  };
  abstract readonly getResumeDetailsUseCase: {
    execute: (resumeId: string) => Promise<ResumeDetails>;
  };
  abstract readonly deleteResumeUseCase: { execute: (resumeId: string) => Promise<void> };
}
