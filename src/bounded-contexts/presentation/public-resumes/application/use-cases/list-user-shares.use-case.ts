/**
 * List User Shares Use Case
 */

import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
} from '../../../domain/exceptions/presentation.exceptions';
import type { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import type { ShareRepositoryPort } from '../../domain/ports/share.repository.port';

export class ListUserSharesUseCase {
  constructor(
    private readonly shareRepo: ShareRepositoryPort,
    private readonly resumeRepo: ResumeReadRepositoryPort,
  ) {}

  async execute(userId: string, resumeId: string) {
    const resume = await this.resumeRepo.findById(resumeId);

    if (!resume) {
      throw new ResumeNotFoundException();
    }

    if (resume.userId !== userId) {
      throw new ResumeAccessDeniedException();
    }

    return this.shareRepo.findByResumeId(resumeId);
  }
}
