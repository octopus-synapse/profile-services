import {
  PatchFreeTranslationLimitReachedException,
  PatchGoLimitReachedException,
  PatchGoRequiredException,
} from '../../../domain/exceptions/billing.exceptions';
import {
  PATCH_FREE_TRANSLATION_LIMIT,
  PATCH_PLAN_LIMITS,
} from '../../../domain/policies/billing-offer.policy';
import type { BillingStorePort } from '../../../domain/ports/billing-store.port';
import type {
  AiUsageRecorderPort,
  FreeTranslationMeterPort,
  FreeTranslationReservation,
  PaidAccessPort,
  PreparationMeterPort,
  PreparationReservation,
} from '../../ports/billing-capabilities.port';
import type { BillingRuntimeConfig } from '../../ports/billing-runtime.port';
import { BillingClockPort } from '../../ports/billing-runtime.port';

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 150_000, output: 600_000 },
  'gpt-4.1-mini': { input: 400_000, output: 1_600_000 },
  'text-embedding-3-small': { input: 20_000, output: 0 },
};

export class ManageBillingAccessUseCase
  implements PaidAccessPort, PreparationMeterPort, FreeTranslationMeterPort, AiUsageRecorderPort
{
  constructor(
    private readonly store: BillingStorePort,
    private readonly config: BillingRuntimeConfig,
    private readonly clock: BillingClockPort,
    private readonly logger?: LoggerPort,
  ) {}

  async isPaid(userId: string): Promise<boolean> {
    if (!this.config.enabled) return true;
    const now = this.clock.now();
    if (await this.store.findActiveEntitlement(userId, now)) return true;
    const subscription = await this.store.findCurrentSubscription(userId, now);
    return Boolean(
      subscription?.periodStart &&
        subscription.periodEnd &&
        subscription.periodStart <= now &&
        subscription.periodEnd > now &&
        !['revoked', 'failed'].includes(subscription.status),
    );
  }

  async requirePaid(userId: string): Promise<void> {
    if (!(await this.isPaid(userId))) throw new PatchGoRequiredException();
  }

  async reserve(userId: string): Promise<PreparationReservation | null> {
    if (!this.config.enabled) return null;
    const now = this.clock.now();
    const entitlement = await this.store.findActiveEntitlement(userId, now);
    const subscription = entitlement ? null : await this.store.findCurrentSubscription(userId, now);
    const subscriptionIsPaid = Boolean(
      subscription?.periodStart &&
        subscription.periodEnd &&
        subscription.periodStart <= now &&
        subscription.periodEnd > now &&
        !['revoked', 'failed'].includes(subscription.status),
    );
    if (!entitlement && !subscriptionIsPaid) throw new PatchGoRequiredException();
    const plan = entitlement?.plan ?? subscription?.plan;
    const periodStart = entitlement
      ? this.quotaWindow(entitlement.quotaAnchorAt, now).start
      : subscription?.periodStart;
    if (!plan || !periodStart) throw new PatchGoRequiredException();
    if (!(await this.store.reservePreparation(userId, periodStart, PATCH_PLAN_LIMITS[plan])))
      throw new PatchGoLimitReachedException();
    return { userId, periodStart };
  }

  async release(reservation: PreparationReservation | null): Promise<void> {
    if (reservation)
      await this.store.releasePreparation(reservation.userId, reservation.periodStart);
  }

  async freeTranslationRemaining(userId: string): Promise<number> {
    if (await this.isPaid(userId)) return Number.POSITIVE_INFINITY;
    const month = this.monthStart(this.clock.now());
    return Math.max(
      0,
      PATCH_FREE_TRANSLATION_LIMIT - (await this.store.freeTranslationUsed(userId, month)),
    );
  }

  async reserveFreeTranslation(
    userId: string,
    count = 1,
  ): Promise<FreeTranslationReservation | null> {
    if (await this.isPaid(userId)) return null;
    if (!Number.isInteger(count) || count < 1 || count > PATCH_FREE_TRANSLATION_LIMIT)
      throw new PatchFreeTranslationLimitReachedException();
    const monthStart = this.monthStart(this.clock.now());
    if (
      !(await this.store.reserveFreeTranslation(
        userId,
        monthStart,
        count,
        PATCH_FREE_TRANSLATION_LIMIT,
      ))
    )
      throw new PatchFreeTranslationLimitReachedException();
    return { userId, monthStart, count };
  }

  async releaseFreeTranslation(reservation: FreeTranslationReservation | null): Promise<void> {
    if (reservation)
      await this.store.releaseFreeTranslation(
        reservation.userId,
        reservation.monthStart,
        reservation.count,
      );
  }

  async recordAiUsage(input: {
    userId: string;
    operation: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void> {
    const now = this.clock.now();
    const entitlement = await this.store.findActiveEntitlement(input.userId, now);
    const subscription = entitlement
      ? null
      : await this.store.findCurrentSubscription(input.userId, now);
    const plan = entitlement?.plan ?? subscription?.plan ?? 'free';
    const rate = MODEL_RATES[input.model];
    const priced =
      rate && Number.isFinite(this.config.aiCostBrlPerUsd) && this.config.aiCostBrlPerUsd > 0;
    const usd = priced
      ? BigInt(
          Math.round(
            (input.inputTokens * rate.input + input.outputTokens * rate.output) / 1_000_000,
          ),
        )
      : null;
    await this.store.recordAiUsage({
      ...input,
      plan,
      costUsdMicros: usd,
      costBrlMicros:
        usd === null ? null : BigInt(Math.round(Number(usd) * this.config.aiCostBrlPerUsd)),
    });
  }

  quotaWindow(anchor: Date, now: Date): { start: Date; end: Date } {
    let start = anchor;
    while (this.addMonths(start, 1) <= now) start = this.addMonths(start, 1);
    return { start, end: this.addMonths(start, 1) };
  }
  private monthStart(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  private addMonths(date: Date, months: number): Date {
    const copy = new Date(date);
    const day = copy.getUTCDate();
    copy.setUTCDate(1);
    copy.setUTCMonth(copy.getUTCMonth() + months);
    copy.setUTCDate(
      Math.min(
        day,
        new Date(Date.UTC(copy.getUTCFullYear(), copy.getUTCMonth() + 1, 0)).getUTCDate(),
      ),
    );
    return copy;
  }
}

import type { LoggerPort } from '@/shared-kernel';
