import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ResumeEventPublisher } from '../../../../domain/ports';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';

export class DeleteResumeForUserUseCase {
  constructor(
    private readonly repository: ResumesRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
    private readonly logger: LoggerPort,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.deleteResumeForUser(id, userId);
    if (!deleted) throw new EntityNotFoundException('Resume', id);

    // P2-#7: await so cleanup-on-delete handlers can fail loud.
    await this.eventPublisher.publishResumeDeletedAsync(id, { userId });
  }
}
