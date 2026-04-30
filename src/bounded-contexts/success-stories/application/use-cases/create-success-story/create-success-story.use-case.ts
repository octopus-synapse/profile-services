/**
 * Admin-only success-story creation. The repository owns the
 * `publishedAt` stamp when a story is created already in the
 * PUBLISHED status, so this use case stays a thin orchestration layer.
 */

import type { LoggerPort } from '@/shared-kernel';
import type {
  CreateSuccessStoryInput,
  SuccessStoryRecord,
} from '../../../domain/entities/success-story';
import { SuccessStoriesRepositoryPort } from '../../../domain/ports/success-stories.repository.port';

const CTX = 'CreateSuccessStoryUseCase';

export class CreateSuccessStoryUseCase {
  constructor(
    private readonly repository: SuccessStoriesRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: CreateSuccessStoryInput): Promise<SuccessStoryRecord> {
    const created = await this.repository.create(input);
    this.logger.log(`Created success story ${created.id} for user ${created.userId}`, CTX);
    return created;
  }
}
