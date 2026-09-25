import { describe, expect, it } from 'bun:test';
import { InMemoryDistributedLockAdapter } from '@/infrastructure/elysia-adapter/in-memory-distributed-lock.adapter';
import { BillingPurchase } from '../../../domain/entities/billing-purchase.entity';
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
  orderStatus: ProviderOrder['status'] = 'pending';
  cancelCalls = 0;
  failCancel = false;
  failNextPix = false;
  subscriptionResult: ProviderSubscription | null = null;
  paymentResults: ProviderPayment[] = [];

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
    const purchase = this.lastPixInput;
    if (!purchase) throw new Error('not used');
    return Promise.resolve({
      id: 'order-1',
      externalReference: purchase.externalReference,
      paymentId: this.orderStatus === 'approved' ? 'payment-1' : null,
      status: this.orderStatus,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      paidAt: this.orderStatus === 'approved' ? new Date('2026-09-24T12:01:00Z') : null,
      qrCode: 'pix-copy-and-paste',
      qrCodeBase64: 'base64',
      ticketUrl: null,
    });
  }
  async cancelOrder(id: string, _idempotencyKey: string): Promise<ProviderOrder> {
    this.cancelCalls++;
    if (this.failCancel) throw new Error('cannot_cancel_order');
    this.orderStatus = 'canceled';
    return this.getOrder(id);
  }
  getSubscription(_id: string): Promise<ProviderSubscription> {
    if (!this.subscriptionResult) throw new Error('not used');
    return Promise.resolve(this.subscriptionResult);
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
    return Promise.resolve(this.paymentResults);
  }
  verifyWebhook(_input: VerifyWebhookInput): never {
    throw new Error('not used');
  }
}

