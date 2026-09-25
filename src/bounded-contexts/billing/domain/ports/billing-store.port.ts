import type { DomainEvent } from '@/shared-kernel';
import type { BillingEntitlementState } from '../entities/billing-entitlement.entity';
import type {
  BillingPurchase,
  BillingPurchaseState,
  PurchaseStatus,
} from '../entities/billing-purchase.entity';
import type { PaidPatchPlan } from '../policies/billing-offer.policy';

export interface BillingSubscriptionRecord {
  readonly id: string;
  readonly userId: string;
  readonly providerSubscriptionId: string | null;
  readonly providerPayerId: string | null;
  readonly providerVersion: number | null;
  readonly plan: PaidPatchPlan;
  readonly pendingPlan: PaidPatchPlan | null;
  readonly status: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly periodStart: Date | null;
  readonly periodEnd: Date | null;
  readonly nextPaymentAt: Date | null;
  readonly cancelAtPeriodEnd: boolean;
}

export interface BillingPaymentRecord {
  readonly id: string;
  readonly status: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly paidAt: Date | null;
  readonly periodStart: Date | null;
  readonly periodEnd: Date | null;
}

export interface PaymentMethodSessionRecord {
  readonly id: string;
  readonly subscriptionId: string;
  readonly tokenHash: string;
  readonly returnUrl: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly plan: PaidPatchPlan;
  readonly providerSubscriptionId: string | null;
}

export interface BillingOutboxRecord {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly schemaVersion: number;
  readonly payload: unknown;
  readonly occurredAt: Date;
  readonly attempts: number;
}

export abstract class BillingStorePort {
  abstract findCustomerEmail(userId: string): Promise<string | null>;
  abstract findActiveEntitlement(userId: string, at: Date): Promise<BillingEntitlementState | null>;
  abstract findCurrentSubscription(
    userId: string,
    at: Date,
  ): Promise<BillingSubscriptionRecord | null>;
  abstract findSubscriptionByProviderId(
    providerId: string,
  ): Promise<BillingSubscriptionRecord | null>;
  abstract findPurchase(id: string, userId?: string): Promise<BillingPurchaseState | null>;
  abstract findPurchaseByProvider(
    orderId: string,
    externalReference?: string | null,
  ): Promise<BillingPurchaseState | null>;
  abstract findPurchaseBySubscriptionProvider(
    providerSubscriptionId: string,
  ): Promise<BillingPurchaseState | null>;
  abstract findPurchaseByPaymentProvider(
    providerPaymentId: string,
  ): Promise<BillingPurchaseState | null>;
  abstract findOpenPurchase(userId: string, at: Date): Promise<BillingPurchaseState | null>;
  abstract savePurchase(purchase: BillingPurchase): Promise<void>;
  abstract createSubscription(
    userId: string,
    plan: PaidPatchPlan,
    amountCents: number,
  ): Promise<BillingSubscriptionRecord>;
  abstract updateSubscription(record: BillingSubscriptionRecord): Promise<void>;
  abstract createEntitlement(record: BillingEntitlementState): Promise<void>;
  abstract updateEntitlement(record: BillingEntitlementState): Promise<void>;
  abstract findReplacedEntitlement(
    userId: string,
    terminatedAt: Date | null,
  ): Promise<BillingEntitlementState | null>;
  abstract creditBalance(userId: string): Promise<number>;
  abstract appendCredit(input: {
    userId: string;
    purchaseId: string;
    amountCents: number;
    reason: string;
    reference: string;
  }): Promise<void>;
  abstract founderReserved(offerCode: string, at: Date): Promise<number>;
  abstract preparationUsed(userId: string, periodStart: Date): Promise<number>;
  abstract reservePreparation(userId: string, periodStart: Date, limit: number): Promise<boolean>;
  abstract releasePreparation(userId: string, periodStart: Date): Promise<void>;
  abstract freeTranslationUsed(userId: string, monthStart: Date): Promise<number>;
  abstract reserveFreeTranslation(
    userId: string,
    monthStart: Date,
    count: number,
    limit: number,
  ): Promise<boolean>;
  abstract releaseFreeTranslation(userId: string, monthStart: Date, count: number): Promise<void>;
  abstract recordAiUsage(input: {
    userId: string;
    operation: string;
    plan: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsdMicros: bigint | null;
    costBrlMicros: bigint | null;
  }): Promise<void>;
  abstract createPaymentMethodSession(input: {
    subscriptionId: string;
    tokenHash: string;
    returnUrl: string;
    expiresAt: Date;
  }): Promise<void>;
  abstract findPaymentMethodSession(tokenHash: string): Promise<PaymentMethodSessionRecord | null>;
  abstract consumePaymentMethodSession(id: string, at: Date): Promise<boolean>;
  abstract listPayments(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: BillingPaymentRecord[]; total: number }>;
  abstract claimWebhook(input: {
    providerEventId: string;
    type: string;
    resourceId: string;
  }): Promise<string | null>;
  abstract completeWebhook(id: string, error?: string): Promise<void>;
  abstract saveProviderPayment(input: {
    subscriptionId: string;
    providerPaymentId: string;
    status: string;
    amountCents: number;
    currency: string;
    paidAt: Date | null;
    periodStart: Date | null;
    periodEnd: Date | null;
  }): Promise<void>;
  abstract listSubscriptionsForReconciliation(limit: number): Promise<BillingSubscriptionRecord[]>;
  abstract listPurchasesForReconciliation(limit: number): Promise<BillingPurchaseState[]>;
  abstract appendEvents(events: readonly DomainEvent[]): Promise<void>;
  abstract listPendingOutbox(limit: number): Promise<BillingOutboxRecord[]>;
  abstract markOutboxPublished(id: string): Promise<void>;
  abstract markOutboxFailed(id: string, error: string): Promise<void>;
}

export abstract class BillingUnitOfWorkPort {
  abstract execute<T>(operation: (store: BillingStorePort) => Promise<T>): Promise<T>;
}

export function isTerminalPurchase(status: PurchaseStatus): boolean {
  return ['approved', 'refunded', 'charged_back', 'expired'].includes(status);
}
