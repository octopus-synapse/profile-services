import type { LoggerPort } from '@/shared-kernel';
import {
  PatchGoNotConfiguredException,
  PatchGoRequiredException,
} from '../../../domain/exceptions/billing.exceptions';
import { PATCH_PLAN_PRICES } from '../../../domain/policies/billing-offer.policy';
import type { BillingStorePort } from '../../../domain/ports/billing-store.port';
import type { PaymentProviderPort } from '../../../domain/ports/payment-provider.port';
import type { BillingRuntimeConfig } from '../../ports/billing-runtime.port';
import { BillingClockPort, BillingIdPort } from '../../ports/billing-runtime.port';

const SESSION_TTL_MS = 10 * 60_000;

export class ManageSubscriptionUseCase {
  constructor(
    private readonly store: BillingStorePort,
    private readonly provider: PaymentProviderPort | null,
    private readonly ids: BillingIdPort,
    private readonly clock: BillingClockPort,
    private readonly config: BillingRuntimeConfig,
    private readonly logger?: LoggerPort,
  ) {}

  async cancel(userId: string): Promise<void> {
    const provider = this.requireProvider();
    const subscription = await this.store.findCurrentSubscription(userId, this.clock.now());
    if (!subscription?.providerSubscriptionId) throw new PatchGoRequiredException();
    await provider.cancelSubscription(subscription.providerSubscriptionId);
    await this.store.updateSubscription({
      ...subscription,
      status: 'canceled',
      cancelAtPeriodEnd: true,
    });
  }

  async schedulePlanChange(userId: string, plan: 'go'): Promise<void> {
    if (!this.config.enabled) throw new PatchGoNotConfiguredException();
    const provider = this.requireProvider();
    const subscription = await this.store.findCurrentSubscription(userId, this.clock.now());
    if (
      !subscription?.providerSubscriptionId ||
      subscription.plan !== 'max' ||
      !['active', 'paused'].includes(subscription.status)
    )
      throw new PatchGoRequiredException();
    if (subscription.pendingPlan === plan) return;
    const amountCents = PATCH_PLAN_PRICES.go.BRL.cents;
    const remote = await provider.updateSubscriptionAmount(
      subscription.providerSubscriptionId,
      amountCents,
    );
    if (remote.currency !== 'BRL' || remote.amountCents !== amountCents)
      throw new PatchGoRequiredException();
    await this.store.updateSubscription({
      ...subscription,
      pendingPlan: plan,
      amountCents,
      providerVersion: remote.version,
      nextPaymentAt: remote.nextPaymentAt,
    });
  }

  async cancelPlanChange(userId: string): Promise<void> {
    if (!this.config.enabled) throw new PatchGoNotConfiguredException();
    const provider = this.requireProvider();
    const subscription = await this.store.findCurrentSubscription(userId, this.clock.now());
    if (!subscription?.providerSubscriptionId || subscription.pendingPlan !== 'go')
      throw new PatchGoRequiredException();
    const amountCents = PATCH_PLAN_PRICES.max.BRL.cents;
    const remote = await provider.updateSubscriptionAmount(
      subscription.providerSubscriptionId,
      amountCents,
    );
    if (remote.currency !== 'BRL' || remote.amountCents !== amountCents)
      throw new PatchGoRequiredException();
    await this.store.updateSubscription({
      ...subscription,
      pendingPlan: null,
      amountCents,
      providerVersion: remote.version,
      nextPaymentAt: remote.nextPaymentAt,
    });
  }

  async createPaymentMethodSession(userId: string, requestedReturnTarget?: string) {
    const subscription = await this.store.findCurrentSubscription(userId, this.clock.now());
    if (!subscription?.providerSubscriptionId) throw new PatchGoRequiredException();
    const token = this.ids.token();
    await this.store.createPaymentMethodSession({
      subscriptionId: subscription.id,
      tokenHash: this.ids.hash(token),
      returnUrl: this.allowedReturnUrl(requestedReturnTarget),
      expiresAt: new Date(this.clock.now().getTime() + SESSION_TTL_MS),
    });
    return {
      // Fragments stay client-side: the one-time token does not leak into
      // server access logs, proxy logs, analytics, or Referer headers.
      url: `${this.config.frontendUrl}/billing/payment-method#token=${encodeURIComponent(token)}`,
    };
  }

  async getPaymentMethodSession(token: string) {
    const paymentMethodState = await this.store.findPaymentMethodSession(this.ids.hash(token));
    if (
      !paymentMethodState ||
      paymentMethodState.usedAt ||
      paymentMethodState.expiresAt <= this.clock.now()
    )
      throw new PatchGoRequiredException();
    return {
      publicKey: this.config.subscriptionsPublicKey ?? '',
      plan: paymentMethodState.plan,
      returnUrl: paymentMethodState.returnUrl,
    };
  }

  async updatePaymentMethod(sessionToken: string, cardToken: string) {
    const provider = this.requireProvider();
    const paymentMethodState = await this.store.findPaymentMethodSession(
      this.ids.hash(sessionToken),
    );
    if (
      !paymentMethodState?.providerSubscriptionId ||
      paymentMethodState.usedAt ||
      paymentMethodState.expiresAt <= this.clock.now() ||
      !cardToken
    )
      throw new PatchGoRequiredException();
    await provider.updatePaymentMethod(paymentMethodState.providerSubscriptionId, cardToken);
    if (!(await this.store.consumePaymentMethodSession(paymentMethodState.id, this.clock.now())))
      throw new PatchGoRequiredException();
    return { returnUrl: paymentMethodState.returnUrl };
  }

  async payments(userId: string, page = 1, limit = 20) {
    const result = await this.store.listPayments(userId, page, limit);
    const totalPages = Math.max(1, Math.ceil(result.total / limit));
    return {
      items: result.items.map((item) => ({
        ...item,
        paidAt: item.paidAt?.toISOString() ?? null,
        periodStart: item.periodStart?.toISOString() ?? null,
        periodEnd: item.periodEnd?.toISOString() ?? null,
      })),
      total: result.total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  private allowedReturnUrl(requested?: string): string {
    const fallback = `${this.config.frontendUrl}/go`;
    if (!requested) return fallback;
    try {
      const url = new URL(requested);
      const frontend = new URL(this.config.frontendUrl);
      if (
        url.origin === frontend.origin ||
        (url.protocol === 'patchcareers:' && !url.username && !url.password)
      )
        return url.toString();
    } catch (error) {
      if (this.logger)
        this.logger.warn('Rejected invalid billing return URL', 'ManageSubscriptionUseCase', {
          error: error instanceof Error ? error.message : 'unknown',
        });
    }
    return fallback;
  }
  private requireProvider() {
    if (!this.provider) throw new PatchGoNotConfiguredException();
    return this.provider;
  }
}
