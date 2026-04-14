/**
 * List User Shares Use Case
 */

import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
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
      throw new EntityNotFoundException('Resume', resumeId);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resume');
    }

    return this.shareRepo.findByResumeId(resumeId);
  }
}
