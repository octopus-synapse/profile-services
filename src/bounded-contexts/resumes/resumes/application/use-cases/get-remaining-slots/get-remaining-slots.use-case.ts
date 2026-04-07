import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeSlots } from '../../../ports/resumes-service.port';

const MAX_RESUMES_PER_USER = 4;

export class GetRemainingSlotsUseCase {
  constructor(private readonly repository: ResumesRepositoryPort) {}

  async execute(userId: string): Promise<ResumeSlots> {
    const existing = await this.repository.findAllUserResumes(userId);
    return {
      used: existing.length,
      limit: MAX_RESUMES_PER_USER,
      remaining: MAX_RESUMES_PER_USER - existing.length,
    };
  }
}
