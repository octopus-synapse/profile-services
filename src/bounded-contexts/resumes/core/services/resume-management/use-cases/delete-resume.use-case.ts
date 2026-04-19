import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ResumeManagementRepositoryPort } from '../ports/resume-management.port';

export class DeleteResumeUseCase {
  constructor(
    private readonly repository: ResumeManagementRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(resumeId: string): Promise<void> {
    const resume = await this.repository.findResumeForDelete(resumeId);

    if (!resume) {
      throw new EntityNotFoundException('Resume', resumeId);
    }

    // Delete first, then publish event (prevents cache invalidation if delete fails)
    await this.repository.deleteResumeById(resumeId);

    this.eventPublisher.publishResumeDeleted(resumeId, {
      userId: resume.userId,
    });
  }
}
