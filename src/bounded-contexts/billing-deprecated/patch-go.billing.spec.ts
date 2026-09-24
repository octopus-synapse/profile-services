import { describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { MercadoPagoPaymentAdapter } from './mercado-pago.adapter';
import { PatchGoBilling } from './patch-go.billing';
import { PatchGoLimitReachedException, PatchGoRequiredException } from './patch-go.exceptions';
import {
  type CreateSubscriptionInput,
  PaymentProviderPort,
  type ProviderOrder,
  type ProviderPayment,
  type ProviderSubscription,
  type ProviderWebhookEvent,
  type VerifyWebhookInput,
} from './payment-provider.port';

const config = {
  BILLING_ENABLED: true,
  MERCADO_PAGO_ACCESS_TOKEN: 'TEST-example',
  MERCADO_PAGO_PUBLIC_KEY: 'TEST-public',
  MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
  AI_COST_BRL_PER_USD: '5.5',
  FRONTEND_URL: 'https://patchcareers.org',
} as const;

const remoteSubscription = (
  overrides: Partial<ProviderSubscription> = {},
): ProviderSubscription => ({
  id: 'preapproval-1',
  externalReference: 'user-1:local-1',
  payerId: 'payer-1',
  version: 1,
  status: 'pending',
  amountCents: 3999,
  currency: 'BRL',
  nextPaymentAt: null,
  checkoutUrl: 'https://www.mercadopago.com.br/subscriptions/checkout?id=1',
  ...overrides,
});

class FakeProvider extends PaymentProviderPort {
  created?: CreateSubscriptionInput;
  subscription = remoteSubscription();
  payment?: ProviderPayment;
  authorizedPaymentReads = 0;

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    this.created = input;
    return this.subscription;
  }
  async createPixOrder(): Promise<ProviderOrder> {
    throw new Error('not used');
  }
  async createCardOrder(): Promise<ProviderOrder> {
    throw new Error('not used');
  }
  async getOrder(): Promise<ProviderOrder> {
    throw new Error('not used');
  }
  async getSubscription(): Promise<ProviderSubscription> {
    return this.subscription;
  }
  async updateSubscriptionAmount(_id: string, amountCents: number): Promise<ProviderSubscription> {
    this.subscription = { ...this.subscription, amountCents };
    return this.subscription;
  }
  async cancelSubscription(): Promise<ProviderSubscription> {
    this.subscription = { ...this.subscription, status: 'canceled' };
    return this.subscription;
  }
  async updatePaymentMethod(): Promise<ProviderSubscription> {
    return this.subscription;
  }
  async getAuthorizedPayment(): Promise<ProviderPayment> {
    this.authorizedPaymentReads++;
    if (!this.payment) throw new Error('not used');
    return this.payment;
  }
  async listAuthorizedPayments(): Promise<ReadonlyArray<ProviderPayment>> {
    return [];
  }
  verifyWebhook(_input: VerifyWebhookInput): ProviderWebhookEvent {
    throw new Error('not used');
  }
}

