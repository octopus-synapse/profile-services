import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeResult } from '../../../ports/resumes-service.port';

export class FindResumeByIdForUserUseCase {
  constructor(private readonly repository: ResumesRepositoryPort) {}

  async execute(id: string, userId: string): Promise<ResumeResult> {
    const resume = await this.repository.findResumeByIdAndUserId(id, userId);
    if (!resume) throw new EntityNotFoundException('Resume', id);
    return resume;
  }
}
