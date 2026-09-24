import { describe, expect, it } from 'bun:test';
import {
  PatchGoLimitReachedException,
  PatchGoRequiredException,
} from '../../../domain/exceptions/billing.exceptions';
import { InMemoryBillingStore } from '../../../testing/in-memory/in-memory-billing-store.repository';
import { BillingClockPort } from '../../ports/billing-runtime.port';
import { ManageBillingAccessUseCase } from './manage-billing-access.use-case';

class FixedClock extends BillingClockPort {
  now() {
    return new Date('2026-09-24T12:00:00Z');
  }
}
const config = {
  enabled: true,
  cardEnabled: true,
  pixEnabled: true,
  ordersPublicKey: 'orders-public',
  subscriptionsPublicKey: 'subscriptions-public',
  frontendUrl: 'https://patchcareers.org',
  aiCostBrlPerUsd: 5,
};

describe('ManageBillingAccessUseCase', () => {
  it('enforces the Go quota with an in-memory repository', async () => {
    const store = new InMemoryBillingStore();
    store.entitlements.set('ent-1', {
      id: 'ent-1',
      userId: 'user-1',
      purchaseId: null,
      source: 'test',
      sourceRef: 'test-1',
      plan: 'go',
      status: 'active',
      startsAt: new Date('2026-09-01T00:00:00Z'),
      endsAt: new Date('2026-12-01T00:00:00Z'),
      quotaAnchorAt: new Date('2026-09-01T00:00:00Z'),
      terminatedAt: null,
    });
    const useCase = new ManageBillingAccessUseCase(store, config, new FixedClock());
    for (let count = 0; count < 50; count++) await useCase.reserve('user-1');
    await expect(useCase.reserve('user-1')).rejects.toBeInstanceOf(PatchGoLimitReachedException);
  });

  it('reserves and releases the free translation quota', async () => {
    const useCase = new ManageBillingAccessUseCase(
      new InMemoryBillingStore(),
      config,
      new FixedClock(),
    );
    const reservation = await useCase.reserveFreeTranslation('free-user', 20);
    expect(await useCase.freeTranslationRemaining('free-user')).toBe(0);
    await useCase.releaseFreeTranslation(reservation);
    expect(await useCase.freeTranslationRemaining('free-user')).toBe(20);
  });

  it('does not reserve paid quota from an expired subscription', async () => {
    const store = new InMemoryBillingStore();
    store.subscriptions.set('sub-1', {
      id: 'sub-1',
      userId: 'user-1',
      providerSubscriptionId: 'provider-sub-1',
      providerPayerId: null,
      providerVersion: 1,
      plan: 'go',
      status: 'active',
      amountCents: 3999,
      currency: 'BRL',
      periodStart: new Date('2026-08-01T00:00:00Z'),
      periodEnd: new Date('2026-09-01T00:00:00Z'),
      nextPaymentAt: null,
      cancelAtPeriodEnd: false,
    });
    const useCase = new ManageBillingAccessUseCase(store, config, new FixedClock());

    await expect(useCase.reserve('user-1')).rejects.toBeInstanceOf(PatchGoRequiredException);
  });
});
