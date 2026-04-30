/**
 * List posts authored by a specific user with cursor-based pagination.
 */

import type { UserPostsResult } from '../../../domain/entities';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';

export class ListUserPostsUseCase {
  constructor(private readonly repository: FeedRepositoryPort) {}

  execute(userId: string, cursor: string | undefined, limit: number): Promise<UserPostsResult> {
    return this.repository.listUserPosts(userId, cursor, limit);
  }
}
