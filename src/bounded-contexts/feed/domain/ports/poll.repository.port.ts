/**
 * Outbound port for poll-vote persistence on posts.
 */

import type { PollResultBucket, PollVote, Post } from '../entities';

/**
 * Outcome of an atomic vote attempt — either the new row landed
 * (and the counter incremented in the same tx) or the unique
 * constraint rejected it because the user already voted.
 */
export type AtomicVoteResult =
  | { readonly outcome: 'created'; readonly vote: PollVote }
  | { readonly outcome: 'duplicate' };

export abstract class PollRepositoryPort {
  abstract findPostById(id: string): Promise<Post | null>;
  abstract findVote(postId: string, userId: string): Promise<PollVote | null>;
  abstract createVote(postId: string, userId: string, optionIndex: number): Promise<PollVote>;
  abstract incrementVotesCount(postId: string, by: number): Promise<void>;
  abstract groupVotesByOption(postId: string): Promise<PollResultBucket[]>;

  /**
   * Atomically inserts a PollVote and increments `Post.votesCount` in
   * the same transaction. Idempotent under concurrent calls — relies on
   * the `(postId, userId)` unique constraint to reject duplicates
   * instead of read-then-write. When the unique rejects, the
   * counter is NOT incremented and `outcome: 'duplicate'` is returned
   * so the caller can map it to `PollAlreadyVotedException`.
   */
  abstract voteAtomic(
    postId: string,
    userId: string,
    optionIndex: number,
  ): Promise<AtomicVoteResult>;
}
