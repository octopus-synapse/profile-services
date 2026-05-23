/**
 * Admin-only success-story update. Owns the "stamp publishedAt on the
 * draft → published transition" rule so listings stay correctly
 * ordered. Throws `EntityNotFoundException` when the story id is
 * unknown — the controller maps that to a 404. When `opts.publish`
 * is set, callers are issuing an explicit publish action; trying to
 * re-publish an already-PUBLISHED story raises
 * `SuccessStoryAlreadyPublishedException` so the admin UI can show a
 * clear conflict instead of silently no-op'ing the publishedAt stamp.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  SuccessStoryRecord,
  UpdateSuccessStoryInput,
} from '../../../domain/entities/success-story';
import { SuccessStoryAlreadyPublishedException } from '../../../domain/exceptions/success-stories.exceptions';
import { SuccessStoriesRepositoryPort } from '../../../domain/ports/success-stories.repository.port';

export interface UpdateSuccessStoryOptions {
  publish?: boolean;
}

export class UpdateSuccessStoryUseCase {
  constructor(private readonly repository: SuccessStoriesRepositoryPort) {}

  async execute(
    id: string,
    input: UpdateSuccessStoryInput,
    opts: UpdateSuccessStoryOptions = {},
  ): Promise<SuccessStoryRecord> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new EntityNotFoundException('SuccessStory', id);

    if (opts.publish && existing.status === 'PUBLISHED') {
      throw new SuccessStoryAlreadyPublishedException(id);
    }

    const stampPublishedAt = input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';

    return this.repository.update(id, input, { stampPublishedAt });
  }
}
