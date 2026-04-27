/**
 * Vote on a poll. Fails if the user already voted or the poll is closed.
 * Authors can vote on their own polls.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { PollVote } from '../../../domain/entities';
import {
  PollAlreadyVotedException,
  PollClosedException,
} from '../../../domain/exceptions/feed.exceptions';
import { PollRepositoryPort } from '../../../domain/ports/poll.repository.port';

export class VoteOnPollUseCase {
  constructor(private readonly repository: PollRepositoryPort) {}

  async execute(postId: string, userId: string, optionIndex: number): Promise<PollVote> {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }

    if (post.pollDeadline && new Date(post.pollDeadline) < new Date()) {
      throw new PollClosedException();
    }

    const existing = await this.repository.findVote(postId, userId);
    if (existing) {
      throw new PollAlreadyVotedException();
    }

    const vote = await this.repository.createVote(postId, userId, optionIndex);
    await this.repository.incrementVotesCount(postId, 1);
    return vote;
  }
}
