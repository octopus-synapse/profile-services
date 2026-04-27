import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { WithdrawApplicationUseCase } from './withdraw-application.use-case';

describe('WithdrawApplicationUseCase', () => {
  it('throws when the application does not exist', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(new WithdrawApplicationUseCase(repo).execute('jx', 'me')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('flips the application status to WITHDRAWN', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    const id = randomUUID();
    repo.seedApplication({
      id,
      jobId: job.id,
      userId: 'me',
      status: 'SUBMITTED',
      coverLetter: null,
      resumeId: null,
      tailoredVersionId: null,
      createdAt: new Date(),
    });
    await new WithdrawApplicationUseCase(repo).execute(job.id, 'me');
    expect(repo.applications.find((a) => a.id === id)!.status).toBe('WITHDRAWN');
  });
});
