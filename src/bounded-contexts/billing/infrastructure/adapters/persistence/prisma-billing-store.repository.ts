import type { DomainEvent } from '@/shared-kernel';
import type { PrismaLikeClient } from '@/shared-kernel/persistence/prisma-types';
import type { BillingEntitlementState } from '../../../domain/entities/billing-entitlement.entity';
import type { BillingPurchase } from '../../../domain/entities/billing-purchase.entity';
import type { PaidPatchPlan } from '../../../domain/policies/billing-offer.policy';
import {
  type BillingOutboxRecord,
  type BillingPaymentRecord,
  BillingStorePort,
  type BillingSubscriptionRecord,
  type PaymentMethodSessionRecord,
} from '../../../domain/ports/billing-store.port';
import { PrismaBillingCoreRepository } from './prisma-billing-core.repository';
import { PrismaBillingEventsRepository } from './prisma-billing-events.repository';
import { PrismaBillingOperationsRepository } from './prisma-billing-operations.repository';

export class PrismaBillingStore extends BillingStorePort {
  private readonly core: PrismaBillingCoreRepository;
  private readonly operations: PrismaBillingOperationsRepository;
  private readonly events: PrismaBillingEventsRepository;
  constructor(prisma: PrismaLikeClient) {
    super();
    this.core = new PrismaBillingCoreRepository(prisma);
    this.operations = new PrismaBillingOperationsRepository(prisma);
    this.events = new PrismaBillingEventsRepository(prisma);
  }
  findCustomerEmail(userId: string) {
    return this.core.findCustomerEmail(userId);
  }
  findActiveEntitlement(userId: string, at: Date) {
    return this.core.findActiveEntitlement(userId, at);
  }
  findCurrentSubscription(userId: string, at: Date) {
    return this.core.findCurrentSubscription(userId, at);
  }
  findSubscriptionByProviderId(id: string) {
    return this.core.findSubscriptionByProviderId(id);
  }
  findPurchase(id: string, userId?: string) {
    return this.core.findPurchase(id, userId);
  }
  findPurchaseByProvider(id: string, ref?: string | null) {
    return this.core.findPurchaseByProvider(id, ref);
  }
  findPurchaseBySubscriptionProvider(id: string) {
    return this.core.findPurchaseBySubscriptionProvider(id);
  }
  findPurchaseByPaymentProvider(id: string) {
    return this.core.findPurchaseByPaymentProvider(id);
  }
  findOpenPurchase(userId: string, at: Date) {
    return this.core.findOpenPurchase(userId, at);
  }
  savePurchase(purchase: BillingPurchase) {
    return this.core.savePurchase(purchase);
  }
  createSubscription(userId: string, plan: PaidPatchPlan, amount: number) {
    return this.core.createSubscription(userId, plan, amount);
  }
  updateSubscription(record: BillingSubscriptionRecord) {
    return this.core.updateSubscription(record);
  }
  createEntitlement(record: BillingEntitlementState) {
    return this.core.createEntitlement(record);
  }
  updateEntitlement(record: BillingEntitlementState) {
    return this.core.updateEntitlement(record);
  }
  findReplacedEntitlement(userId: string, at: Date | null) {
    return this.core.findReplacedEntitlement(userId, at);
  }
  creditBalance(userId: string) {
    return this.operations.creditBalance(userId);
  }
  appendCredit(input: {
    userId: string;
    purchaseId: string;
    amountCents: number;
    reason: string;
    reference: string;
  }) {
    return this.operations.appendCredit(input);
  }
  founderReserved(code: string, at: Date) {
    return this.operations.founderReserved(code, at);
  }
  preparationUsed(userId: string, start: Date) {
    return this.operations.preparationUsed(userId, start);
  }
  reservePreparation(userId: string, start: Date, limit: number) {
    return this.operations.reservePreparation(userId, start, limit);
  }
  releasePreparation(userId: string, start: Date) {
    return this.operations.releasePreparation(userId, start);
  }
  freeTranslationUsed(userId: string, start: Date) {
    return this.operations.freeTranslationUsed(userId, start);
  }
  reserveFreeTranslation(userId: string, start: Date, count: number, limit: number) {
    return this.operations.reserveFreeTranslation(userId, start, count, limit);
  }
  releaseFreeTranslation(userId: string, start: Date, count: number) {
    return this.operations.releaseFreeTranslation(userId, start, count);
  }
  recordAiUsage(input: Parameters<PrismaBillingOperationsRepository['recordAiUsage']>[0]) {
    return this.operations.recordAiUsage(input);
  }
  createPaymentMethodSession(
    input: Parameters<PrismaBillingOperationsRepository['createPaymentMethodSession']>[0],
  ) {
    return this.operations.createPaymentMethodSession(input);
  }
  findPaymentMethodSession(hash: string): Promise<PaymentMethodSessionRecord | null> {
    return this.operations.findPaymentMethodSession(hash);
  }
  consumePaymentMethodSession(id: string, at: Date) {
    return this.operations.consumePaymentMethodSession(id, at);
  }
  listPayments(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: BillingPaymentRecord[]; total: number }> {
    return this.operations.listPayments(userId, page, limit);
  }
  saveProviderPayment(
    input: Parameters<PrismaBillingOperationsRepository['saveProviderPayment']>[0],
  ) {
    return this.operations.saveProviderPayment(input);
  }
  claimWebhook(input: { providerEventId: string; type: string; resourceId: string }) {
    return this.events.claimWebhook(input);
  }
  completeWebhook(id: string, error?: string) {
    return this.events.completeWebhook(id, error);
  }
  listSubscriptionsForReconciliation(limit: number) {
    return this.events.listSubscriptionsForReconciliation(limit);
  }
  listPurchasesForReconciliation(limit: number) {
    return this.events.listPurchasesForReconciliation(limit);
  }
  appendEvents(events: readonly DomainEvent[]) {
    return this.events.appendEvents(events);
  }
  listPendingOutbox(limit: number): Promise<BillingOutboxRecord[]> {
    return this.events.listPendingOutbox(limit);
  }
  markOutboxPublished(id: string) {
    return this.events.markOutboxPublished(id);
  }
  markOutboxFailed(id: string, error: string) {
    return this.events.markOutboxFailed(id, error);
  }
}
