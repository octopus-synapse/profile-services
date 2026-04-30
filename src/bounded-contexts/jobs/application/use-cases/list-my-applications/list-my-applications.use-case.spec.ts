import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { InMemoryJobsRepository } from '../../../testing';
import { ListMyApplicationsUseCase } from './list-my-applications.use-case';

describe('ListMyApplicationsUseCase', () => {
  it('omits withdrawn applications', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'r' });
    const job = repo.seedJob({ authorId: 'r', title: 'A' });

    repo.seedApplication({
      id: randomUUID(),
      jobId: job.id,
      userId: 'me',
      status: 'SUBMITTED',
      coverLetter: null,
      resumeId: null,
      tailoredVersionId: null,
      createdAt: new Date(),
    });
    repo.seedApplication({
      id: randomUUID(),
      jobId: job.id,
      userId: 'me',
      status: 'WITHDRAWN',
      coverLetter: null,
      resumeId: null,
      tailoredVersionId: null,
      createdAt: new Date(),
    });

    const out = await new ListMyApplicationsUseCase(repo).execute('me');
    expect(out.total).toBe(1);
  });
});
