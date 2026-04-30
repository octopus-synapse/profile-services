import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { NotJobOwnerException } from '../../../domain/exceptions/jobs.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { ListJobApplicationsUseCase } from './list-job-applications.use-case';

describe('ListJobApplicationsUseCase', () => {
  it('throws when the job does not exist', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(
      new ListJobApplicationsUseCase(repo).execute('missing', 'owner'),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('rejects non-owners with NotJobOwnerException', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'owner', title: 'A' });
    await expect(
      new ListJobApplicationsUseCase(repo).execute(job.id, 'someone-else'),
    ).rejects.toBeInstanceOf(NotJobOwnerException);
  });

  it('hydrates applications with the candidate user snapshot', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'candidate', name: 'C', email: 'c@x' });
    const job = repo.seedJob({ authorId: 'owner', title: 'A' });
    repo.seedApplication({
      id: randomUUID(),
      jobId: job.id,
      userId: 'candidate',
      status: 'SUBMITTED',
      coverLetter: null,
      resumeId: null,
      tailoredVersionId: null,
      createdAt: new Date(),
    });
    const out = await new ListJobApplicationsUseCase(repo).execute(job.id, 'owner');
    expect(out.pagination.total).toBe(1);
    expect((out.items[0] as { user: { id: string } | null }).user?.id).toBe('candidate');
  });
});
