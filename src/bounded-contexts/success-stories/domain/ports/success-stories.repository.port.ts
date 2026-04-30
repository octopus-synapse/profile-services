/**
 * Outbound port for success-story persistence.
 *
 * `listPublished` returns ordered cards for the landing carousel
 * (status = PUBLISHED, weight desc, publishedAt desc). Mutating
 * methods echo back the small `SuccessStoryRecord` projection — the
 * controllers only need the id / status round-trip, so we keep the
 * port narrow and Prisma-shape-free.
 */

import type {
  CreateSuccessStoryInput,
  SuccessStoryRecord,
  SuccessStoryView,
  UpdateSuccessStoryInput,
} from '../entities/success-story';

export abstract class SuccessStoriesRepositoryPort {
  abstract listPublished(limit: number): Promise<SuccessStoryView[]>;
  abstract findById(id: string): Promise<SuccessStoryRecord | null>;
  abstract create(input: CreateSuccessStoryInput): Promise<SuccessStoryRecord>;
  abstract update(
    id: string,
    input: UpdateSuccessStoryInput,
    options: { stampPublishedAt: boolean },
  ): Promise<SuccessStoryRecord>;
  abstract delete(id: string): Promise<void>;
}
