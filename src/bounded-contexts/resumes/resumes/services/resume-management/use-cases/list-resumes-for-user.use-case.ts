import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  type ResumeListItem,
  ResumeManagementRepositoryPort,
} from '../ports/resume-management.port';

export class ListResumesForUserUseCase {
  constructor(private readonly repository: ResumeManagementRepositoryPort) {}

  async execute(userId: string): Promise<{ resumes: ResumeListItem[] }> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const resumes = await this.repository.findResumesForUser(userId);
    return { resumes };
  }
}
