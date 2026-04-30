import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import {
  PollAlreadyVotedException,
  PollClosedException,
} from '../../../domain/exceptions/feed.exceptions';
import { InMemoryPollRepository } from '../../../testing';
import { VoteOnPollUseCase } from './vote-on-poll.use-case';

describe('VoteOnPollUseCase', () => {
  it('records a vote and increments the counter', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({ id: 'p1' });
    const out = await new VoteOnPollUseCase(repo).execute('p1', 'me', 1);
    expect(out.optionIndex).toBe(1);
    expect(repo.findRawPost('p1')?.votesCount).toBe(1);
  });

  it('throws if poll closed', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({ id: 'p1', pollDeadline: new Date('2000-01-01') });
    await expect(new VoteOnPollUseCase(repo).execute('p1', 'me', 0)).rejects.toThrow(
      PollClosedException,
    );
  });

  it('throws if already voted', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({ id: 'p1' });
    repo.seedVote('p1', 'me', 0);
    await expect(new VoteOnPollUseCase(repo).execute('p1', 'me', 1)).rejects.toThrow(
      PollAlreadyVotedException,
    );
  });

  it('throws if post not found', async () => {
    const repo = new InMemoryPollRepository();
    await expect(new VoteOnPollUseCase(repo).execute('missing', 'me', 0)).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
