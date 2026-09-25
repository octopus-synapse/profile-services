import { describe, expect, it } from 'bun:test';
import type {
  CreateCardOrderInput,
  CreatePixOrderInput,
  CreateSubscriptionInput,
  ProviderOrder,
  ProviderPayment,
  ProviderSubscription,
  VerifyWebhookInput,
} from '../../../domain/ports/payment-provider.port';
import { PaymentProviderPort } from '../../../domain/ports/payment-provider.port';
import { InMemoryBillingStore } from '../../../testing/in-memory/in-memory-billing-store.repository';
import { BillingClockPort, BillingIdPort } from '../../ports/billing-runtime.port';
import { ManageSubscriptionUseCase } from './manage-subscription.use-case';

class FixedClock extends BillingClockPort {
  now() {
    return new Date('2026-09-24T12:00:00Z');
  }
}

class TestIds extends BillingIdPort {
  id() {
    return 'id';
  }
  token() {
    return 'token';
  }
  hash(value: string) {
    return value;
  }
}

class PlanChangeProvider extends PaymentProviderPort {
  amounts: number[] = [];
  async updateSubscriptionAmount(id: string, amountCents: number): Promise<ProviderSubscription> {
    this.amounts.push(amountCents);
    return {
      id,
      externalReference: null,
      payerId: 'payer',
      version: this.amounts.length,
      status: 'active',
      amountCents,
      currency: 'BRL',
      nextPaymentAt: new Date('2026-10-24T12:00:00Z'),
      checkoutUrl: null,
    };
  }
  createSubscription(_input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    throw new Error('not used');
  }
  createCardOrder(_input: CreateCardOrderInput): Promise<ProviderOrder> {
    throw new Error('not used');
  }
  createPixOrder(_input: CreatePixOrderInput): Promise<ProviderOrder> {
    throw new Error('not used');
  }
  getOrder(_id: string): Promise<ProviderOrder> {
    throw new Error('not used');
  }
  getSubscription(_id: string): Promise<ProviderSubscription> {
    throw new Error('not used');
  }
  cancelSubscription(_id: string): Promise<ProviderSubscription> {
    throw new Error('not used');
  }
  updatePaymentMethod(_id: string, _token: string): Promise<ProviderSubscription> {
    throw new Error('not used');
  }
  getAuthorizedPayment(_id: string): Promise<ProviderPayment> {
    throw new Error('not used');
  }
  listAuthorizedPayments(_id: string): Promise<ReadonlyArray<ProviderPayment>> {
    return Promise.resolve([]);
  }
  verifyWebhook(_input: VerifyWebhookInput): never {
    throw new Error('not used');
  }
}

describe('ManageSubscriptionUseCase plan changes', () => {
  it('schedules a Max to Go downgrade and can restore Max before renewal', async () => {
    const store = new InMemoryBillingStore();
    const provider = new PlanChangeProvider();
    store.subscriptions.set('sub-1', {
      id: 'sub-1',
      userId: 'user-1',
      providerSubscriptionId: 'provider-sub-1',
      providerPayerId: 'payer',
      providerVersion: 0,
      plan: 'max',
      pendingPlan: null,
      status: 'active',
      amountCents: 15_000,
      currency: 'BRL',
      periodStart: new Date('2026-09-24T12:00:00Z'),
      periodEnd: new Date('2026-10-24T12:00:00Z'),
      nextPaymentAt: new Date('2026-10-24T12:00:00Z'),
      cancelAtPeriodEnd: false,
    });
    const useCase = new ManageSubscriptionUseCase(
      store,
      provider,
      new TestIds(),
      new FixedClock(),
      {
        enabled: true,
        cardEnabled: true,
        pixEnabled: true,
        ordersPublicKey: 'orders',
        subscriptionsPublicKey: 'subscriptions',
        frontendUrl: 'https://patchcareers.org',
        aiCostBrlPerUsd: 5,
      },
    );

    await useCase.schedulePlanChange('user-1', 'go');
    expect(store.subscriptions.get('sub-1')).toMatchObject({
      plan: 'max',
      pendingPlan: 'go',
      amountCents: 3_999,
    });

    await useCase.cancelPlanChange('user-1');
    expect(store.subscriptions.get('sub-1')).toMatchObject({
      plan: 'max',
      pendingPlan: null,
      amountCents: 15_000,
    });
    expect(provider.amounts).toEqual([3_999, 15_000]);
  });
});
