import type { DomainEvent } from '@/shared-kernel';
import {
  BillingPurchaseApprovedEvent,
  BillingPurchaseCreatedEvent,
  BillingPurchaseReversedEvent,
} from '../events/billing.events';
import { BillingInvariantException } from '../exceptions/billing.exceptions';
import type { BillingOfferCode, PaidPatchPlan } from '../policies/billing-offer.policy';

export type PurchaseKind = 'card_subscription' | 'card_plan_change' | 'pix_prepaid';
export type PurchaseStatus =
  | 'created'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'canceled'
  | 'expired'
  | 'refunded'
  | 'charged_back'
  | 'reversing';

export interface BillingPurchaseState {
  readonly id: string;
  readonly userId: string;
  readonly subscriptionId: string | null;
  readonly offerCode: BillingOfferCode;
  readonly plan: PaidPatchPlan;
  readonly kind: PurchaseKind;
  readonly status: PurchaseStatus;
  readonly amountCents: number;
  readonly listAmountCents: number;
  readonly prorationCreditCents: number;
  readonly creditAppliedCents: number;
  readonly currency: 'BRL';
  readonly termMonths: number;
  readonly externalReference: string;
  readonly expiresAt: Date;
  readonly providerOrderId: string | null;
  readonly providerPaymentId: string | null;
  readonly providerSubscriptionId: string | null;
  readonly approvedAt: Date | null;
  readonly pixQrCode: string | null;
  readonly pixQrCodeBase64: string | null;
  readonly pixTicketUrl: string | null;
}

export class BillingPurchase {
  private readonly events: DomainEvent[] = [];

  private constructor(private state: BillingPurchaseState) {}

  static create(
    state: Omit<
      BillingPurchaseState,
      | 'status'
      | 'providerOrderId'
      | 'providerPaymentId'
      | 'providerSubscriptionId'
      | 'approvedAt'
      | 'pixQrCode'
      | 'pixQrCodeBase64'
      | 'pixTicketUrl'
    >,
  ): BillingPurchase {
    if (state.amountCents < 0 || state.listAmountCents <= 0)
      throw new BillingInvariantException('purchase-amount');
    const purchase = new BillingPurchase({
      ...state,
      status: 'created',
      providerOrderId: null,
      providerPaymentId: null,
      providerSubscriptionId: null,
      approvedAt: null,
      pixQrCode: null,
      pixQrCodeBase64: null,
      pixTicketUrl: null,
    });
    purchase.events.push(
      new BillingPurchaseCreatedEvent(state.id, {
        userId: state.userId,
        offerCode: state.offerCode,
        amountCents: state.amountCents,
      }),
    );
    return purchase;
  }

  static restore(state: BillingPurchaseState): BillingPurchase {
    return new BillingPurchase(state);
  }

  get snapshot(): BillingPurchaseState {
    return { ...this.state };
  }

  attachOrder(orderId: string, paymentId: string | null): void {
    if (this.state.status === 'approved') return;
    this.state = {
      ...this.state,
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      status: 'pending',
    };
  }

  attachPix(
    orderId: string,
    paymentId: string | null,
    qrCode: string | null,
    qrCodeBase64: string | null,
    ticketUrl: string | null,
  ): void {
    this.state = {
      ...this.state,
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      pixQrCode: qrCode,
      pixQrCodeBase64: qrCodeBase64,
      pixTicketUrl: ticketUrl,
      status: 'pending',
    };
  }

  attachSubscription(subscriptionId: string, providerSubscriptionId: string): void {
    this.state = { ...this.state, subscriptionId, providerSubscriptionId, status: 'pending' };
  }

  approve(providerPaymentId: string, paidAt: Date): void {
    if (this.state.status === 'approved') return;
    if (['refunded', 'charged_back'].includes(this.state.status))
      throw new BillingInvariantException('purchase-terminal');
    this.state = { ...this.state, status: 'approved', providerPaymentId, approvedAt: paidAt };
    this.events.push(
      new BillingPurchaseApprovedEvent(this.state.id, {
        userId: this.state.userId,
        plan: this.state.plan,
        amountCents: this.state.amountCents,
      }),
    );
  }

  reverse(status: 'refunded' | 'charged_back'): void {
    if (this.state.status === status) return;
    if (this.state.status !== 'approved' && this.state.status !== 'reversing')
      throw new BillingInvariantException('purchase-not-approved');
    this.state = { ...this.state, status };
    this.events.push(
      new BillingPurchaseReversedEvent(this.state.id, { userId: this.state.userId, status }),
    );
  }

  fail(status: 'rejected' | 'canceled' | 'expired'): void {
    if (this.state.status === 'approved') throw new BillingInvariantException('purchase-approved');
    this.state = { ...this.state, status };
  }

  pullEvents(): DomainEvent[] {
    return this.events.splice(0);
  }
}
