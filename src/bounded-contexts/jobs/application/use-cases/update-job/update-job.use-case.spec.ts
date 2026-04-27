import { stubLogger } from '@/shared-kernel/logger/testing';
import { describe, expect, it } from 'bun:test';
import type { DomainEvent } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { JobUpdatedEvent } from '../../../domain/events';
import { CannotModifyOthersJobException } from '../../../domain/exceptions/jobs.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { UpdateJobUseCase } from './update-job.use-case';

class CapturingPublisher extends EventPublisherPort {
  events: Array<{ type: string; payload: unknown }> = [];
  publish<T>(event: DomainEvent<T>): void {
    this.events.push({ type: event.eventType, payload: event.payload });
  }
  async publishAsync<T>(event: DomainEvent<T>): Promise<void> {
    this.publish(event);
  }
}

describe('UpdateJobUseCase', () => {
  it('throws when the job is missing', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(
      new UpdateJobUseCase(repo, new CapturingPublisher(), stubLogger).execute('x', 'me', { title: 'a' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('rejects non-author edits', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    await expect(
      new UpdateJobUseCase(repo, new CapturingPublisher(), stubLogger).execute(job.id, 'someone', {
        title: 'b',
      }),
    ).rejects.toBeInstanceOf(CannotModifyOthersJobException);
  });

  it('updates and emits a JobUpdatedEvent excluding expiresAt', async () => {
    const repo = new InMemoryJobsRepository();
    const pub = new CapturingPublisher();
    const job = repo.seedJob({ authorId: 'me', title: 'A' });
    await new UpdateJobUseCase(repo, pub, stubLogger).execute(job.id, 'me', {
      title: 'B',
      expiresAt: new Date('2030-01-01').toISOString(),
    });
    expect(pub.events.length).toBe(1);
    expect(pub.events[0].type).toBe(JobUpdatedEvent.TYPE);
    const payload = pub.events[0].payload as { changedFields: string[] };
    expect(payload.changedFields).toEqual(['title']);
  });
});
