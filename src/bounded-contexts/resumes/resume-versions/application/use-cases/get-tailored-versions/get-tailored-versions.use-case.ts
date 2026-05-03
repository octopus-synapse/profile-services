/**
 * List the tailored variants of a resume the caller owns. Used by the
 * UI's "AI versions" panel.
 */

import {
  ResumeNotFoundException,
  ResumeNotOwnedException,
} from '@/bounded-contexts/resumes/domain/exceptions';
import type { TailoredVersionSummary } from '../../../domain/entities/tailor';
import { ResumeVersionsRepositoryPort } from '../../../domain/ports/resume-versions.repository.port';

export class GetTailoredVersionsUseCase {
  constructor(private readonly repository: ResumeVersionsRepositoryPort) {}

  async execute(resumeId: string, userId: string): Promise<TailoredVersionSummary[]> {
    const owner = await this.repository.findResumeOwner(resumeId);
    if (!owner) throw new ResumeNotFoundException();
    if (owner.userId !== userId) throw new ResumeNotOwnedException();

    return this.repository.findTailoredVersions(resumeId);
  }
}
