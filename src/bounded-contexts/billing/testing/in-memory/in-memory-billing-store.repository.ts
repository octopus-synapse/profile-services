import type { DomainEvent } from '@/shared-kernel';
import type { BillingEntitlementState } from '../../domain/entities/billing-entitlement.entity';
import type {
  BillingPurchase,
  BillingPurchaseState,
} from '../../domain/entities/billing-purchase.entity';
import type { PaidPatchPlan } from '../../domain/policies/billing-offer.policy';
import {
  type BillingOutboxRecord,
  type BillingPaymentRecord,
  BillingStorePort,
  type BillingSubscriptionRecord,
  type PaymentMethodSessionRecord,
} from '../../domain/ports/billing-store.port';

export class InMemoryBillingStore extends BillingStorePort {
  readonly emails = new Map<string, string>();
  readonly purchases = new Map<string, BillingPurchaseState>();
  readonly subscriptions = new Map<string, BillingSubscriptionRecord>();
  readonly entitlements = new Map<string, BillingEntitlementState>();
  readonly credits: Array<{
    userId: string;
    purchaseId: string;
    amountCents: number;
    reason: string;
    reference: string;
  }> = [];
  readonly outbox: BillingOutboxRecord[] = [];
  readonly payments: Array<
    BillingPaymentRecord & { userId: string; providerPaymentId: string; subscriptionId: string }
  > = [];
  readonly sessions = new Map<string, PaymentMethodSessionRecord>();
  readonly preparation = new Map<string, number>();
  readonly translations = new Map<string, number>();
  readonly webhooks = new Map<string, { id: string; status: string }>();
  sequence = 0;

