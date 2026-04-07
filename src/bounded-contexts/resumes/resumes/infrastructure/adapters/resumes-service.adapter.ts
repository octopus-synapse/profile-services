import { Inject, Injectable } from '@nestjs/common';
import type { CreateResume, UpdateResume } from '@/shared-kernel';
import { RESUMES_USE_CASES, type ResumesUseCases } from '../../application/ports/resumes-use-cases.port';
import {
  type ResumeResult,
  type ResumeSlots,
  ResumesServicePort,
  type UserResumesPaginatedResult,
} from '../../ports/resumes-service.port';

/**
 * Adapter that implements ResumesServicePort by delegating to use cases.
 * Preserves the cross-BC port contract for export, onboarding, and social BCs.
 */
@Injectable()
export class ResumesServiceAdapter extends ResumesServicePort {
  constructor(
    @Inject(RESUMES_USE_CASES)
    private readonly useCases: ResumesUseCases,
  ) {
    super();
  }

  async findAllUserResumes(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<ResumeResult[] | UserResumesPaginatedResult> {
    return this.useCases.findAllUserResumesUseCase.execute(userId, page, limit);
  }

  async findResumeByIdForUser(id: string, userId: string): Promise<ResumeResult> {
    return this.useCases.findResumeByIdForUserUseCase.execute(id, userId);
  }

  async createResumeForUser(userId: string, data: CreateResume): Promise<ResumeResult> {
    return this.useCases.createResumeForUserUseCase.execute(userId, data);
  }

  async updateResumeForUser(
    id: string,
    userId: string,
    data: UpdateResume,
  ): Promise<ResumeResult> {
    return this.useCases.updateResumeForUserUseCase.execute(id, userId, data);
  }

  async deleteResumeForUser(id: string, userId: string): Promise<void> {
    return this.useCases.deleteResumeForUserUseCase.execute(id, userId);
  }

  async getRemainingSlots(userId: string): Promise<ResumeSlots> {
    return this.useCases.getRemainingSlotsUseCase.execute(userId);
  }
}
