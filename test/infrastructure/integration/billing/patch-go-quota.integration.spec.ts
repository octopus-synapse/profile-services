import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PATCH_PLAN_LIMITS } from '@/bounded-contexts/billing';
import { ManageBillingAccessUseCase } from '@/bounded-contexts/billing/application/use-cases/access/manage-billing-access.use-case';
import { GetBillingStatusUseCase } from '@/bounded-contexts/billing/application/use-cases/status/get-billing-status.use-case';
import {
  PatchGoLimitReachedException,
  PatchGoRequiredException,
} from '@/bounded-contexts/billing/domain/exceptions/billing.exceptions';
import { PrismaBillingStore } from '@/bounded-contexts/billing/infrastructure/adapters/persistence/prisma-billing-store.repository';
import { SystemBillingClock } from '@/bounded-contexts/billing/infrastructure/adapters/security/system-billing-runtime.adapter';
import { freshInDbUser } from '../../shared';
import { closeApp, getApp, getPrisma } from '../setup';

const EXTRA_CALLS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const config = {
  enabled: true,
  cardEnabled: true,
  pixEnabled: true,
  ordersPublicKey: 'TEST-orders-public',
  subscriptionsPublicKey: 'TEST-subscriptions-public',
  aiCostBrlPerUsd: 5.5,
  frontendUrl: 'https://patchcareers.org',
} as const;

function buildBilling(prisma: ReturnType<typeof getPrisma>) {
  const store = new PrismaBillingStore(prisma);
  const clock = new SystemBillingClock();
  const access = new ManageBillingAccessUseCase(store, config, clock);
  return { access, status: new GetBillingStatusUseCase(store, access, config, clock) };
}

describe('Patch Go billing period quota', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('admits exactly 50 concurrent Go preparations, refunds a failed one, and expires with the cycle', async () => {
    const app = await getApp();
    const candidate = await freshInDbUser(app);
    const prisma = getPrisma();
    const periodStart = new Date(Date.now() - DAY_MS);
    const subscription = await prisma.billingSubscription.create({
      data: {
        userId: candidate.userId,
        provider: 'mercado_pago',
        providerSubscriptionId: `preapproval_${randomUUID()}`,
        plan: 'go',
        status: 'active',
        amountCents: 3999,
        currency: 'BRL',
        periodStart,
        periodEnd: new Date(Date.now() + DAY_MS),
      },
    });
    const billing = buildBilling(prisma);

    const outcomes = await Promise.allSettled(
      Array.from({ length: PATCH_PLAN_LIMITS.go + EXTRA_CALLS }, () =>
        billing.access.reserve(candidate.userId),
      ),
    );
    const admitted = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const denied = outcomes.filter((outcome) => outcome.status === 'rejected');
    if (admitted.length === 0 && denied[0]?.status === 'rejected') throw denied[0].reason;
    expect(admitted).toHaveLength(PATCH_PLAN_LIMITS.go);
    expect(denied).toHaveLength(EXTRA_CALLS);
    for (const outcome of denied) {
      if (outcome.status === 'rejected') {
        expect(outcome.reason).toBeInstanceOf(PatchGoLimitReachedException);
      }
    }
    expect((await billing.status.execute(candidate.userId)).used).toBe(PATCH_PLAN_LIMITS.go);

    const first = admitted[0];
    if (first?.status !== 'fulfilled') throw new Error('No preparation was admitted');
    await billing.access.release(first.value);
    expect((await billing.status.execute(candidate.userId)).used).toBe(PATCH_PLAN_LIMITS.go - 1);
    expect(await billing.access.reserve(candidate.userId)).toBeTruthy();

    await prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: { periodEnd: new Date(Date.now() - 1000) },
    });
    expect((await billing.status.execute(candidate.userId)).active).toBe(false);
    await expect(billing.access.reserve(candidate.userId)).rejects.toBeInstanceOf(
      PatchGoRequiredException,
    );
  });

  it('admits the 200th Max preparation and rejects the next one', async () => {
    const app = await getApp();
    const candidate = await freshInDbUser(app);
    const prisma = getPrisma();
    const periodStart = new Date(Date.now() - DAY_MS);
    await prisma.billingSubscription.create({
      data: {
        userId: candidate.userId,
        provider: 'mercado_pago',
        providerSubscriptionId: `preapproval_${randomUUID()}`,
        plan: 'max',
        status: 'active',
        amountCents: 15000,
        currency: 'BRL',
        periodStart,
        periodEnd: new Date(Date.now() + DAY_MS),
      },
    });
    await prisma.patchGoUsage.create({
      data: { userId: candidate.userId, periodStart, count: 199 },
    });
    const billing = buildBilling(prisma).access;
    expect(await billing.reserve(candidate.userId)).toBeTruthy();
    await expect(billing.reserve(candidate.userId)).rejects.toBeInstanceOf(
      PatchGoLimitReachedException,
    );
  });

  it('admits 20 concurrent Free translations and returns a failed action', async () => {
    const app = await getApp();
    const candidate = await freshInDbUser(app);
    const billing = buildBilling(getPrisma()).access;
    const outcomes = await Promise.allSettled(
      Array.from({ length: 25 }, () => billing.reserveFreeTranslation(candidate.userId)),
    );
    const admitted = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    expect(admitted).toHaveLength(20);
    expect(await billing.freeTranslationRemaining(candidate.userId)).toBe(0);
    const first = admitted[0];
    if (first?.status !== 'fulfilled') throw new Error('No translation was admitted');
    await billing.releaseFreeTranslation(first.value);
    expect(await billing.freeTranslationRemaining(candidate.userId)).toBe(1);
    await expect(billing.reserveFreeTranslation(candidate.userId)).resolves.toBeTruthy();
  });
});
