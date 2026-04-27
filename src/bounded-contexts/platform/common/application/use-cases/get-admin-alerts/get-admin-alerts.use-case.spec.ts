import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryAdminAlertsRepository } from '../../../testing';
import { GetAdminAlertsUseCase } from './get-admin-alerts.use-case';

describe('GetAdminAlertsUseCase', () => {
  it('sums the queue counters into total', async () => {
    const repo = new InMemoryAdminAlertsRepository({
      reportsPending: 3,
      usersPendingVerification: 4,
      shadowProfilesStale: 5,
    });

    const result = await new GetAdminAlertsUseCase(repo, stubLogger).execute();

    expect(result.total).toBe(12);
    expect(result.reportsPending).toBe(3);
  });

  it('serves a second call from cache within the TTL', async () => {
    const repo = new InMemoryAdminAlertsRepository({
      reportsPending: 1,
      usersPendingVerification: 0,
      shadowProfilesStale: 0,
    });
    let now = 1_000;
    const useCase = new GetAdminAlertsUseCase(repo, stubLogger, () => now);

    const first = await useCase.execute();
    repo.setCounts({ reportsPending: 99, usersPendingVerification: 99, shadowProfilesStale: 99 });
    now += 5_000;
    const second = await useCase.execute();

    expect(second).toEqual(first);
    expect(repo.callCount).toBe(1);
  });

  it('refetches when the cache expires', async () => {
    const repo = new InMemoryAdminAlertsRepository({
      reportsPending: 1,
      usersPendingVerification: 0,
      shadowProfilesStale: 0,
    });
    let now = 1_000;
    const useCase = new GetAdminAlertsUseCase(repo, stubLogger, () => now);

    await useCase.execute();
    repo.setCounts({ reportsPending: 7, usersPendingVerification: 0, shadowProfilesStale: 0 });
    now += 31_000;
    const second = await useCase.execute();

    expect(second.reportsPending).toBe(7);
    expect(repo.callCount).toBe(2);
  });
});
