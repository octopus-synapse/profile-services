/**
 * Group poll votes by `optionIndex` and return the per-option counts +
 * total. Currently not surfaced via the controller — kept as a use case
 * for future expansion and so the port stays exercised by tests.
 */

import type { PollResultBucket } from '../../../domain/entities';
import { PollRepositoryPort } from '../../../domain/ports/poll.repository.port';

export interface PollResults {
  readonly totalVotes: number;
  readonly results: PollResultBucket[];
}

export class GetPollResultsUseCase {
  constructor(private readonly repository: PollRepositoryPort) {}

  async execute(postId: string): Promise<PollResults> {
    const buckets = await this.repository.groupVotesByOption(postId);
    const totalVotes = buckets.reduce((sum, b) => sum + b.count, 0);
    return { totalVotes, results: buckets };
  }
}
