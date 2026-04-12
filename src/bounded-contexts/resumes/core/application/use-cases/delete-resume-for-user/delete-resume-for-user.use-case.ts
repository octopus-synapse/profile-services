import { NotFoundException } from '@nestjs/common';
import type { ResumeEventPublisher } from '../../../../domain/ports';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';

export class DeleteResumeForUserUseCase {
  constructor(
    private readonly repository: ResumesRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.deleteResumeForUser(id, userId);
    if (!deleted) throw new NotFoundException('Resume not found');

    this.eventPublisher.publishResumeDeleted(id, { userId });
  }
}
