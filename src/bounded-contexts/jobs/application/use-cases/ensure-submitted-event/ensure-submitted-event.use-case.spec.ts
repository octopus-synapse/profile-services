import { describe, expect, it } from 'bun:test';
import { InMemoryApplicationTrackerRepository } from '../../../testing';
import { EnsureSubmittedEventUseCase } from './ensure-submitted-event.use-case';

describe('EnsureSubmittedEventUseCase', () => {
  it('inserts a SUBMITTED event when none exists', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    repo.seedApplication({ id: 'app-1', userId: 'u-1', events: [] });

    await new EnsureSubmittedEventUseCase(repo).execute('app-1');
    const submitted = repo.applications.get('app-1')?.events.filter((e) => e.type === 'SUBMITTED');
    expect(submitted).toHaveLength(1);
  });

  it('is idempotent — does not insert a second SUBMITTED on rerun', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    const seededAt = new Date('2026-01-01T00:00:00.000Z');
    repo.seedApplication({
      id: 'app-1',
      userId: 'u-1',
      events: [{ type: 'SUBMITTED', occurredAt: seededAt }],
    });

    const useCase = new EnsureSubmittedEventUseCase(repo);
    await useCase.execute('app-1');
    await useCase.execute('app-1');

    const submitted = repo.applications.get('app-1')?.events.filter((e) => e.type === 'SUBMITTED');
    expect(submitted).toHaveLength(1);
    expect(submitted?.[0]?.occurredAt).toBe(seededAt);
  });
});
