import type { PaidPatchPlan } from '../policies/billing-offer.policy';

export type ProviderSubscriptionStatus = 'pending' | 'active' | 'paused' | 'canceled';
export type ProviderPaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'canceled'
  | 'refunded'
  | 'charged_back';

export interface ProviderSubscription {
  readonly id: string;
  readonly externalReference: string | null;
  readonly payerId: string | null;
  readonly version: number | null;
  readonly status: ProviderSubscriptionStatus;
  readonly amountCents: number;
  readonly currency: string;
  readonly nextPaymentAt: Date | null;
  readonly checkoutUrl: string | null;
}

export interface ProviderPayment {
  readonly id: string;
  readonly subscriptionId: string;
  readonly status: ProviderPaymentStatus;
  readonly amountCents: number;
  readonly currency: string;
  readonly paidAt: Date | null;
}

export interface ProviderOrder {
  readonly id: string;
  readonly externalReference: string | null;
  readonly paymentId: string | null;
  readonly status: ProviderPaymentStatus;
  readonly amountCents: number;
  readonly currency: string;
  readonly paidAt: Date | null;
  readonly qrCode: string | null;
  readonly qrCodeBase64: string | null;
  readonly ticketUrl: string | null;
}

export interface ProviderWebhookEvent {
  readonly eventId: string;
  readonly type: 'subscription' | 'authorized_payment' | 'payment' | 'order' | 'ignored';
  readonly resourceId: string;
  readonly action: string;
}

export interface CreateSubscriptionInput {
  readonly localSubscriptionId: string;
  readonly userId: string;
  readonly email: string;
  readonly plan: PaidPatchPlan;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly returnUrl: string;
  readonly cardToken?: string;
}

export interface CreatePixOrderInput {
  readonly purchaseId: string;
  readonly externalReference: string;
  readonly email: string;
  readonly firstName?: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly expirationMinutes: number;
}

export interface CreateCardOrderInput {
  readonly purchaseId: string;
  readonly externalReference: string;
  readonly email: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly cardToken: string;
  readonly paymentMethodId: string;
  readonly installments: number;
}

export interface VerifyWebhookInput {
  readonly rawBody: string;
  readonly signature: string;
  readonly requestId: string;
}

/** Infrastructure boundary for recurring-payment providers. */
export abstract class PaymentProviderPort {
  abstract createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription>;
  abstract createCardOrder(input: CreateCardOrderInput): Promise<ProviderOrder>;
  abstract createPixOrder(input: CreatePixOrderInput): Promise<ProviderOrder>;
  abstract getOrder(id: string): Promise<ProviderOrder>;
  abstract cancelOrder(id: string, idempotencyKey: string): Promise<ProviderOrder>;
  abstract getSubscription(id: string): Promise<ProviderSubscription>;
  abstract updateSubscriptionAmount(id: string, amountCents: number): Promise<ProviderSubscription>;
  abstract cancelSubscription(id: string): Promise<ProviderSubscription>;
  abstract updatePaymentMethod(id: string, cardToken: string): Promise<ProviderSubscription>;
  abstract getAuthorizedPayment(id: string): Promise<ProviderPayment>;
  abstract listAuthorizedPayments(subscriptionId: string): Promise<ReadonlyArray<ProviderPayment>>;
  abstract verifyWebhook(input: VerifyWebhookInput): ProviderWebhookEvent;
}
