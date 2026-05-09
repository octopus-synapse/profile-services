/**
 * List the versions for a resume the caller owns. 403 / 404 short-circuit
 * before we hit the version table.
 */

import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
} from '@/bounded-contexts/resumes/domain/exceptions';
import type { ResumeVersionListItem } from '../../../domain/entities/resume-version';
import { ResumeVersionsRepositoryPort } from '../../../domain/ports/resume-versions.repository.port';

export class GetVersionsUseCase {
  constructor(private readonly repository: ResumeVersionsRepositoryPort) {}

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
