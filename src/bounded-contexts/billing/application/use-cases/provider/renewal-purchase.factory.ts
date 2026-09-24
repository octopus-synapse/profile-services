import { BillingPurchase } from '../../../domain/entities/billing-purchase.entity';
import type { BillingOfferCode } from '../../../domain/policies/billing-offer.policy';
import type { BillingSubscriptionRecord } from '../../../domain/ports/billing-store.port';

export const createRenewalPurchase = (
  subscription: BillingSubscriptionRecord,
  purchaseId: string,
  paymentId: string,
  paidAt: Date,
): BillingPurchase => {
  const expiresAt = new Date(paidAt);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 1);
  const purchase = BillingPurchase.create({
    id: purchaseId,
    userId: subscription.userId,
    subscriptionId: subscription.id,
    offerCode: `${subscription.plan}_card_month` as BillingOfferCode,
    plan: subscription.plan,
    kind: 'card_subscription',
    amountCents: subscription.amountCents,
    listAmountCents: subscription.amountCents,
    prorationCreditCents: 0,
    creditAppliedCents: 0,
    currency: 'BRL',
    termMonths: 1,
    externalReference: `patch:renewal:${paymentId}`,
    expiresAt,
  });
  purchase.attachSubscription(subscription.id, subscription.providerSubscriptionId ?? '');
  return purchase;
};
