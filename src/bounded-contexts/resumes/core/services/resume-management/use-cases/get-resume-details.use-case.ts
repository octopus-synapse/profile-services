import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  type ResumeDetails,
  ResumeManagementRepositoryPort,
} from '../ports/resume-management.port';

export class GetResumeDetailsUseCase {
  constructor(private readonly repository: ResumeManagementRepositoryPort) {}

  async execute(resumeId: string): Promise<ResumeDetails> {
    const resume = await this.repository.findResumeDetailsById(resumeId);

    if (!resume) {
      throw new EntityNotFoundException('Resume', resumeId);
    }

    return resume;
  }
}
