import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  type ResumeListItem,
  ResumeManagementRepositoryPort,
} from '../ports/resume-management.port';

export class ListResumesForUserUseCase {
  constructor(private readonly repository: ResumeManagementRepositoryPort) {}

  async execute(userId: string): Promise<{ resumes: ResumeListItem[] }> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    const resumes = await this.repository.findResumesForUser(userId);
    return { resumes };
  }
}
