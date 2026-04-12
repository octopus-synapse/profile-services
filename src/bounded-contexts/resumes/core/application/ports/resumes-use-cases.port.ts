import type { CreateResume, UpdateResume } from '@/shared-kernel';
import type {
  ResumeResult,
  ResumeSlots,
  UserResumesPaginatedResult,
} from '../../ports/resumes-service.port';

export const RESUMES_USE_CASES = Symbol('RESUMES_USE_CASES');

export interface ResumesUseCases {
  findAllUserResumesUseCase: {
    execute: (
      userId: string,
      page?: number,
      limit?: number,
    ) => Promise<ResumeResult[] | UserResumesPaginatedResult>;
  };
  findResumeByIdForUserUseCase: {
    execute: (id: string, userId: string) => Promise<ResumeResult>;
  };
  createResumeForUserUseCase: {
    execute: (userId: string, data: CreateResume) => Promise<ResumeResult>;
  };
  updateResumeForUserUseCase: {
    execute: (id: string, userId: string, data: UpdateResume) => Promise<ResumeResult>;
  };
  deleteResumeForUserUseCase: {
    execute: (id: string, userId: string) => Promise<void>;
  };
  getRemainingSlotsUseCase: {
    execute: (userId: string) => Promise<ResumeSlots>;
  };
}
