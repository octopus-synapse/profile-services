import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeSlots } from '../../../ports/resumes-service.port';
import { MAX_RESUMES_PER_USER } from '../../resume-limits.const';

export class GetRemainingSlotsUseCase {
  constructor(private readonly repository: ResumesRepositoryPort) {}

  async execute(userId: string): Promise<ResumeSlots> {
    const existing = await this.repository.listUserResumes(userId);
    return {
      used: existing.length,
      limit: MAX_RESUMES_PER_USER,
      remaining: MAX_RESUMES_PER_USER - existing.length,
    };
  }
}
