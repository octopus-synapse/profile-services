import {
  BillingEntitlement,
  type BillingEntitlementState,
} from '../../../domain/entities/billing-entitlement.entity';
import { BillingPurchase } from '../../../domain/entities/billing-purchase.entity';
import { PATCH_BILLING_OFFERS } from '../../../domain/policies/billing-offer.policy';
import type { BillingStorePort } from '../../../domain/ports/billing-store.port';
import { BillingUnitOfWorkPort } from '../../../domain/ports/billing-store.port';
import type {
  PaymentProviderPort,
  ProviderOrder,
  ProviderPayment,
  ProviderSubscription,
  ProviderWebhookEvent,
} from '../../../domain/ports/payment-provider.port';
import { BillingClockPort, BillingIdPort } from '../../ports/billing-runtime.port';
import { createRenewalPurchase } from './renewal-purchase.factory';

export class ProcessProviderEventUseCase {
  constructor(
    private readonly store: BillingStorePort,
    private readonly unit: BillingUnitOfWorkPort,
    private readonly provider: PaymentProviderPort,
    private readonly ids: BillingIdPort,
    private readonly clock: BillingClockPort,
    private readonly logger?: LoggerPort,
  ) {}

  async execute(event: ProviderWebhookEvent): Promise<void> {
    if (event.type === 'ignored' || event.type === 'payment') return;
    const claimed = await this.store.claimWebhook({
      providerEventId: event.eventId,
      type: event.type,
      resourceId: event.resourceId,
    });
    if (!claimed) return;
    try {
      if (event.type === 'subscription')
        await this.syncSubscription(await this.provider.getSubscription(event.resourceId));
      if (event.type === 'authorized_payment')
        await this.syncPayment(await this.provider.getAuthorizedPayment(event.resourceId));
      if (event.type === 'order')
        await this.syncOrder(await this.provider.getOrder(event.resourceId));
      await this.store.completeWebhook(claimed);
    } catch (error) {
      this.logger?.error('Billing webhook processing failed', {
        context: 'ProcessProviderEventUseCase',
        eventId: event.eventId,
      });
      await this.store.completeWebhook(claimed, error instanceof Error ? error.message : 'unknown');
      throw error;
    }
  }

  async syncSubscription(remote: ProviderSubscription): Promise<void> {
    const local = await this.store.findSubscriptionByProviderId(remote.id);
    if (
      !local ||
      remote.currency !== 'BRL' ||
      (local.providerVersion ?? -1) > (remote.version ?? 0)
    )
      return;
    const now = this.clock.now();
    const active = remote.status === 'active';
    const pendingPlan =
      local.plan === 'max' && remote.amountCents === PATCH_BILLING_OFFERS.go_card_month.amountCents
        ? 'go'
        : local.plan === 'max' &&
            remote.amountCents === PATCH_BILLING_OFFERS.max_card_month.amountCents
          ? null
          : local.pendingPlan;
    await this.store.updateSubscription({
      ...local,
      providerPayerId: remote.payerId,
      providerVersion: remote.version,
      status: remote.status,
      pendingPlan,
      amountCents: remote.amountCents,
      currency: remote.currency,
      periodStart: active ? (local.periodStart ?? now) : local.periodStart,
      periodEnd: active
        ? local.periodEnd && local.periodEnd > now
          ? local.periodEnd
          : this.addMonths(now, 1)
        : local.periodEnd,
      nextPaymentAt: remote.nextPaymentAt,
    });
  }