describe('MercadoPagoPaymentAdapter', () => {
  it('creates a one-time card order with a token and one installment', async () => {
    const originalFetch = globalThis.fetch;
    let request: RequestInit | undefined;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      request = init;
      return new Response(
        JSON.stringify({
          id: 'order-1',
          external_reference: 'patch:purchase-1',
          status: 'processed',
          total_amount: '55.01',
          currency: 'BRL',
          last_updated: new Date().toISOString(),
          transactions: {
            payments: [
              { id: 'payment-1', status: 'approved', amount: '55.01', paid_amount: '0.00' },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    try {
      const adapter = new MercadoPagoPaymentAdapter('token', config.MERCADO_PAGO_WEBHOOK_SECRET);
      const order = await adapter.createCardOrder({
        purchaseId: 'purchase-1',
        externalReference: 'patch:purchase-1',
        email: 'person@example.com',
        amountCents: 5501,
        currency: 'BRL',
        cardToken: 'card-token',
        paymentMethodId: 'visa',
        installments: 1,
      });
      const body = JSON.parse(String(request?.body));
      expect(body.transactions.payments[0]).toMatchObject({
        amount: '55.01',
        payment_method: {
          id: 'visa',
          type: 'credit_card',
          token: 'card-token',
          installments: 1,
        },
      });
      expect(order).toMatchObject({ id: 'order-1', status: 'approved', amountCents: 5501 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('accepts a valid signature and rejects a modified resource id', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({
      id: 123,
      type: 'subscription_preapproval',
      action: 'updated',
      data: { id: 'preapproval-1' },
    });
    const manifest = `id:preapproval-1;request-id:req-1;ts:${timestamp};`;
    const digest = createHmac('sha256', config.MERCADO_PAGO_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex');
    const adapter = new MercadoPagoPaymentAdapter('token', config.MERCADO_PAGO_WEBHOOK_SECRET);
    expect(
      adapter.verifyWebhook({
        rawBody: body,
        signature: `ts=${timestamp},v1=${digest}`,
        requestId: 'req-1',
      }),
    ).toMatchObject({ eventId: '123', type: 'subscription', resourceId: 'preapproval-1' });
    expect(() =>
      adapter.verifyWebhook({
        rawBody: body.replace('preapproval-1', 'preapproval-2'),
        signature: `ts=${timestamp},v1=${digest}`,
        requestId: 'req-1',
      }),
    ).toThrow();
  });

  it('accepts Mercado Pago millisecond webhook timestamps', () => {
    const timestamp = Date.now().toString();
    const body = JSON.stringify({
      id: 124,
      type: 'order',
      action: 'order.processed',
      data: { id: 'ORD01TEST' },
    });
    const digest = createHmac('sha256', config.MERCADO_PAGO_WEBHOOK_SECRET)
      .update(`id:ord01test;request-id:req-2;ts:${timestamp};`)
      .digest('hex');
    const adapter = new MercadoPagoPaymentAdapter('token', config.MERCADO_PAGO_WEBHOOK_SECRET);
    expect(
      adapter.verifyWebhook({
        rawBody: body,
        signature: `ts=${timestamp},v1=${digest}`,
        requestId: 'req-2',
      }),
    ).toMatchObject({ type: 'order', resourceId: 'ORD01TEST' });
  });
});

describe('PatchGoBilling', () => {
  it('does not grant access when a paid period is absent', async () => {
    const prisma = {
      billingSubscription: { findFirst: async () => null },
      $queryRaw: async () => [],
    } as unknown as PrismaClient;
    const billing = new PatchGoBilling(prisma, config, undefined, new FakeProvider());
    expect(await billing.isPaid('user-1')).toBe(false);
    await expect(billing.reserve('user-1')).rejects.toBeInstanceOf(PatchGoRequiredException);
  });

  it('rejects a preparation when the paid plan quota is exhausted', async () => {
    const prisma = {
      $queryRaw: async () => [],
      billingSubscription: {
        findFirst: async () => ({
          plan: 'go',
          status: 'active',
          periodStart: new Date(Date.now() - 1000),
          periodEnd: new Date(Date.now() + 60_000),
        }),
      },
    } as unknown as PrismaClient;
    const billing = new PatchGoBilling(prisma, config, undefined, new FakeProvider());
    await expect(billing.reserve('user-1')).rejects.toBeInstanceOf(PatchGoLimitReachedException);
  });

  it('reports Free and Max quotas from the provider-neutral projection', async () => {
    const prisma = {
      billingSubscription: {
        findFirst: async ({ where }: { where: { userId: string } }) =>
          where.userId === 'max-user'
            ? {
                plan: 'max',
                pendingPlan: null,
                status: 'active',
                periodStart: new Date(Date.now() - 1000),
                periodEnd: new Date(Date.now() + 60_000),
                cancelAtPeriodEnd: false,
              }
            : null,
      },
      patchGoUsage: { findUnique: async () => ({ count: 137 }) },
      patchFreeTranslationUsage: { findUnique: async () => ({ count: 8 }) },
    } as unknown as PrismaClient;
    const billing = new PatchGoBilling(prisma, config, undefined, new FakeProvider());
    expect(await billing.status('free-user')).toMatchObject({
      plan: 'free',
      freeTranslationsUsed: 8,
      freeTranslationsLimit: 20,
    });
    expect(await billing.status('max-user')).toMatchObject({ plan: 'max', used: 137, limit: 200 });
  });

  it('creates a BRL Mercado Pago checkout without granting access', async () => {
    const provider = new FakeProvider();
    const updates: unknown[] = [];
    const prisma = {
      billingSubscription: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'local-1',
          ...data,
        }),
        update: async ({ data }: { data: unknown }) => {
          updates.push(data);
        },
      },
      user: { findUnique: async () => ({ email: 'person@example.com' }) },
    } as unknown as PrismaClient;
    const billing = new PatchGoBilling(prisma, config, undefined, provider);
    expect(await billing.checkout('user-1', 'go')).toContain('mercadopago.com.br');
    expect(provider.created).toMatchObject({
      userId: 'user-1',
      plan: 'go',
      amountCents: 3999,
      currency: 'BRL',
    });
    expect(updates).toHaveLength(1);
  });

  it('stops renewal while preserving the already-paid access window', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
      billingSubscription: {
        findFirst: async () => ({
          id: 'local-1',
          providerSubscriptionId: 'preapproval-1',
          plan: 'go',
          status: 'active',
          periodStart: new Date(Date.now() - 1_000),
          periodEnd: new Date(Date.now() + 86_400_000),
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data);
        },
      },
    } as unknown as PrismaClient;
    const billing = new PatchGoBilling(prisma, config, undefined, new FakeProvider());

    await billing.cancel('user-1');
    expect(updates.at(-1)).toMatchObject({ status: 'canceled', cancelAtPeriodEnd: true });
  });

  it('grants entitlement only after an approved authorized-payment event', async () => {
    const provider = new FakeProvider();
    provider.payment = {
      id: 'payment-1',
      subscriptionId: 'preapproval-1',
      status: 'approved',
      amountCents: 3_999,
      currency: 'BRL',
      paidAt: new Date('2026-09-24T12:00:00.000Z'),
    };
    provider.subscription = remoteSubscription({
      status: 'active',
      nextPaymentAt: new Date('2026-10-24T12:00:00.000Z'),
    });
    const subscriptionUpdates: Array<Record<string, unknown>> = [];
    const prisma = {
      billingWebhookEvent: {
        findUnique: async () => null,
        create: async () => ({ id: 'webhook-1' }),
        update: async () => undefined,
      },
      billingSubscription: {
        findUnique: async () => ({
          id: 'local-1',
          plan: 'go',
          pendingPlan: null,
          periodStart: null,
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          subscriptionUpdates.push(data);
        },
      },
      billingPayment: { findUnique: async () => null, upsert: async () => undefined },
    } as unknown as PrismaClient;
    const billing = new PatchGoBilling(prisma, config, undefined, provider);

    await billing.handleEvent({
      eventId: 'event-1',
      type: 'authorized_payment',
      resourceId: 'authorized-payment-1',
      action: 'created',
    });

    expect(subscriptionUpdates.at(-1)).toMatchObject({
      plan: 'go',
      status: 'active',
      periodStart: new Date('2026-09-24T12:00:00.000Z'),
      periodEnd: new Date('2026-10-24T12:00:00.000Z'),
    });
  });

  it('deduplicates a processed webhook before calling Mercado Pago again', async () => {
    const provider = new FakeProvider();
    const prisma = {
      billingWebhookEvent: { findUnique: async () => ({ status: 'processed' }) },
    } as unknown as PrismaClient;
    const billing = new PatchGoBilling(prisma, config, undefined, provider);

    await billing.handleEvent({
      eventId: 'event-1',
      type: 'authorized_payment',
      resourceId: 'authorized-payment-1',
      action: 'created',
    });

    expect(provider.authorizedPaymentReads).toBe(0);
  });

  it('reports AI cost percentiles and unpriced operations', async () => {
    const prisma = {
      patchAiUsage: {
        findMany: async () => [
          { userId: 'a', plan: 'go', costBrlMicros: 2_000_000n },
          { userId: 'b', plan: 'go', costBrlMicros: 7_000_000n },
          { userId: 'b', plan: 'go', costBrlMicros: null },
        ],
      },
    } as unknown as PrismaClient;
    const report = await new PatchGoBilling(
      prisma,
      config,
      undefined,
      new FakeProvider(),
    ).aiCostReport();
    expect(report.plans.find((plan) => plan.plan === 'go')).toMatchObject({
      usersWithPricedUsage: 2,
      unpricedOperations: 1,
      p50Brl: 2,
      p95Brl: 7,
    });
  });
});
