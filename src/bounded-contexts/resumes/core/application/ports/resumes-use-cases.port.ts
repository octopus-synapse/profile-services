import type { CreateResume, UpdateResume } from '@/shared-kernel';
import type {
  ResumeResult,
  ResumeSlots,
  UserResumesPaginatedResult,
} from '../../ports/resumes-service.port';

export abstract class ResumesUseCases {
  abstract readonly listUserResumesUseCase: {
    execute: (
      userId: string,
      page?: number,
      limit?: number,
    ) => Promise<ResumeResult[] | UserResumesPaginatedResult>;
  };
  abstract readonly findResumeByIdForUserUseCase: {
    execute: (id: string, userId: string) => Promise<ResumeResult>;
  };
  abstract readonly createResumeForUserUseCase: {
    execute: (userId: string, data: CreateResume) => Promise<ResumeResult>;
  };
  abstract readonly updateResumeForUserUseCase: {
    execute: (id: string, userId: string, data: UpdateResume) => Promise<ResumeResult>;
  };
  abstract readonly deleteResumeForUserUseCase: {
    execute: (id: string, userId: string) => Promise<void>;
  };
  abstract readonly getRemainingSlotsUseCase: { execute: (userId: string) => Promise<ResumeSlots> };
}
