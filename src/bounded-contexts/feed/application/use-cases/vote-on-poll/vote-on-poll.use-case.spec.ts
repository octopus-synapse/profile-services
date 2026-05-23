import { describe, expect, it } from 'bun:test';
import { runInParallel } from '@test/infrastructure/shared/race-condition.helper';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import {
  PollAlreadyVotedException,
  PollClosedException,
  PollOptionOutOfRangeException,
} from '../../../domain/exceptions/feed.exceptions';
import { InMemoryPollRepository } from '../../../testing';
import { VoteOnPollUseCase } from './vote-on-poll.use-case';

const CONCURRENT_ATTEMPTS = 20;

describe('VoteOnPollUseCase', () => {
  it('records a vote and increments the counter', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({ id: 'p1', pollOptions: [{ label: 'a' }, { label: 'b' }] });
    const out = await new VoteOnPollUseCase(repo).execute('p1', 'me', 1);
    expect(out.optionIndex).toBe(1);
    expect(repo.findRawPost('p1')?.votesCount).toBe(1);
  });

  it('throws if poll closed', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({
      id: 'p1',
      pollOptions: [{ label: 'a' }],
      pollDeadline: new Date('2000-01-01'),
    });
    await expect(new VoteOnPollUseCase(repo).execute('p1', 'me', 0)).rejects.toThrow(
      PollClosedException,
    );
  });

  it('throws if already voted', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({ id: 'p1', pollOptions: [{ label: 'a' }, { label: 'b' }] });
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

  it('rejects out-of-range optionIndex (P1 #18 bounds check)', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({ id: 'p1', pollOptions: [{ label: 'only-one' }] });
    await expect(new VoteOnPollUseCase(repo).execute('p1', 'me', 5)).rejects.toThrow(
      PollOptionOutOfRangeException,
    );
    await expect(new VoteOnPollUseCase(repo).execute('p1', 'me', -1)).rejects.toThrow(
      PollOptionOutOfRangeException,
    );
    await expect(new VoteOnPollUseCase(repo).execute('p1', 'me', 1)).rejects.toThrow(
      PollOptionOutOfRangeException,
    );
    expect(repo.findRawPost('p1')?.votesCount).toBe(0);
  });

  it('records exactly one vote + one counter increment under concurrent same-user attempts (P1 #18)', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({ id: 'p1', pollOptions: [{ label: 'a' }, { label: 'b' }] });
    const useCase = new VoteOnPollUseCase(repo);

    const { successes, failures } = await runInParallel(CONCURRENT_ATTEMPTS, () =>
      useCase.execute('p1', 'me', 0),
    );

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(CONCURRENT_ATTEMPTS - 1);
    for (const err of failures) {
      expect(err).toBeInstanceOf(PollAlreadyVotedException);
    }
    expect(repo.findRawPost('p1')?.votesCount).toBe(1);
  });
});
