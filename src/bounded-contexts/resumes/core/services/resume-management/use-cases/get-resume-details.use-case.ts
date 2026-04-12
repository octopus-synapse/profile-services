import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  type ResumeDetails,
  ResumeManagementRepositoryPort,
} from '../ports/resume-management.port';

export class GetResumeDetailsUseCase {
  constructor(private readonly repository: ResumeManagementRepositoryPort) {}

  async execute(resumeId: string): Promise<ResumeDetails> {
    const resume = await this.repository.findResumeDetailsById(resumeId);

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    return resume;
  }
}
