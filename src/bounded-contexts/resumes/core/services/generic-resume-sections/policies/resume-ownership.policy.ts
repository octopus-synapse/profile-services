import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class ResumeOwnershipPolicy {
  constructor(private readonly repository: GenericResumeSectionsRepositoryPort) {}

  async ensureOwned(resumeId: string, userId: string): Promise<void> {
    const resume = await this.repository.findResumeOwner(resumeId);

    if (!resume) {
      throw new EntityNotFoundException('Resume', resumeId);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied to resume');
    }
  }
}
