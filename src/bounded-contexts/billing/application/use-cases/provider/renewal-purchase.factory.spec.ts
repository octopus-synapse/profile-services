import { describe, expect, it } from 'bun:test';
import { createRenewalPurchase } from './renewal-purchase.factory';

describe('createRenewalPurchase', () => {
  it('uses the pending plan when a scheduled downgrade renews', () => {
    const purchase = createRenewalPurchase(
      {
        id: 'sub-1',
        userId: 'user-1',
        providerSubscriptionId: 'provider-sub-1',
        providerPayerId: 'payer',
        providerVersion: 1,
        plan: 'max',
        pendingPlan: 'go',
        status: 'active',
        amountCents: 3_999,
        currency: 'BRL',
        periodStart: new Date('2026-09-24T12:00:00Z'),
        periodEnd: new Date('2026-10-24T12:00:00Z'),
        nextPaymentAt: new Date('2026-10-24T12:00:00Z'),
        cancelAtPeriodEnd: false,
      },
      'purchase-1',
      'payment-1',
      new Date('2026-10-24T12:00:00Z'),
      3_999,
    );

    expect(purchase.snapshot).toMatchObject({
      offerCode: 'go_card_month',
      plan: 'go',
      amountCents: 3_999,
    });
  });
});