  async syncPayment(remote: ProviderPayment): Promise<void> {
    const subscription = await this.store.findSubscriptionByProviderId(remote.subscriptionId);
    if (!subscription || remote.currency !== 'BRL') return;
    const paidAt = remote.paidAt ?? this.clock.now();
    const end = this.addMonths(paidAt, 1);
    await this.store.saveProviderPayment({
      subscriptionId: subscription.id,
      providerPaymentId: remote.id,
      status: remote.status,
      amountCents: remote.amountCents,
      currency: remote.currency,
      paidAt: remote.paidAt,
      periodStart: remote.status === 'approved' ? paidAt : null,
      periodEnd: remote.status === 'approved' ? end : null,
    });
    let purchase = await this.store.findPurchaseByPaymentProvider(remote.id);
    purchase ??= await this.store.findPurchaseBySubscriptionProvider(remote.subscriptionId);
    if (remote.status === 'approved') {
      const renewalPlan = subscription.pendingPlan ?? subscription.plan;
      const expectedAmount = PATCH_BILLING_OFFERS[`${renewalPlan}_card_month`].amountCents;
      if (remote.amountCents !== expectedAmount) return;
      if (!purchase || purchase.status === 'approved')
        purchase = await this.createRenewalPurchase(
          subscription,
          remote.id,
          paidAt,
          remote.amountCents,
        );
      await this.approve(purchase.id, remote.id, paidAt);
      await this.store.updateSubscription({
        ...subscription,
        plan: renewalPlan,
        pendingPlan: null,
        status: 'active',
        amountCents: expectedAmount,
        periodStart: paidAt,
        periodEnd: end,
        nextPaymentAt: end,
      });
    } else if ((remote.status === 'refunded' || remote.status === 'charged_back') && purchase) {
      await this.reverse(purchase.id, remote.status);
    }
  }

  async syncOrder(remote: ProviderOrder): Promise<void> {
    const state = await this.store.findPurchaseByProvider(remote.id, remote.externalReference);
    if (
      !state ||
      remote.currency !== state.currency ||
      remote.amountCents !== state.amountCents ||
      remote.externalReference !== state.externalReference
    )
      return;
    const purchase = BillingPurchase.restore(state);
    purchase.attachPix(
      remote.id,
      remote.paymentId,
      remote.qrCode,
      remote.qrCodeBase64,
      remote.ticketUrl,
    );
    await this.unit.execute(async (tx) => {
      await tx.savePurchase(purchase);
      await tx.appendEvents(purchase.pullEvents());
    });
    if (remote.status === 'approved') {
      const subscription = await this.store.findCurrentSubscription(state.userId, this.clock.now());
      if (state.kind === 'card_plan_change' && subscription?.providerSubscriptionId) {
        await this.provider.updateSubscriptionAmount(
          subscription.providerSubscriptionId,
          PATCH_BILLING_OFFERS[state.offerCode].amountCents,
        );
        await this.store.updateSubscription({
          ...subscription,
          plan: state.plan,
          pendingPlan: null,
          amountCents: PATCH_BILLING_OFFERS[state.offerCode].amountCents,
        });
      }
      if (
        state.kind === 'pix_prepaid' &&
        subscription?.providerSubscriptionId &&
        ['active', 'paused'].includes(subscription.status)
      ) {
        await this.provider.cancelSubscription(subscription.providerSubscriptionId);
        await this.store.updateSubscription({
          ...subscription,
          status: 'canceled',
          cancelAtPeriodEnd: true,
        });
      }
      await this.approve(
        state.id,
        remote.paymentId ?? remote.id,
        remote.paidAt ?? this.clock.now(),
      );
    } else if (remote.status === 'refunded' || remote.status === 'charged_back')
      await this.reverse(state.id, remote.status);
    else if (remote.status === 'rejected' || remote.status === 'canceled') {
      purchase.fail(state.expiresAt <= this.clock.now() ? 'expired' : remote.status);
      await this.store.savePurchase(purchase);
    }
  }

