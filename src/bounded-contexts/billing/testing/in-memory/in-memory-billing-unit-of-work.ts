import {
  type BillingStorePort,
  BillingUnitOfWorkPort,
} from '../../domain/ports/billing-store.port';
import type { InMemoryBillingStore } from './in-memory-billing-store.repository';

type StoreSnapshot = Omit<InMemoryBillingStore, 'sequence'> & { sequence: number };

export class InMemoryBillingUnitOfWork extends BillingUnitOfWorkPort {
  constructor(private readonly store: InMemoryBillingStore) {
    super();
  }

  async execute<T>(operation: (store: BillingStorePort) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(this.store) as StoreSnapshot;
    try {
      return await operation(this.store);
    } catch (error) {
      this.restore(snapshot);
      throw error;
    }
  }

  private restore(snapshot: StoreSnapshot): void {
    this.replaceMap(this.store.emails, snapshot.emails);
    this.replaceMap(this.store.purchases, snapshot.purchases);
    this.replaceMap(this.store.subscriptions, snapshot.subscriptions);
    this.replaceMap(this.store.entitlements, snapshot.entitlements);
    this.replaceMap(this.store.sessions, snapshot.sessions);
    this.replaceMap(this.store.preparation, snapshot.preparation);
    this.replaceMap(this.store.translations, snapshot.translations);
    this.replaceMap(this.store.webhooks, snapshot.webhooks);
    this.replaceArray(this.store.credits, snapshot.credits);
    this.replaceArray(this.store.outbox, snapshot.outbox);
    this.replaceArray(this.store.payments, snapshot.payments);
    this.store.sequence = snapshot.sequence;
  }

  private replaceMap<K, V>(target: Map<K, V>, source: Map<K, V>): void {
    target.clear();
    for (const [key, value] of source) target.set(key, value);
  }

  private replaceArray<T>(target: T[], source: T[]): void {
    target.splice(0, target.length, ...source);
  }
}
