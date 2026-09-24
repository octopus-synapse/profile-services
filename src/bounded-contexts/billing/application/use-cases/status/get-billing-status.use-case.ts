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
    const active = entitlement ? entitlement.endsAt > now : await this.access.isPaid(userId);
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
      pendingPlan: null,
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
      creditBalanceCents: await this.store.creditBalance(userId),
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      freeTranslationsUsed: await this.store.freeTranslationUsed(userId, monthStart),
      freeTranslationsLimit: PATCH_FREE_TRANSLATION_LIMIT,
    };
  }
}

import type { LoggerPort } from '@/shared-kernel';