  findCustomerEmail(userId: string) {
    return Promise.resolve(this.emails.get(userId) ?? null);
  }
  findActiveEntitlement(userId: string, at: Date) {
    return Promise.resolve(
      [...this.entitlements.values()].find(
        (x) => x.userId === userId && x.status === 'active' && x.startsAt <= at && x.endsAt > at,
      ) ?? null,
    );
  }
  findReplacedEntitlement(userId: string, terminatedAt: Date | null) {
    return Promise.resolve(
      [...this.entitlements.values()].find(
        (x) =>
          x.userId === userId &&
          x.status === 'replaced' &&
          x.terminatedAt?.getTime() === terminatedAt?.getTime(),
      ) ?? null,
    );
  }
  findCurrentSubscription(userId: string, at: Date) {
    return Promise.resolve(
      [...this.subscriptions.values()]
        .filter((x) => x.userId === userId)
        .sort(
          (a, b) =>
            Number(Boolean(b.periodEnd && b.periodEnd > at)) -
            Number(Boolean(a.periodEnd && a.periodEnd > at)),
        )[0] ?? null,
    );
  }
  findSubscriptionByProviderId(id: string) {
    return Promise.resolve(
      [...this.subscriptions.values()].find((x) => x.providerSubscriptionId === id) ?? null,
    );
  }
  findPurchase(id: string, userId?: string) {
    const row = this.purchases.get(id);
    return Promise.resolve(row && (!userId || row.userId === userId) ? row : null);
  }
  findPurchaseByProvider(id: string, ref?: string | null) {
    return Promise.resolve(
      [...this.purchases.values()].find(
        (x) => x.providerOrderId === id || (ref && x.externalReference === ref),
      ) ?? null,
    );
  }
  findPurchaseBySubscriptionProvider(id: string) {
    return Promise.resolve(
      [...this.purchases.values()].filter((x) => x.providerSubscriptionId === id).at(-1) ?? null,
    );
  }
  findPurchaseByPaymentProvider(id: string) {
    return Promise.resolve(
      [...this.purchases.values()].find((x) => x.providerPaymentId === id) ?? null,
    );
  }
  findOpenPurchase(userId: string, at: Date) {
    return Promise.resolve(
      [...this.purchases.values()].find(
        (x) =>
          x.userId === userId &&
          ((x.status === 'pending' && x.expiresAt > at) ||
            x.status === 'reversing' ||
            (x.status === 'created' && x.expiresAt > at)),
      ) ?? null,
    );
  }
  async savePurchase(purchase: BillingPurchase) {
    this.purchases.set(purchase.snapshot.id, purchase.snapshot);
  }
  async createSubscription(userId: string, plan: PaidPatchPlan, amountCents: number) {
    const row: BillingSubscriptionRecord = {
      id: `sub-${++this.sequence}`,
      userId,
      providerSubscriptionId: null,
      providerPayerId: null,
      providerVersion: null,
      plan,
      pendingPlan: null,
      status: 'creating',
      amountCents,
      currency: 'BRL',
      periodStart: null,
      periodEnd: null,
      nextPaymentAt: null,
      cancelAtPeriodEnd: false,
    };
    this.subscriptions.set(row.id, row);
    return row;
  }
  async updateSubscription(record: BillingSubscriptionRecord) {
    this.subscriptions.set(record.id, record);
  }
  async createEntitlement(record: BillingEntitlementState) {
    this.entitlements.set(record.id, record);
  }
  async updateEntitlement(record: BillingEntitlementState) {
    this.entitlements.set(record.id, record);
  }
  creditBalance(userId: string) {
    return Promise.resolve(
      Math.max(
        0,
        this.credits.filter((x) => x.userId === userId).reduce((sum, x) => sum + x.amountCents, 0),
      ),
    );
  }
  async appendCredit(input: {
    userId: string;
    purchaseId: string;
    amountCents: number;
    reason: string;
    reference: string;
  }) {
    if (!this.credits.some((x) => x.reference === input.reference)) this.credits.push(input);
  }
  founderReserved(code: string, at: Date) {
    return Promise.resolve(
      [...this.purchases.values()].filter(
        (x) =>
          x.offerCode === code &&
          (x.status === 'approved' ||
            (['created', 'pending'].includes(x.status) && x.expiresAt > at)),
      ).length,
    );
  }
  preparationUsed(userId: string, start: Date) {
    return Promise.resolve(this.preparation.get(`${userId}:${start.toISOString()}`) ?? 0);
  }
  async reservePreparation(userId: string, start: Date, limit: number) {
    const key = `${userId}:${start.toISOString()}`;
    const value = this.preparation.get(key) ?? 0;
    if (value >= limit) return false;
    this.preparation.set(key, value + 1);
    return true;
  }
  async releasePreparation(userId: string, start: Date) {
    const key = `${userId}:${start.toISOString()}`;
    this.preparation.set(key, Math.max(0, (this.preparation.get(key) ?? 0) - 1));
  }
  freeTranslationUsed(userId: string, start: Date) {
    return Promise.resolve(this.translations.get(`${userId}:${start.toISOString()}`) ?? 0);
  }
  async reserveFreeTranslation(userId: string, start: Date, count: number, limit: number) {
    const key = `${userId}:${start.toISOString()}`;
    const value = this.translations.get(key) ?? 0;
    if (value + count > limit) return false;
    this.translations.set(key, value + count);
    return true;
  }
  async releaseFreeTranslation(userId: string, start: Date, count: number) {
    const key = `${userId}:${start.toISOString()}`;
    this.translations.set(key, Math.max(0, (this.translations.get(key) ?? 0) - count));
  }
  recordAiUsage() {
    return Promise.resolve();
  }
  async createPaymentMethodSession(input: {
    subscriptionId: string;
    tokenHash: string;
    returnUrl: string;
    expiresAt: Date;
  }) {
    const sub = this.subscriptions.get(input.subscriptionId)!;
    this.sessions.set(input.tokenHash, {
      id: `session-${++this.sequence}`,
      ...input,
      usedAt: null,
      plan: sub.plan,
      providerSubscriptionId: sub.providerSubscriptionId,
    });
  }
  findPaymentMethodSession(hash: string) {
    return Promise.resolve(this.sessions.get(hash) ?? null);
  }
  async consumePaymentMethodSession(id: string, at: Date) {
    const row = [...this.sessions.values()].find(
      (x) => x.id === id && !x.usedAt && x.expiresAt > at,
    );
    if (!row) return false;
    this.sessions.set(row.tokenHash, { ...row, usedAt: at });
    return true;
  }
  listPayments(userId: string, page: number, limit: number) {
    const all = this.payments.filter((x) => x.userId === userId);
    return Promise.resolve({
      items: all.slice((page - 1) * limit, page * limit),
      total: all.length,
    });
  }
  async saveProviderPayment(input: {
    subscriptionId: string;
    providerPaymentId: string;
    status: string;
    amountCents: number;
    currency: string;
    paidAt: Date | null;
    periodStart: Date | null;
    periodEnd: Date | null;
  }) {
    const userId = this.subscriptions.get(input.subscriptionId)?.userId ?? '';
    const row = { id: input.providerPaymentId, userId, ...input };
    const index = this.payments.findIndex((x) => x.providerPaymentId === input.providerPaymentId);
    if (index >= 0) this.payments[index] = row;
    else this.payments.push(row);
  }
  async claimWebhook(input: { providerEventId: string }) {
    if (this.webhooks.has(input.providerEventId)) return null;
    const id = `webhook-${++this.sequence}`;
    this.webhooks.set(input.providerEventId, { id, status: 'processing' });
    return id;
  }
  async completeWebhook(id: string, error?: string) {
    const entry = [...this.webhooks.entries()].find(([, x]) => x.id === id);
    if (entry) this.webhooks.set(entry[0], { id, status: error ? 'failed' : 'processed' });
  }
  listSubscriptionsForReconciliation(limit: number) {
    return Promise.resolve([...this.subscriptions.values()].slice(0, limit));
  }
  listPurchasesForReconciliation(limit: number) {
    return Promise.resolve(
      [...this.purchases.values()].filter((x) => x.providerOrderId).slice(0, limit),
    );
  }
  async appendEvents(events: readonly DomainEvent[]) {
    for (const event of events)
      if (!this.outbox.some((x) => x.eventId === event.eventId))
        this.outbox.push({
          id: `outbox-${++this.sequence}`,
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          schemaVersion: event.schemaVersion,
          payload: event.payload,
          occurredAt: event.occurredAt,
          attempts: 0,
        });
  }
  listPendingOutbox(limit: number) {
    return Promise.resolve(this.outbox.slice(0, limit));
  }
  async markOutboxPublished(id: string) {
    const index = this.outbox.findIndex((x) => x.id === id);
    if (index >= 0) this.outbox.splice(index, 1);
  }
  markOutboxFailed() {
    return Promise.resolve();
  }
}
