import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class ResumeOwnershipPolicy {
  constructor(private readonly repository: GenericResumeSectionsRepositoryPort) {}

  async ensureOwned(resumeId: string, userId: string): Promise<void> {
    const resume = await this.repository.findResumeOwner(resumeId);

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied to resume');
    }
  }
}
