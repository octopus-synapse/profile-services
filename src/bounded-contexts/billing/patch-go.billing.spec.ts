import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@prisma/client';
import Elysia from 'elysia';
import Stripe from 'stripe';
import type { EnvConfig } from '@/shared-kernel/config/config.schema';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { PatchGoBilling } from './patch-go.billing';
import { PatchGoLimitReachedException, PatchGoRequiredException } from './patch-go.exceptions';
import { registerPatchGoWebhook } from './patch-go.webhook';

const config = {
  PATCH_GO_ENABLED: true,
  STRIPE_SECRET_KEY: 'sk_test_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  STRIPE_PRICE_BRL_MONTHLY: 'price_brl',
  STRIPE_PRICE_USD_MONTHLY: 'price_usd',
  FRONTEND_URL: 'https://patchcareers.org',
} satisfies Pick<
  EnvConfig,
  | 'PATCH_GO_ENABLED'
  | 'STRIPE_SECRET_KEY'
  | 'STRIPE_WEBHOOK_SECRET'
  | 'STRIPE_PRICE_BRL_MONTHLY'
  | 'STRIPE_PRICE_USD_MONTHLY'
  | 'FRONTEND_URL'
>;

describe('PatchGoBilling', () => {
  it('verifies the exact Stripe webhook body before accepting it', async () => {
    const billing = new PatchGoBilling({} as PrismaClient, config);
    const payload = JSON.stringify({ id: 'evt_test', type: 'customer.subscription.updated' });
    const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: config.STRIPE_WEBHOOK_SECRET,
    });
    expect((await billing.constructEvent(payload, signature)).id).toBe('evt_test');
    await expect(billing.constructEvent(`${payload} `, signature)).rejects.toThrow();
  });

  it('does not grant access when the local subscription is absent', async () => {
    const prisma = {
      $queryRaw: async () => [],
      patchGoBilling: { findUnique: async () => null },
    } as unknown as PrismaClient;
    const billing = new PatchGoBilling(prisma, config);
    await expect(billing.reserve('user-1')).rejects.toBeInstanceOf(PatchGoRequiredException);
  });

  it('rejects the 31st preparation while the subscription remains active', async () => {
    const prisma = {
      $queryRaw: async () => [],
      patchGoBilling: {
        findUnique: async () => ({
          status: 'active',
          periodStart: new Date(Date.now() - 1000),
          periodEnd: new Date(Date.now() + 60_000),
        }),
      },
    } as unknown as PrismaClient;
    await expect(new PatchGoBilling(prisma, config).reserve('user-1')).rejects.toBeInstanceOf(
      PatchGoLimitReachedException,
    );
  });

  it('ignores a late deletion from a different subscription', async () => {
    let updates = 0;
    const prisma = {
      patchGoBilling: {
        findUnique: async ({ where }: { where: { userId?: string } }) =>
          where.userId
            ? {
                stripeSubscriptionId: 'sub_current',
                status: 'active',
                periodStart: new Date(Date.now() - 1000),
                periodEnd: new Date(Date.now() + 60_000),
              }
            : null,
        upsert: async () => {
          updates++;
        },
      },
      user: { findUnique: async () => ({ id: 'user-1' }) },
    } as unknown as PrismaClient;
    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_old',
          customer: 'cus_1',
          metadata: { userId: 'user-1' },
          status: 'canceled',
          items: { data: [{ price: { id: config.STRIPE_PRICE_BRL_MONTHLY } }] },
        },
      },
    } as unknown as Stripe.Event;
    await new PatchGoBilling(prisma, config).handleEvent(event);
    expect(updates).toBe(0);
  });

  it('accepts only a signed, unmodified webhook payload through Elysia', async () => {
    const billing = new PatchGoBilling({} as PrismaClient, config);
    const app = new Elysia();
    registerPatchGoWebhook(app, billing, stubLogger);
    const payload = '{ "id": "evt_test", "type": "ping" }';
    const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: config.STRIPE_WEBHOOK_SECRET,
    });
    const makeRequest = (body: string) =>
      app.handle(
        new Request('http://localhost/api/v1/billing/stripe-webhook', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'stripe-signature': signature },
          body,
        }),
      );
    const valid = await makeRequest(payload);
    expect(valid.status).toBe(200);
    expect(await valid.json()).toEqual({ received: true });
    const changed = await makeRequest(payload.replace('ping', 'pong'));
    expect(changed.status).toBe(400);
  });
});
