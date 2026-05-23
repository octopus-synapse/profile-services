/**
 * Vote on a poll. Fails if the user already voted or the poll is closed.
 * Authors can vote on their own polls.
 *
 * P1 ticket — the previous flow was:
 *   findVote → if missing, createVote → incrementVotesCount.
 * Two concurrent callers could both pass the `findVote` check and
 * end up with two PollVote rows + a counter bumped twice. With the
 * `(postId, userId)` unique constraint in place (migration
 * `20260517000000_wave_1_3_concurrency_uniques`), `voteAtomic`
 * relies on the DB to reject duplicates so the counter is only
 * incremented on the exactly-one writer that actually inserted.
 * We also bound-check `optionIndex` against `pollOptions` so an
 * out-of-range vote can't sneak past the increment.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { PollVote } from '../../../domain/entities';
import {
  PollAlreadyVotedException,
  PollClosedException,
  PollOptionOutOfRangeException,
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

    const optionCount = Array.isArray(post.pollOptions) ? post.pollOptions.length : 0;
    if (optionIndex < 0 || !Number.isInteger(optionIndex) || optionIndex >= optionCount) {
      throw new PollOptionOutOfRangeException(optionIndex, optionCount);
    }

    const result = await this.repository.voteAtomic(postId, userId, optionIndex);
    if (result.outcome === 'duplicate') {
      throw new PollAlreadyVotedException();
    }
    return result.vote;
  }
}