describe('ManageCheckoutUseCase', () => {
  it('reconciles a card charge on checkout refresh without waiting for a webhook', async () => {
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
    const checkout = await useCase.create('user-1', 'go_card_month');
    const subscription = await store.createSubscription('user-1', 'go', 3_999);
    await store.updateSubscription({
      ...subscription,
      providerSubscriptionId: 'remote-sub',
      providerVersion: 1,
    });
    const purchase = BillingPurchase.restore(store.purchases.get(checkout.id)!);
    purchase.attachSubscription(subscription.id, 'remote-sub');
    await store.savePurchase(purchase);
    provider.subscriptionResult = {
      id: 'remote-sub',
      externalReference: null,
      payerId: 'buyer-1',
      version: 2,
      status: 'active',
      amountCents: 3_999,
      currency: 'BRL',
      nextPaymentAt: null,
      checkoutUrl: null,
    };
    provider.paymentResults = [
      {
        id: 'payment-1',
        subscriptionId: 'remote-sub',
        status: 'approved',
        amountCents: 3_999,
        currency: 'BRL',
        paidAt: clock.now(),
      },
    ];

    expect((await useCase.status('user-1', checkout.id)).status).toBe('approved');
    expect(await store.findActiveEntitlement('user-1', clock.now())).not.toBeNull();
  });
  it('publishes prices but refuses to create a checkout while billing is disabled', async () => {
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
        enabled: false,
        cardEnabled: true,
        pixEnabled: true,
        ordersPublicKey: 'orders-public-key',
        subscriptionsPublicKey: 'subscriptions-public-key',
        frontendUrl: 'https://patchcareers.org',
        aiCostBrlPerUsd: 5,
      },
    );

    await expect(useCase.offers()).resolves.toMatchObject({
      checkoutEnabled: false,
      items: expect.arrayContaining([expect.objectContaining({ code: 'go_card_month' })]),
    });
    await expect(useCase.create('user-1', 'go_card_month')).rejects.toThrow(
      'Patch Go checkout is not configured',
    );
  });

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
        testBuyerEmail: 'buyer@testuser.com',
        testPixFirstName: 'APRO',
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
    expect(provider.lastPixInput?.externalReference).toBe('patch_id1');
    expect(provider.lastPixInput?.email).toBe('buyer@testuser.com');
    expect(provider.lastPixInput?.firstName).toBe('APRO');
    expect(store.entitlements.size).toBe(0);
    expect(store.outbox.map((event) => event.eventType)).toEqual(['billing.purchase-created']);
  });

  it('cancels a pending Pix at the provider before another offer can be created', async () => {
    const store = new InMemoryBillingStore();
    const provider = new FakePaymentProvider();
    const ids = new SequentialIds();
    const clock = new FixedClock();
    const processor = new ProcessProviderEventUseCase(
      store,
      new InMemoryBillingUnitOfWork(store),
      provider,
      ids,
      clock,
    );
    store.emails.set('user-1', 'person@example.com');
    const useCase = new ManageCheckoutUseCase(
      store,
      new InMemoryBillingUnitOfWork(store),
      provider,
      processor,
      new InMemoryDistributedLockAdapter(),
      ids,
      clock,
      {
        enabled: true,
        cardEnabled: true,
        pixEnabled: true,
        ordersPublicKey: null,
        subscriptionsPublicKey: null,
        frontendUrl: 'https://patchcareers.org',
        aiCostBrlPerUsd: 5,
      },
    );
    const first = await useCase.create('user-1', 'go_pix_quarter');
    await expect(useCase.create('user-1', 'go_pix_year')).rejects.toThrow();

    expect((await useCase.cancelPix('user-1', first.id)).status).toBe('canceled');
    expect(provider.cancelCalls).toBe(1);
    provider.orderStatus = 'pending';
    await processor.syncOrder(await provider.getOrder('order-1'));
    expect((await store.findPurchase(first.id))?.status).toBe('canceled');
    provider.orderStatus = 'canceled';
    expect((await useCase.cancelPix('user-1', first.id)).status).toBe('canceled');
    expect(provider.cancelCalls).toBe(1);
    expect((await useCase.create('user-1', 'go_pix_year')).offerCode).toBe('go_pix_year');
  });

  it('does not cancel a Pix that was approved while the customer changed plans', async () => {
    const store = new InMemoryBillingStore();
    const provider = new FakePaymentProvider();
    const ids = new SequentialIds();
    const clock = new FixedClock();
    store.emails.set('user-1', 'person@example.com');
    const useCase = new ManageCheckoutUseCase(
      store,
      new InMemoryBillingUnitOfWork(store),
      provider,
      new ProcessProviderEventUseCase(
        store,
        new InMemoryBillingUnitOfWork(store),
        provider,
        ids,
        clock,
      ),
      new InMemoryDistributedLockAdapter(),
      ids,
      clock,
      {
        enabled: true,
        cardEnabled: true,
        pixEnabled: true,
        ordersPublicKey: null,
        subscriptionsPublicKey: null,
        frontendUrl: 'https://patchcareers.org',
        aiCostBrlPerUsd: 5,
      },
    );
    const first = await useCase.create('user-1', 'go_pix_quarter');
    provider.orderStatus = 'approved';

    expect((await useCase.cancelPix('user-1', first.id)).status).toBe('approved');
    expect(provider.cancelCalls).toBe(0);
    expect(store.entitlements.size).toBe(1);
  });

  it('keeps the existing Pix open when the provider refuses cancellation', async () => {
    const store = new InMemoryBillingStore();
    const provider = new FakePaymentProvider();
    const ids = new SequentialIds();
    const clock = new FixedClock();
    store.emails.set('user-1', 'person@example.com');
    const useCase = new ManageCheckoutUseCase(
      store,
      new InMemoryBillingUnitOfWork(store),
      provider,
      new ProcessProviderEventUseCase(
        store,
        new InMemoryBillingUnitOfWork(store),
        provider,
        ids,
        clock,
      ),
      new InMemoryDistributedLockAdapter(),
      ids,
      clock,
      {
        enabled: true,
        cardEnabled: true,
        pixEnabled: true,
        ordersPublicKey: null,
        subscriptionsPublicKey: null,
        frontendUrl: 'https://patchcareers.org',
        aiCostBrlPerUsd: 5,
      },
    );
    const first = await useCase.create('user-1', 'go_pix_quarter');
    provider.failCancel = true;

    await expect(useCase.cancelPix('user-1', first.id)).rejects.toThrow('cannot_cancel_order');
    expect((await store.findPurchase(first.id))?.status).toBe('pending');
    await expect(useCase.create('user-1', 'go_pix_year')).rejects.toThrow();
    await expect(useCase.cancelPix('another-user', first.id)).rejects.toThrow();
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
      externalReference: 'patch_id1',
    });
    expect(store.purchases.size).toBe(1);
  });

  it('recovers an orphaned provider order before canceling it', async () => {
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
        ordersPublicKey: null,
        subscriptionsPublicKey: null,
        frontendUrl: 'https://patchcareers.org',
        aiCostBrlPerUsd: 5,
      },
    );
    provider.failNextPix = true;

    await expect(useCase.create('user-1', 'go_pix_quarter')).rejects.toThrow();
    expect((await store.findPurchase('id-1'))?.providerOrderId).toBeNull();
    expect((await useCase.cancelPix('user-1', 'id-1')).status).toBe('canceled');
    expect(provider.lastPixInput?.purchaseId).toBe('id-1');
    expect(provider.cancelCalls).toBe(1);
  });
});
