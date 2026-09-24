import { DomainEvent } from '@/shared-kernel';
import type { BillingOfferCode, PaidPatchPlan } from '../policies/billing-offer.policy';

export class BillingPurchaseCreatedEvent extends DomainEvent<{
  userId: string;
  offerCode: BillingOfferCode;
  amountCents: number;
}> {
  static readonly TYPE = 'billing.purchase-created';
  constructor(
    id: string,
    payload: { userId: string; offerCode: BillingOfferCode; amountCents: number },
  ) {
    super(BillingPurchaseCreatedEvent.TYPE, id, payload);
  }
}
export class BillingPurchaseApprovedEvent extends DomainEvent<{
  userId: string;
  plan: PaidPatchPlan;
  amountCents: number;
}> {
  static readonly TYPE = 'billing.purchase-approved';
  constructor(id: string, payload: { userId: string; plan: PaidPatchPlan; amountCents: number }) {
    super(BillingPurchaseApprovedEvent.TYPE, id, payload);
  }
}
export class BillingPurchaseReversedEvent extends DomainEvent<{
  userId: string;
  status: 'refunded' | 'charged_back';
}> {
  static readonly TYPE = 'billing.purchase-reversed';
  constructor(id: string, payload: { userId: string; status: 'refunded' | 'charged_back' }) {
    super(BillingPurchaseReversedEvent.TYPE, id, payload);
  }
}
