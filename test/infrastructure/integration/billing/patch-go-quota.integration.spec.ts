import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PatchGoBilling } from '@/bounded-contexts/billing/patch-go.billing';
import { PATCH_GO_MONTHLY_LIMIT } from '@/bounded-contexts/billing/patch-go.constants';
import {
  PatchGoLimitReachedException,
  PatchGoRequiredException,
} from '@/bounded-contexts/billing/patch-go.exceptions';
import { freshInDbUser } from '../../shared';
import { closeApp, getApp, getPrisma } from '../setup';

const EXTRA_CALLS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

describe('Patch Go billing period quota', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('admits exactly 30 concurrent preparations, refunds a failed one, and expires with the cycle', async () => {
    const app = await getApp();
    const candidate = await freshInDbUser(app);
    const prisma = getPrisma();
    const periodStart = new Date(Date.now() - DAY_MS);
    await prisma.patchGoBilling.create({
      data: {
        userId: candidate.userId,
        stripeCustomerId: `cus_${randomUUID()}`,
        stripeSubscriptionId: `sub_${randomUUID()}`,
        priceId: 'price_test',
        status: 'active',
        periodStart,
        periodEnd: new Date(Date.now() + DAY_MS),
      },
    });
    const billing = new PatchGoBilling(prisma, {
      PATCH_GO_ENABLED: true,
      STRIPE_SECRET_KEY: 'sk_test_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_example',
      STRIPE_PRICE_BRL_MONTHLY: 'price_test',
      STRIPE_PRICE_USD_MONTHLY: 'price_usd',
      FRONTEND_URL: 'https://patchcareers.org',
    });

    const outcomes = await Promise.allSettled(
      Array.from({ length: PATCH_GO_MONTHLY_LIMIT + EXTRA_CALLS }, () =>
        billing.reserve(candidate.userId),
      ),
    );
    const admitted = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const denied = outcomes.filter((outcome) => outcome.status === 'rejected');
    expect(admitted).toHaveLength(PATCH_GO_MONTHLY_LIMIT);
    expect(denied).toHaveLength(EXTRA_CALLS);
    for (const outcome of denied) {
      if (outcome.status === 'rejected') {
        expect(outcome.reason).toBeInstanceOf(PatchGoLimitReachedException);
      }
    }
    expect((await billing.status(candidate.userId)).used).toBe(PATCH_GO_MONTHLY_LIMIT);

    const first = admitted[0];
    if (first?.status !== 'fulfilled') throw new Error('No preparation was admitted');
    await billing.release(first.value);
    expect((await billing.status(candidate.userId)).used).toBe(PATCH_GO_MONTHLY_LIMIT - 1);
    await expect(billing.reserve(candidate.userId)).resolves.toBeTruthy();

    await prisma.patchGoBilling.update({
      where: { userId: candidate.userId },
      data: { periodEnd: new Date(Date.now() - 1000) },
    });
    expect((await billing.status(candidate.userId)).active).toBe(false);
    await expect(billing.reserve(candidate.userId)).rejects.toBeInstanceOf(
      PatchGoRequiredException,
    );
  });
});
