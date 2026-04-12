import { NotFoundException } from '@nestjs/common';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeResult } from '../../../ports/resumes-service.port';

export class FindResumeByIdForUserUseCase {
  constructor(private readonly repository: ResumesRepositoryPort) {}

  async execute(id: string, userId: string): Promise<ResumeResult> {
    const resume = await this.repository.findResumeByIdAndUserId(id, userId);
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }
}
