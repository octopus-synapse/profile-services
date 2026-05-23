import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import type { JobApplicationStatus } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InvalidApplicationStateException } from '../../../domain/exceptions/jobs.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { WithdrawApplicationUseCase } from './withdraw-application.use-case';

function seedAppInStatus(repo: InMemoryJobsRepository, status: JobApplicationStatus) {
  const job = repo.seedJob({ authorId: 'r', title: 'A' });
  const id = randomUUID();
  repo.seedApplication({
    id,
    jobId: job.id,
    userId: 'me',
    status,
    coverLetter: null,
    resumeId: null,
    tailoredVersionId: null,
    createdAt: new Date(),
  });
  return { job, id };
}

describe('WithdrawApplicationUseCase', () => {
  it('throws when the application does not exist', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(new WithdrawApplicationUseCase(repo).execute('jx', 'me')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('flips the application status to WITHDRAWN when SUBMITTED', async () => {
    const repo = new InMemoryJobsRepository();
    const { job, id } = seedAppInStatus(repo, 'SUBMITTED');
    await new WithdrawApplicationUseCase(repo).execute(job.id, 'me');
    expect(repo.applications.find((a) => a.id === id)?.status).toBe('WITHDRAWN');
  });

  it('allows withdrawing a VIEWED application', async () => {
    const repo = new InMemoryJobsRepository();
    const { job, id } = seedAppInStatus(repo, 'VIEWED');
    await new WithdrawApplicationUseCase(repo).execute(job.id, 'me');
    expect(repo.applications.find((a) => a.id === id)?.status).toBe('WITHDRAWN');
  });

  // P1 #24
  it('rejects withdrawing an already-WITHDRAWN application', async () => {
    const repo = new InMemoryJobsRepository();
    const { job } = seedAppInStatus(repo, 'WITHDRAWN');
    await expect(new WithdrawApplicationUseCase(repo).execute(job.id, 'me')).rejects.toBeInstanceOf(
      InvalidApplicationStateException,
    );
  });

  it('rejects withdrawing a REJECTED application', async () => {
    const repo = new InMemoryJobsRepository();
    const { job } = seedAppInStatus(repo, 'REJECTED');
    await expect(new WithdrawApplicationUseCase(repo).execute(job.id, 'me')).rejects.toBeInstanceOf(
      InvalidApplicationStateException,
    );
  });

  it('rejects withdrawing an ACCEPTED application', async () => {
    const repo = new InMemoryJobsRepository();
    const { job } = seedAppInStatus(repo, 'ACCEPTED');
    await expect(new WithdrawApplicationUseCase(repo).execute(job.id, 'me')).rejects.toBeInstanceOf(
      InvalidApplicationStateException,
    );
  });
});
