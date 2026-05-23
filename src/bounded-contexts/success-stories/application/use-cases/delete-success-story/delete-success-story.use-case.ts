/**
 * Admin-only success-story deletion. Hard delete — the row is removed
 * from the carousel feed instantly. The repository absorbs the actual
 * DELETE; we keep this use case explicit so future audit-log or
 * soft-delete behaviour has a single hook.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { SuccessStoriesRepositoryPort } from '../../../domain/ports/success-stories.repository.port';

export class DeleteSuccessStoryUseCase {
  constructor(private readonly repository: SuccessStoriesRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new EntityNotFoundException('SuccessStory', id);
    await this.repository.delete(id);
  }
}
