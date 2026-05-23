/**
 * List User Shares Use Case
 */

import { LoggerPort } from '@/shared-kernel';
import { ResumeAccessDeniedException, ResumeNotFoundException } from '../../../domain/exceptions';
import { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import { ShareRepositoryPort } from '../../domain/ports/share.repository.port';

export class ListUserSharesUseCase {
  constructor(
    private readonly shareRepo: ShareRepositoryPort,
    private readonly resumeRepo: ResumeReadRepositoryPort,
    private readonly logger: LoggerPort,
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
