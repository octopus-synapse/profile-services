import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryBadgesRepository } from '../../../testing';
import { HandleInterviewScheduledUseCase } from './handle-interview-scheduled.use-case';

describe('HandleInterviewScheduledUseCase', () => {
  it('awards INTERVIEWS_5 when accepted-application count reaches 5', async () => {
    const repo = new InMemoryBadgesRepository();
    repo.setAcceptedApplications('u-1', 5);
    await new HandleInterviewScheduledUseCase(repo, stubLogger).execute('u-1');
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]?.kind).toBe('INTERVIEWS_5');
  });

  it('skips below the threshold', async () => {
    const repo = new InMemoryBadgesRepository();
    repo.setAcceptedApplications('u-1', 4);
    await new HandleInterviewScheduledUseCase(repo, stubLogger).execute('u-1');
    expect(repo.rows).toHaveLength(0);
  });
});
