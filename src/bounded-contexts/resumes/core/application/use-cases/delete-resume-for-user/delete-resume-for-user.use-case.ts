import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { ResumeEventPublisher } from '../../../../domain/ports';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';

export class DeleteResumeForUserUseCase {
  constructor(
    private readonly repository: ResumesRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.deleteResumeForUser(id, userId);
    if (!deleted) throw new EntityNotFoundException('Resume', id);

    this.eventPublisher.publishResumeDeleted(id, { userId });
  }
}
