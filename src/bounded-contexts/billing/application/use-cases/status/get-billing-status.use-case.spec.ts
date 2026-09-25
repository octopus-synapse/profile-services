import { describe, expect, it } from 'bun:test';
import { InMemoryBillingStore } from '../../../testing/in-memory/in-memory-billing-store.repository';
import { BillingClockPort } from '../../ports/billing-runtime.port';
import { ManageBillingAccessUseCase } from '../access/manage-billing-access.use-case';
import { GetBillingStatusUseCase } from './get-billing-status.use-case';

class FixedClock extends BillingClockPort {
  now() {
    return new Date('2026-09-24T12:00:00Z');
  }
}

describe('GetBillingStatusUseCase', () => {
  it('reports a real Free state when billing enforcement is disabled', async () => {
    const store = new InMemoryBillingStore();
    const clock = new FixedClock();
    const config = {
      enabled: false,
      cardEnabled: true,
      pixEnabled: true,
      ordersPublicKey: null,
      subscriptionsPublicKey: null,
      frontendUrl: 'https://patchcareers.org',
      aiCostBrlPerUsd: 5,
    };
    const access = new ManageBillingAccessUseCase(store, config, clock);
    const status = new GetBillingStatusUseCase(store, access, config, clock);

    await expect(status.execute('user-1')).resolves.toMatchObject({
      enabled: false,
      active: false,
      plan: 'free',
      paymentMode: null,
      openCheckout: null,
    });
  });
});
