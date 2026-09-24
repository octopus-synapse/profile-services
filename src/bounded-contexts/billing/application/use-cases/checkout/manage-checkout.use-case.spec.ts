import { describe, expect, it } from 'bun:test';
import { InMemoryDistributedLockAdapter } from '@/infrastructure/elysia-adapter/in-memory-distributed-lock.adapter';
import {
  type CreateCardOrderInput,
  type CreatePixOrderInput,
  type CreateSubscriptionInput,
  PaymentProviderPort,
  type ProviderOrder,
  type ProviderPayment,
  type ProviderSubscription,
  type VerifyWebhookInput,
} from '../../../domain/ports/payment-provider.port';
import { InMemoryBillingStore } from '../../../testing/in-memory/in-memory-billing-store.repository';
import { InMemoryBillingUnitOfWork } from '../../../testing/in-memory/in-memory-billing-unit-of-work';
import { BillingClockPort, BillingIdPort } from '../../ports/billing-runtime.port';
import { ProcessProviderEventUseCase } from '../provider/process-provider-event.use-case';
import { ManageCheckoutUseCase } from './manage-checkout.use-case';

class FixedClock extends BillingClockPort {
  now() {
    return new Date('2026-09-24T12:00:00Z');
  }
}

class SequentialIds extends BillingIdPort {
  private sequence = 0;
  id() {
    return `id-${++this.sequence}`;
  }
  token() {
    return 'token';
  }
  hash(value: string) {
    return value;
  }
}

class FakePaymentProvider extends PaymentProviderPort {
  lastPixInput: CreatePixOrderInput | null = null;
  failNextPix = false;

  async createPixOrder(input: CreatePixOrderInput): Promise<ProviderOrder> {
    this.lastPixInput = input;
    if (this.failNextPix) {
      this.failNextPix = false;
      throw new Error('provider unavailable');
    }
    return {
      id: 'order-1',
      externalReference: input.externalReference,
      paymentId: null,
      status: 'pending',
      amountCents: input.amountCents,
      currency: input.currency,
      paidAt: null,
      qrCode: 'pix-copy-and-paste',
      qrCodeBase64: 'base64',
      ticketUrl: null,
    };
  }
  createSubscription(_input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    throw new Error('not used');
  }
  createCardOrder(_input: CreateCardOrderInput): Promise<ProviderOrder> {
    throw new Error('not used');
  }
  getOrder(_id: string): Promise<ProviderOrder> {
    throw new Error('not used');
  }
  getSubscription(_id: string): Promise<ProviderSubscription> {
    throw new Error('not used');
  }
  updateSubscriptionAmount(_id: string, _amount: number): Promise<ProviderSubscription> {
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

describe('ManageCheckoutUseCase', () => {
  it('creates discounted Pix in-app and grants no entitlement while payment is pending', async () => {
    const store = new InMemoryBillingStore();
    const unit = new InMemoryBillingUnitOfWork(store);
    const provider = new FakePaymentProvider();
    const ids = new SequentialIds();
    const clock = new FixedClock();
    store.emails.set('user-1', 'person@example.com');
    const processor = new ProcessProviderEventUseCase(store, unit, provider, ids, clock);
    const useCase = new ManageCheckoutUseCase(
      store,
      unit,
      provider,
      processor,
      new InMemoryDistributedLockAdapter(),
      ids,
      clock,
      {
        enabled: true,
        cardEnabled: true,
        pixEnabled: true,
        ordersPublicKey: 'orders-public-key',
        subscriptionsPublicKey: 'subscriptions-public-key',
        frontendUrl: 'https://patchcareers.org',
        aiCostBrlPerUsd: 5,
      },
    );

    const result = await useCase.create('user-1', 'go_pix_year');

    expect(result).toMatchObject({
      id: 'id-1',
      kind: 'pix',
      status: 'pending',
      amountCents: 39990,
      listAmountCents: 47988,
      qrCode: 'pix-copy-and-paste',
    });
    expect(provider.lastPixInput?.externalReference).toBe('patch:id-1');
    expect(store.entitlements.size).toBe(0);
    expect(store.outbox.map((event) => event.eventType)).toEqual(['billing.purchase-created']);
  });

  it('retries an orphaned Pix provider request with the persisted idempotency key', async () => {
    const store = new InMemoryBillingStore();
    const unit = new InMemoryBillingUnitOfWork(store);
    const provider = new FakePaymentProvider();
    const ids = new SequentialIds();
    const clock = new FixedClock();
    store.emails.set('user-1', 'person@example.com');
    const useCase = new ManageCheckoutUseCase(
      store,
      unit,
      provider,
      new ProcessProviderEventUseCase(store, unit, provider, ids, clock),
      new InMemoryDistributedLockAdapter(),
      ids,
      clock,
      {
        enabled: true,
        cardEnabled: true,
        pixEnabled: true,
        ordersPublicKey: 'orders-public-key',
        subscriptionsPublicKey: 'subscriptions-public-key',
        frontendUrl: 'https://patchcareers.org',
        aiCostBrlPerUsd: 5,
      },
    );
    provider.failNextPix = true;

    await expect(useCase.create('user-1', 'go_pix_year')).rejects.toThrow('provider unavailable');
    const result = await useCase.create('user-1', 'go_pix_year');

    expect(result).toMatchObject({ id: 'id-1', status: 'pending', qrCode: 'pix-copy-and-paste' });
    expect(provider.lastPixInput).toMatchObject({
      purchaseId: 'id-1',
      externalReference: 'patch:id-1',
    });
    expect(store.purchases.size).toBe(1);
  });
});
