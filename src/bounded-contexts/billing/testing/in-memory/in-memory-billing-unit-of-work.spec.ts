import { describe, expect, it } from 'bun:test';
import { BillingPurchase } from '../../domain/entities/billing-purchase.entity';
import { InMemoryBillingStore } from './in-memory-billing-store.repository';
import { InMemoryBillingUnitOfWork } from './in-memory-billing-unit-of-work';

describe('InMemoryBillingUnitOfWork', () => {
  it('rolls repository state back when an operation fails', async () => {
    const store = new InMemoryBillingStore();
    const unit = new InMemoryBillingUnitOfWork(store);
    const purchase = BillingPurchase.create({
      id: 'purchase-1',
      userId: 'user-1',
      subscriptionId: null,
      offerCode: 'go_pix_year',
      plan: 'go',
      kind: 'pix_prepaid',
      amountCents: 4990,
      listAmountCents: 5988,
      prorationCreditCents: 0,
      creditAppliedCents: 0,
      currency: 'BRL',
      termMonths: 12,
      externalReference: 'patch:purchase-1',
      expiresAt: new Date('2026-09-24T13:00:00Z'),
    });

    await expect(
      unit.execute(async (tx) => {
        await tx.savePurchase(purchase);
        await tx.appendEvents(purchase.pullEvents());
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    expect(store.purchases.size).toBe(0);
    expect(store.outbox).toHaveLength(0);
  });
});
