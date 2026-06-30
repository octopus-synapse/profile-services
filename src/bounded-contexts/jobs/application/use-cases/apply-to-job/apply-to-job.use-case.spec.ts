import { describe, expect, it } from 'bun:test';
import { EventPublisherPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { CannotApplyToOwnJobException } from '../../../domain/exceptions/jobs.exceptions';
import { ApplicationTrackerPort } from '../../../domain/ports/application-tracker.port';
import { InMemoryJobsRepository } from '../../../testing';
import { ApplyToJobUseCase } from './apply-to-job.use-case';

class CountingTracker extends ApplicationTrackerPort {
  calls: Array<{ id: string; date: Date | undefined }> = [];
  async ensureSubmittedEvent(applicationId: string, occurredAt?: Date): Promise<void> {
    this.calls.push({ id: applicationId, date: occurredAt });
  }
}

const noopEvents = { publish: () => {} } as unknown as EventPublisherPort;

describe('ApplyToJobUseCase', () => {
  it('throws when the job is missing', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(
      new ApplyToJobUseCase(repo, new CountingTracker(), noopEvents, stubLogger).execute(
        'x',
        'me',
        {},
      ),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('rejects applying to your own job', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'me', title: 'A' });
    await expect(
      new ApplyToJobUseCase(repo, new CountingTracker(), noopEvents, stubLogger).execute(
        job.id,
        'me',
        {},
      ),
    ).rejects.toBeInstanceOf(CannotApplyToOwnJobException);
  });

  it('creates the application and notifies the tracker on the first call', async () => {
    const repo = new InMemoryJobsRepository();
    const tracker = new CountingTracker();
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    const out = (await new ApplyToJobUseCase(repo, tracker, noopEvents, stubLogger).execute(
      job.id,
      'me',
      {},
    )) as {
      alreadyApplied: boolean;
    };
    expect(out.alreadyApplied).toBe(false);
    expect(tracker.calls.length).toBe(1);
  });

  it('is idempotent on re-apply (does not re-fire the tracker)', async () => {
    const repo = new InMemoryJobsRepository();
    const tracker = new CountingTracker();
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    const useCase = new ApplyToJobUseCase(repo, tracker, noopEvents, stubLogger);
    await useCase.execute(job.id, 'me', {});
    const second = (await useCase.execute(job.id, 'me', {})) as { alreadyApplied: boolean };
    expect(second.alreadyApplied).toBe(true);
    expect(tracker.calls.length).toBe(1);
  });
});
