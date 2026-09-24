import { describe, expect, it } from 'bun:test';
import { BillingPurchase } from './billing-purchase.entity';

const base = () => ({
  id: 'purchase-1',
  userId: 'user-1',
  subscriptionId: null,
  offerCode: 'go_pix_quarter' as const,
  plan: 'go' as const,
  kind: 'pix_prepaid' as const,
  amountCents: 10_990,
  listAmountCents: 11_997,
  prorationCreditCents: 0,
  creditAppliedCents: 0,
  currency: 'BRL' as const,
  termMonths: 3,
  externalReference: 'patch:purchase-1',
  expiresAt: new Date('2026-10-01T00:30:00Z'),
});

describe('BillingPurchase', () => {
  it('records creation and approval exactly once', () => {
    const purchase = BillingPurchase.create(base());
    expect(purchase.pullEvents().map((event) => event.eventType)).toEqual([
      'billing.purchase-created',
    ]);
    purchase.approve('payment-1', new Date('2026-10-01T00:00:00Z'));
    purchase.approve('payment-1', new Date('2026-10-01T00:00:00Z'));
    expect(purchase.snapshot.status).toBe('approved');
    expect(purchase.pullEvents().map((event) => event.eventType)).toEqual([
      'billing.purchase-approved',
    ]);
  });

  it('reverses only an approved purchase', () => {
    const purchase = BillingPurchase.create(base());
    purchase.pullEvents();
    expect(() => purchase.reverse('refunded')).toThrow();
    purchase.approve('payment-1', new Date());
    purchase.pullEvents();
    purchase.reverse('refunded');
    expect(purchase.snapshot.status).toBe('refunded');
    expect(purchase.pullEvents()[0]?.eventId).toBeTruthy();
  });
});
