import {
  PATCH_FREE_TRANSLATION_LIMIT,
  PATCH_PLAN_LIMITS,
} from '../../../domain/policies/billing-offer.policy';
import type { BillingStorePort } from '../../../domain/ports/billing-store.port';
import type { BillingRuntimeConfig } from '../../ports/billing-runtime.port';
import { BillingClockPort } from '../../ports/billing-runtime.port';
import { ManageBillingAccessUseCase } from '../access/manage-billing-access.use-case';

export class GetBillingStatusUseCase {
  constructor(
    private readonly store: BillingStorePort,
    private readonly access: ManageBillingAccessUseCase,
    private readonly config: BillingRuntimeConfig,
    private readonly clock: BillingClockPort,
    private readonly logger?: LoggerPort,
  ) {}
  async execute(userId: string) {
    const now = this.clock.now();
    const entitlement = await this.store.findActiveEntitlement(userId, now);
    const subscription = await this.store.findCurrentSubscription(userId, now);
    const openCheckout = await this.store.findOpenPurchase(userId, now);
    const active = Boolean(
      entitlement?.endsAt && entitlement.endsAt > now
        ? true
        : subscription?.periodStart &&
            subscription.periodEnd &&
            subscription.periodStart <= now &&
            subscription.periodEnd > now &&
            !['revoked', 'failed'].includes(subscription.status),
    );
    const plan = active ? (entitlement?.plan ?? subscription?.plan ?? 'free') : 'free';
    const window = entitlement ? this.access.quotaWindow(entitlement.quotaAnchorAt, now) : null;
    const periodStart = window?.start ?? subscription?.periodStart ?? null;
    const used =
      plan === 'free' || !periodStart ? 0 : await this.store.preparationUsed(userId, periodStart);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return {
      enabled: this.config.enabled,
      status: entitlement?.status ?? subscription?.status ?? 'none',
      active,
      plan,
      pendingPlan: subscription?.pendingPlan ?? null,
      used,
      limit: plan === 'free' ? 0 : PATCH_PLAN_LIMITS[plan],
      periodEnd: (entitlement?.endsAt ?? subscription?.periodEnd)?.toISOString() ?? null,
      quotaPeriodEnd: (window?.end ?? subscription?.periodEnd)?.toISOString() ?? null,
      renews: Boolean(
        subscription &&
          ['active', 'paused'].includes(subscription.status) &&
          !subscription.cancelAtPeriodEnd,
      ),
      billingSource: entitlement?.source ?? (subscription ? 'mercado_pago_subscription' : null),
      paymentMode:
        entitlement?.source === 'mercado_pago_pix'
          ? ('pix_prepaid' as const)
          : subscription?.providerSubscriptionId
            ? ('card_recurring' as const)
            : null,
      creditBalanceCents: await this.store.creditBalance(userId),
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      freeTranslationsUsed: await this.store.freeTranslationUsed(userId, monthStart),
      freeTranslationsLimit: PATCH_FREE_TRANSLATION_LIMIT,
      openCheckout: openCheckout
        ? {
            id: openCheckout.id,
            offerCode: openCheckout.offerCode,
            status: openCheckout.status,
            expiresAt: openCheckout.expiresAt.toISOString(),
          }
        : null,
    };
  }
}

import type { LoggerPort } from '@/shared-kernel';
