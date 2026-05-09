import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
} from '../../../../domain/exceptions';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class ResumeOwnershipPolicy {
  constructor(private readonly repository: GenericResumeSectionsRepositoryPort) {}

  async ensureOwned(resumeId: string, userId: string): Promise<void> {
    const resume = await this.repository.findResumeOwner(resumeId);

    if (!resume) {
      throw new ResumeNotFoundException();
    }

    if (resume.userId !== userId) {
      throw new ResumeAccessDeniedException();
    }
  }
}
