/**
 * Outbound port for poll-vote persistence on posts.
 */

import type { PollResultBucket, PollVote, Post } from '../entities';

export abstract class PollRepositoryPort {
  abstract findPostById(id: string): Promise<Post | null>;
  abstract findVote(postId: string, userId: string): Promise<PollVote | null>;
  abstract createVote(postId: string, userId: string, optionIndex: number): Promise<PollVote>;
  abstract incrementVotesCount(postId: string, by: number): Promise<void>;
  abstract groupVotesByOption(postId: string): Promise<PollResultBucket[]>;
}
