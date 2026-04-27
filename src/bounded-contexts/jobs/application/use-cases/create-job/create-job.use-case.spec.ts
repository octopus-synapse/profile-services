import { describe, expect, it } from 'bun:test';
import { InMemoryJobsRepository } from '../../../testing';
import { CreateJobUseCase } from './create-job.use-case';

describe('CreateJobUseCase', () => {
  it('persists a new job for the author', async () => {
    const repo = new InMemoryJobsRepository();
    const out = await new CreateJobUseCase(repo).execute('me', {
      title: 'Backend',
      company: 'Acme',
      jobType: 'FULL_TIME',
      description: 'Job',
    });
    expect(out.authorId).toBe('me');
    expect(out.title).toBe('Backend');
  });
});
