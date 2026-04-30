import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ApplicationNotOwnedException } from '../../../domain/exceptions/jobs.exceptions';
import { InMemoryApplicationTrackerRepository } from '../../../testing';
import { RecordApplicationEventUseCase } from './record-application-event.use-case';

describe('RecordApplicationEventUseCase', () => {
  it('throws EntityNotFoundException when the application does not exist', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    const useCase = new RecordApplicationEventUseCase(repo);
    await expect(
      useCase.execute({ applicationId: 'missing', userId: 'u-1', type: 'VIEWED' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws ApplicationNotOwnedException when the user does not own the app', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    repo.seedApplication({ id: 'app-1', userId: 'owner' });
    const useCase = new RecordApplicationEventUseCase(repo);
    await expect(
      useCase.execute({ applicationId: 'app-1', userId: 'someone-else', type: 'VIEWED' }),
    ).rejects.toBeInstanceOf(ApplicationNotOwnedException);
  });

  it('records the event and returns the projected ISO view', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    repo.seedApplication({ id: 'app-1', userId: 'u-1' });

    const out = await new RecordApplicationEventUseCase(repo).execute({
      applicationId: 'app-1',
      userId: 'u-1',
      type: 'INTERVIEW_SCHEDULED',
      note: 'phone screen',
    });

    expect(out.type).toBe('INTERVIEW_SCHEDULED');
    expect(out.note).toBe('phone screen');
    expect(typeof out.occurredAt).toBe('string');
  });

  it('syncs the coarse status for VIEWED/REJECTED/OFFER_RECEIVED', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    repo.seedApplication({ id: 'app-1', userId: 'u-1' });
    const useCase = new RecordApplicationEventUseCase(repo);

    await useCase.execute({ applicationId: 'app-1', userId: 'u-1', type: 'OFFER_RECEIVED' });
    expect(repo.applications.get('app-1')?.status).toBe('ACCEPTED');

    await useCase.execute({ applicationId: 'app-1', userId: 'u-1', type: 'REJECTED' });
    expect(repo.applications.get('app-1')?.status).toBe('REJECTED');
  });

  it('does not change status for events without a status mapping (e.g. INTERVIEW_SCHEDULED)', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    repo.seedApplication({ id: 'app-1', userId: 'u-1', status: 'SUBMITTED' });

    await new RecordApplicationEventUseCase(repo).execute({
      applicationId: 'app-1',
      userId: 'u-1',
      type: 'INTERVIEW_SCHEDULED',
    });
    expect(repo.applications.get('app-1')?.status).toBe('SUBMITTED');
  });
});
