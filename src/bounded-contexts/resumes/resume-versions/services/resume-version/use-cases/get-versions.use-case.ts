import { EntityNotFoundException, ForbiddenException } from '@/shared-kernel/exceptions';
import {
  type ResumeVersionListItem,
  ResumeVersionRepositoryPort,
} from '../ports/resume-version.port';

export class GetVersionsUseCase {
  constructor(private readonly repository: ResumeVersionRepositoryPort) {}

  async execute(resumeId: string, userId: string): Promise<ResumeVersionListItem[]> {
    const resume = await this.repository.findResumeOwner(resumeId);

    if (!resume) {
      throw new EntityNotFoundException('Resume');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this resume');
    }

    return this.repository.findResumeVersions(resumeId);
  }
}
