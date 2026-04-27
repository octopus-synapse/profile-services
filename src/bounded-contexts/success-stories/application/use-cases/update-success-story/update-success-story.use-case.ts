/**
 * Admin-only success-story update. Owns the "stamp publishedAt on the
 * draft → published transition" rule so listings stay correctly
 * ordered. Throws `EntityNotFoundException` when the story id is
 * unknown — the controller maps that to a 404.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  SuccessStoryRecord,
  UpdateSuccessStoryInput,
} from '../../../domain/entities/success-story';
import { SuccessStoriesRepositoryPort } from '../../../domain/ports/success-stories.repository.port';

export class UpdateSuccessStoryUseCase {
  constructor(private readonly repository: SuccessStoriesRepositoryPort) {}

  async execute(id: string, input: UpdateSuccessStoryInput): Promise<SuccessStoryRecord> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new EntityNotFoundException('SuccessStory', id);

    const stampPublishedAt =
      input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';

    return this.repository.update(id, input, { stampPublishedAt });
  }
}
