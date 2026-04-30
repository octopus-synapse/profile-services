/**
 * Returns the public landing-carousel feed: only PUBLISHED stories,
 * ordered by the adapter's weight + publishedAt rule. The caller may
 * pass an explicit limit; a sensible default keeps the unauthenticated
 * endpoint cheap.
 */

import type { SuccessStoryView } from '../../../domain/entities/success-story';
import { SuccessStoriesRepositoryPort } from '../../../domain/ports/success-stories.repository.port';

const DEFAULT_LIMIT = 12;

export class ListPublishedSuccessStoriesUseCase {
  constructor(private readonly repository: SuccessStoriesRepositoryPort) {}

  async execute(limit?: number): Promise<SuccessStoryView[]> {
    return this.repository.listPublished(limit ?? DEFAULT_LIMIT);
  }
}
