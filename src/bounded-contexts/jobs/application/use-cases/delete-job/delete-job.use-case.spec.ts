import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CannotModifyOthersJobException } from '../../../domain/exceptions/jobs.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { DeleteJobUseCase } from './delete-job.use-case';

describe('DeleteJobUseCase', () => {
  it('throws when the job is missing', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(new DeleteJobUseCase(repo).execute('x', 'me')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('rejects non-author deletes', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    await expect(new DeleteJobUseCase(repo).execute(job.id, 'someone')).rejects.toBeInstanceOf(
      CannotModifyOthersJobException,
    );
  });

  it('removes the job for its author', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'me', title: 'A' });
    await new DeleteJobUseCase(repo).execute(job.id, 'me');
    expect(repo.jobs.has(job.id)).toBe(false);
  });
});
