import { NotFoundException } from '@nestjs/common';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { ERROR_MESSAGES } from '@/shared-kernel';
import { ResumeManagementRepositoryPort } from '../ports/resume-management.port';

export class DeleteResumeUseCase {
  constructor(
    private readonly repository: ResumeManagementRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(resumeId: string): Promise<void> {
    const resume = await this.repository.findResumeForDelete(resumeId);

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    // Delete first, then publish event (prevents cache invalidation if delete fails)
    await this.repository.deleteResumeById(resumeId);

    this.eventPublisher.publishResumeDeleted(resumeId, {
      userId: resume.userId,
    });
  }
}
