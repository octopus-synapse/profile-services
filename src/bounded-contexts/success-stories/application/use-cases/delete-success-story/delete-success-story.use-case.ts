/**
 * Admin-only success-story deletion. Hard delete — the row is removed
 * from the carousel feed instantly. The repository absorbs the actual
 * DELETE; we keep this use case explicit so future audit-log or
 * soft-delete behaviour has a single hook.
 */

import { SuccessStoriesRepositoryPort } from '../../../domain/ports/success-stories.repository.port';

export class DeleteSuccessStoryUseCase {
  constructor(private readonly repository: SuccessStoriesRepositoryPort) {}

  async execute(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
