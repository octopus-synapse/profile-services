import { describe, expect, it } from 'bun:test';
import { type DomainEvent, EventBusPort } from '@/shared-kernel';
import { BillingPurchase } from '../../../domain/entities/billing-purchase.entity';
import { InMemoryBillingStore } from '../../../testing/in-memory/in-memory-billing-store.repository';
import { PublishBillingOutboxUseCase } from './publish-billing-outbox.use-case';

class RecordingBus extends EventBusPort {
  readonly events: DomainEvent[] = [];
  publish<T extends DomainEvent>(event: T) {
    this.events.push(event);
  }
  async publishAsync<T extends DomainEvent>(event: T) {
    this.events.push(event);
  }
  on() {}
}

describe('PublishBillingOutboxUseCase', () => {
  it('rehydrates stable event metadata and marks delivery', async () => {
    const store = new InMemoryBillingStore();
    const bus = new RecordingBus();
    const purchase = BillingPurchase.create({
      id: 'purchase-1',
      userId: 'user-1',
      subscriptionId: null,
      offerCode: 'go_pix_quarter',
      plan: 'go',
      kind: 'pix_prepaid',
      amountCents: 10_990,
      listAmountCents: 11_997,
      prorationCreditCents: 0,
      creditAppliedCents: 0,
      currency: 'BRL',
      termMonths: 3,
      externalReference: 'patch:purchase-1',
      expiresAt: new Date(),
    });
    const [original] = purchase.pullEvents();
    await store.appendEvents([original!]);
    expect(await new PublishBillingOutboxUseCase(store, bus).execute()).toBe(1);
    expect(bus.events[0]?.eventId).toBe(original?.eventId);
    expect(store.outbox).toHaveLength(0);
  });
});
