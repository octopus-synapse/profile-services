import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
} from '../../../../domain/exceptions/resumes.exceptions';
import {
  type ResumeVersionListItem,
  ResumeVersionRepositoryPort,
} from '../ports/resume-version.port';

export class GetVersionsUseCase {
  constructor(private readonly repository: ResumeVersionRepositoryPort) {}

  async execute(resumeId: string, userId: string): Promise<ResumeVersionListItem[]> {
    const resume = await this.repository.findResumeOwner(resumeId);

    if (!resume) {
      throw new ResumeNotFoundException();
    }

    if (resume.userId !== userId) {
      throw new ResumeAccessDeniedException();
    }

    return this.repository.findResumeVersions(resumeId);
  }
}
