import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  type ResumeVersionListItem,
  ResumeVersionRepositoryPort,
} from '../ports/resume-version.port';

export class GetVersionsUseCase {
  constructor(private readonly repository: ResumeVersionRepositoryPort) {}

  async execute(resumeId: string, userId: string): Promise<ResumeVersionListItem[]> {
    const resume = await this.repository.findResumeOwner(resumeId);

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this resume');
    }

    return this.repository.findResumeVersions(resumeId);
  }
}