  async approve(purchaseId: string, providerPaymentId: string, paidAt: Date): Promise<void> {
    await this.unit.execute(async (tx) => {
      const state = await tx.findPurchase(purchaseId);
      if (!state || state.status === 'approved') return;
      const offer = PATCH_BILLING_OFFERS[state.offerCode];
      const purchase = BillingPurchase.restore(state);
      const current = await tx.findActiveEntitlement(state.userId, paidAt);
      let startsAt = paidAt;
      let quotaAnchorAt = paidAt;
      if (current?.plan === offer.plan) {
        startsAt = current.endsAt > paidAt ? current.endsAt : paidAt;
        quotaAnchorAt = current.quotaAnchorAt;
      } else if (current) {
        const entity = BillingEntitlement.restore(current);
        entity.replace(paidAt);
        await tx.updateEntitlement(entity.snapshot);
        quotaAnchorAt = current.quotaAnchorAt;
        if (state.prorationCreditCents > 0)
          await tx.appendCredit({
            userId: state.userId,
            purchaseId,
            amountCents: state.prorationCreditCents,
            reason: 'proration',
            reference: `proration:${purchaseId}`,
          });
      }
      if (state.creditAppliedCents > 0)
        await tx.appendCredit({
          userId: state.userId,
          purchaseId,
          amountCents: -state.creditAppliedCents,
          reason: 'checkout',
          reference: `checkout:${purchaseId}`,
        });
      const entitlement: BillingEntitlementState = {
        id: this.ids.id(),
        userId: state.userId,
        purchaseId,
        source:
          state.kind === 'pix_prepaid'
            ? 'mercado_pago_pix'
            : state.kind === 'card_plan_change'
              ? 'mercado_pago_card_adjustment'
              : 'mercado_pago_card',
        sourceRef: providerPaymentId,
        plan: offer.plan,
        status: 'active',
        startsAt,
        endsAt:
          state.kind === 'card_plan_change' && current
            ? current.endsAt
            : this.addMonths(startsAt, state.termMonths),
        quotaAnchorAt,
        terminatedAt: null,
      };
      await tx.createEntitlement(entitlement);
      purchase.approve(providerPaymentId, paidAt);
      await tx.savePurchase(purchase);
      await tx.appendEvents(purchase.pullEvents());
    });
  }

  async reverse(purchaseId: string, status: 'refunded' | 'charged_back'): Promise<void> {
    await this.unit.execute(async (tx) => {
      const state = await tx.findPurchase(purchaseId);
      if (!state || state.status === status) return;
      const current = await tx.findActiveEntitlement(state.userId, this.clock.now());
      if (current?.purchaseId === purchaseId) {
        const entity = BillingEntitlement.restore(current);
        entity.revoke(this.clock.now());
        await tx.updateEntitlement(entity.snapshot);
      }
      const replaced = await tx.findReplacedEntitlement(state.userId, state.approvedAt);
      if (replaced) {
        const entity = BillingEntitlement.restore(replaced);
        entity.restore();
        await tx.updateEntitlement(entity.snapshot);
      }
      if (state.prorationCreditCents > 0)
        await tx.appendCredit({
          userId: state.userId,
          purchaseId,
          amountCents: -state.prorationCreditCents,
          reason: status,
          reference: `reversal-proration:${purchaseId}`,
        });
      if (state.creditAppliedCents > 0)
        await tx.appendCredit({
          userId: state.userId,
          purchaseId,
          amountCents: state.creditAppliedCents,
          reason: status,
          reference: `reversal-checkout:${purchaseId}`,
        });
      const purchase = BillingPurchase.restore({
        ...state,
        status: state.status === 'approved' ? 'reversing' : state.status,
      });
      purchase.reverse(status);
      await tx.savePurchase(purchase);
      await tx.appendEvents(purchase.pullEvents());
    });
  }

  private async createRenewalPurchase(
    subscription: Parameters<typeof createRenewalPurchase>[0],
    paymentId: string,
    paidAt: Date,
    amountCents: number,
  ) {
    const purchase = createRenewalPurchase(
      subscription,
      this.ids.id(),
      paymentId,
      paidAt,
      amountCents,
    );
    await this.unit.execute(async (tx) => {
      await tx.savePurchase(purchase);
      await tx.appendEvents(purchase.pullEvents());
    });
    return purchase.snapshot;
  }
  private addMonths(date: Date, months: number): Date {
    const copy = new Date(date);
    copy.setUTCMonth(copy.getUTCMonth() + months);
    return copy;
  }
}

import type { LoggerPort } from '@/shared-kernel';
