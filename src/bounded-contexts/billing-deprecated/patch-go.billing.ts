// lint-allow-file-size: frozen legacy billing implementation; active billing is split by layer
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { LoggerPort } from '@/shared-kernel';
import type { EnvConfig } from '@/shared-kernel/config/config.schema';
import {
  BillingPort,
  type FreeTranslationReservation,
  type PatchGoReservation,
} from './billing.port';
import { MercadoPagoPaymentAdapter } from './mercado-pago.adapter';
import {
  type BillingOfferCode,
  CARD_CHECKOUT_TTL_MS,
  PATCH_BILLING_OFFERS,
  PATCH_FREE_TRANSLATION_LIMIT,
  PATCH_PLAN_LIMITS,
  PATCH_PLAN_PRICES,
  type PaidPatchPlan,
  PIX_CHECKOUT_TTL_MS,
} from './patch-go.constants';
import {
  PatchFreeTranslationLimitReachedException,
  PatchGoLimitReachedException,
  PatchGoNotConfiguredException,
  PatchGoRequiredException,
} from './patch-go.exceptions';
import {
  PaymentProviderPort,
  type ProviderOrder,
  type ProviderPayment,
  type ProviderSubscription,
  type ProviderWebhookEvent,
} from './payment-provider.port';

type BillingConfig = Pick<
  EnvConfig,
  | 'BILLING_ENABLED'
  | 'BILLING_CARD_ENABLED'
  | 'BILLING_PIX_ENABLED'
  | 'MERCADO_PAGO_ACCESS_TOKEN'
  | 'MERCADO_PAGO_PUBLIC_KEY'
  | 'MERCADO_PAGO_WEBHOOK_SECRET'
  | 'AI_COST_BRL_PER_USD'
  | 'FRONTEND_URL'
>;

export type { FreeTranslationReservation, PatchGoReservation } from './billing.port';

const MODEL_RATES_USD_MICROS_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 150_000, output: 600_000 },
  'gpt-4.1-mini': { input: 400_000, output: 1_600_000 },
  'text-embedding-3-small': { input: 20_000, output: 0 },
};
const AI_BUDGET_BRL = { free: 1, go: 8, max: 30 } as const;

/** Provider-neutral billing facade. Mercado Pago is selected only at composition time. */
export class PatchGoBilling extends BillingPort {
  private readonly provider: PaymentProviderPort | null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: BillingConfig,
    private readonly logger?: LoggerPort,
    provider?: PaymentProviderPort,
  ) {
    super();
    this.provider =
      provider ??
      (config.MERCADO_PAGO_ACCESS_TOKEN && config.MERCADO_PAGO_WEBHOOK_SECRET
        ? new MercadoPagoPaymentAdapter(
            config.MERCADO_PAGO_ACCESS_TOKEN,
            config.MERCADO_PAGO_WEBHOOK_SECRET,
            logger,
          )
        : null);
  }

  get enabled(): boolean {
    return this.config.BILLING_ENABLED === true;
  }

  async requirePaid(userId: string): Promise<void> {
    if (!(await this.isPaid(userId))) throw new PatchGoRequiredException();
  }

  async isPaid(userId: string): Promise<boolean> {
    if (!this.enabled) return true;
    if (await this.currentEntitlement(userId)) return true;
    return this.isActive(await this.currentSubscription(userId));
  }

  private monthStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  async freeTranslationRemaining(userId: string): Promise<number> {
    if (await this.isPaid(userId)) return Number.POSITIVE_INFINITY;
    const usage = await this.prisma.patchFreeTranslationUsage.findUnique({
      where: { userId_monthStart: { userId, monthStart: this.monthStart() } },
    });
    return Math.max(0, PATCH_FREE_TRANSLATION_LIMIT - (usage?.count ?? 0));
  }

  async reserveFreeTranslation(
    userId: string,
    count = 1,
  ): Promise<FreeTranslationReservation | null> {
    if (await this.isPaid(userId)) return null;
    if (!Number.isInteger(count) || count < 1 || count > PATCH_FREE_TRANSLATION_LIMIT)
      throw new PatchFreeTranslationLimitReachedException();
    const monthStart = this.monthStart();
    const rows = await this.prisma.$queryRaw<Array<{ userId: string }>>`
      INSERT INTO "patch_free_translation_usage" ("userId", "monthStart", "count")
      VALUES (${userId}, ${monthStart}, ${count}::integer)
      ON CONFLICT ("userId", "monthStart") DO UPDATE
        SET "count" = "patch_free_translation_usage"."count" + ${count}::integer
        WHERE "patch_free_translation_usage"."count" + ${count}::integer <= ${PATCH_FREE_TRANSLATION_LIMIT}::integer
      RETURNING "userId"
    `;
    if (!rows[0]) throw new PatchFreeTranslationLimitReachedException();
    return { userId, monthStart, count };
  }

  async releaseFreeTranslation(reservation: FreeTranslationReservation | null): Promise<void> {
    if (!reservation) return;
    await this.prisma.$executeRaw`
      UPDATE "patch_free_translation_usage"
      SET "count" = GREATEST(0, "count" - ${reservation.count}::integer)
      WHERE "userId" = ${reservation.userId} AND "monthStart" = ${reservation.monthStart}
    `;
  }

  async recordAiUsage(input: {
    userId: string;
    operation: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void> {
    const rate = MODEL_RATES_USD_MICROS_PER_MILLION[input.model];
    const exchange = Number(this.config.AI_COST_BRL_PER_USD);
    const priced = rate && Number.isFinite(exchange) && exchange > 0;
    const costUsdMicros = priced
      ? BigInt(
          Math.round(
            (input.inputTokens * rate.input + input.outputTokens * rate.output) / 1_000_000,
          ),
        )
      : null;
    const costBrlMicros =
      costUsdMicros === null ? null : BigInt(Math.round(Number(costUsdMicros) * exchange));
    const entitlement = await this.currentEntitlement(input.userId);
    const billing = entitlement ? null : await this.currentSubscription(input.userId);
    const plan = entitlement
      ? entitlement.plan === 'max'
        ? 'max'
        : 'go'
      : this.isActive(billing)
        ? billing?.plan === 'max'
          ? 'max'
          : 'go'
        : 'free';
    const periodStart =
      plan === 'free'
        ? this.monthStart()
        : entitlement
          ? this.quotaWindow(entitlement.quotaAnchorAt).start
          : (billing?.periodStart ?? this.monthStart());
    const previous = await this.prisma.patchAiUsage.aggregate({
      where: { userId: input.userId, createdAt: { gte: periodStart } },
      _sum: { costBrlMicros: true },
    });
    await this.prisma.patchAiUsage.create({
      data: {
        userId: input.userId,
        operation: input.operation,
        plan,
        model: input.model,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costUsdMicros,
        costBrlMicros,
      },
    });
    if (!priced || costBrlMicros === null) {
      this.logger?.warn(`AI usage lacks a price for model=${input.model}`, 'PatchAiUsage');
      return;
    }
    const before = Number(previous._sum.costBrlMicros ?? 0n);
    const after = before + Number(costBrlMicros);
    const budgetMicros = AI_BUDGET_BRL[plan] * 1_000_000;
    for (const threshold of [0.5, 0.75, 1]) {
      if (before < budgetMicros * threshold && after >= budgetMicros * threshold) {
        this.logger?.warn(
          `AI cost crossed ${threshold * 100}% of ${plan} target for user=${input.userId}`,
          'PatchAiUsage',
        );
      }
    }
  }

  async aiCostReport(days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.patchAiUsage.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true, plan: true, costBrlMicros: true },
    });
    const report = (plan: 'free' | 'go' | 'max') => {
      const byUser = new Map<string, number>();
      let unpricedOperations = 0;
      for (const row of rows) {
        if (row.plan !== plan) continue;
        if (row.costBrlMicros === null) {
          unpricedOperations++;
          continue;
        }
        byUser.set(row.userId, (byUser.get(row.userId) ?? 0) + Number(row.costBrlMicros));
      }
      const sorted = [...byUser.values()].sort((a, b) => a - b);
      const percentile = (p: number) =>
        sorted.length
          ? Number(((sorted[Math.ceil(p * sorted.length) - 1] ?? 0) / 1_000_000).toFixed(4))
          : 0;
      return {
        plan,
        usersWithPricedUsage: sorted.length,
        unpricedOperations,
        p50Brl: percentile(0.5),
        p95Brl: percentile(0.95),
        budgetBrl: AI_BUDGET_BRL[plan],
      };
    };
    return { since: since.toISOString(), plans: [report('free'), report('go'), report('max')] };
  }

  async status(userId: string) {
    if (!this.enabled) {
      return {
        enabled: false,
        status: 'unavailable',
        active: false,
        plan: 'free' as const,
        used: 0,
        limit: 0,
        periodEnd: null,
        quotaPeriodEnd: null,
        renews: false,
        billingSource: null,
        creditBalanceCents: 0,
        cancelAtPeriodEnd: false,
        pendingPlan: null,
        freeTranslationsUsed: 0,
        freeTranslationsLimit: PATCH_FREE_TRANSLATION_LIMIT,
      };
    }
    const entitlement = await this.currentEntitlement(userId);
    const billing = await this.currentSubscription(userId);
    const active = Boolean(entitlement) || this.isActive(billing);
    const plan = entitlement
      ? entitlement.plan === 'max'
        ? 'max'
        : 'go'
      : active && billing?.plan === 'max'
        ? 'max'
        : active
          ? 'go'
          : 'free';
    const quotaPeriod = entitlement
      ? this.quotaWindow(entitlement.quotaAnchorAt)
      : billing?.periodStart && billing.periodEnd
        ? { start: billing.periodStart, end: billing.periodEnd }
        : null;
    const used = quotaPeriod
      ? ((
          await this.prisma.patchGoUsage.findUnique({
            where: { userId_periodStart: { userId, periodStart: quotaPeriod.start } },
          })
        )?.count ?? 0)
      : 0;
    const freeUsage = !active
      ? await this.prisma.patchFreeTranslationUsage.findUnique({
          where: { userId_monthStart: { userId, monthStart: this.monthStart() } },
        })
      : null;
    return {
      enabled: true,
      status: entitlement?.status ?? billing?.status ?? 'none',
      active,
      plan,
      used,
      limit: active ? PATCH_PLAN_LIMITS[plan as PaidPatchPlan] : 0,
      periodEnd: entitlement?.endsAt.toISOString() ?? billing?.periodEnd?.toISOString() ?? null,
      quotaPeriodEnd: quotaPeriod?.end.toISOString() ?? null,
      renews: Boolean(
        billing?.providerSubscriptionId &&
          !['canceled', 'revoked', 'failed'].includes(billing.status) &&
          !billing.cancelAtPeriodEnd,
      ),
      billingSource: entitlement?.source ?? (billing ? 'mercado_pago_subscription' : null),
      creditBalanceCents: await this.creditBalance(userId),
      cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
      pendingPlan:
        billing?.pendingPlan === 'go' || billing?.pendingPlan === 'max'
          ? billing.pendingPlan
          : null,
      freeTranslationsUsed: freeUsage?.count ?? 0,
      freeTranslationsLimit: PATCH_FREE_TRANSLATION_LIMIT,
    };
  }

  /** One atomic SQL statement admits at most the plan's quota per billing period,
   * even when the candidate opens multiple tailoring tabs at once. */
  async reserve(userId: string): Promise<PatchGoReservation | null> {
    if (!this.enabled) return null;
    const entitlement = await this.currentEntitlement(userId);
    if (entitlement) {
      const period = this.quotaWindow(entitlement.quotaAnchorAt);
      const limit = entitlement.plan === 'max' ? PATCH_PLAN_LIMITS.max : PATCH_PLAN_LIMITS.go;
      const rows = await this.prisma.$queryRaw<Array<{ periodStart: Date }>>`
        INSERT INTO "patch_go_usage" ("userId", "periodStart", "count")
        SELECT ${userId}, ${period.start}, 1
        WHERE EXISTS (
          SELECT 1 FROM "billing_entitlements"
          WHERE "id" = ${entitlement.id} AND "status" = 'active'
            AND "startsAt" <= NOW() AND "endsAt" > NOW()
        )
        ON CONFLICT ("userId", "periodStart") DO UPDATE
          SET "count" = "patch_go_usage"."count" + 1
          WHERE "patch_go_usage"."count" < ${limit}::integer
        RETURNING "periodStart"
      `;
      if (rows[0]) return { userId, periodStart: rows[0].periodStart };
      throw new PatchGoLimitReachedException();
    }
    const rows = await this.prisma.$queryRaw<Array<{ periodStart: Date }>>`
      INSERT INTO "patch_go_usage" ("userId", "periodStart", "count")
      SELECT "userId", "periodStart", 1 FROM "billing_subscriptions"
      WHERE "userId" = ${userId}
        AND "status" IN ('active', 'paused', 'canceled')
        AND "periodStart" <= NOW() AND "periodEnd" > NOW()
      ORDER BY "updatedAt" DESC
      LIMIT 1
      ON CONFLICT ("userId", "periodStart") DO UPDATE
        SET "count" = "patch_go_usage"."count" + 1
        WHERE "patch_go_usage"."count" < (
          SELECT CASE WHEN "plan" = 'max' THEN ${PATCH_PLAN_LIMITS.max}::integer ELSE ${PATCH_PLAN_LIMITS.go}::integer END
          FROM "billing_subscriptions"
          WHERE "userId" = ${userId}
            AND "periodStart" <= NOW() AND "periodEnd" > NOW()
          ORDER BY "updatedAt" DESC
          LIMIT 1
        )
      RETURNING "periodStart"
    `;
    if (rows[0]) return { userId, periodStart: rows[0].periodStart };
    const billing = await this.currentSubscription(userId);
    if (this.isActive(billing)) throw new PatchGoLimitReachedException();
    throw new PatchGoRequiredException();
  }

  /** If AI or persistence failed, do not charge the user a preparation. */
  async release(reservation: PatchGoReservation | null): Promise<void> {
    if (!reservation) return;
    await this.prisma.$executeRaw`
      UPDATE "patch_go_usage" SET "count" = GREATEST("count" - 1, 0)
      WHERE "userId" = ${reservation.userId} AND "periodStart" = ${reservation.periodStart}
    `;
  }

  async offers() {
    const founderRemaining = await this.founderRemaining();
    return Object.values(PATCH_BILLING_OFFERS)
      .filter(
        (offer) =>
          (offer.paymentMethod !== 'card' || this.config.BILLING_CARD_ENABLED !== false) &&
          (offer.paymentMethod !== 'pix' || this.config.BILLING_PIX_ENABLED !== false),
      )
      .filter((offer) => offer.code !== 'max_pix_year' || founderRemaining === 0)
      .filter((offer) => offer.code !== 'max_pix_year_founder' || founderRemaining > 0)
      .map((offer) => ({
        ...offer,
        founderRemaining: offer.founderLimit ? founderRemaining : null,
      }));
  }

  async createCheckout(userId: string, offerCode: BillingOfferCode) {
    const provider = this.requireProvider();
    const offer = PATCH_BILLING_OFFERS[offerCode];
    if (!offer) throw new PatchGoRequiredException();
    if (
      (offer.paymentMethod === 'card' && this.config.BILLING_CARD_ENABLED === false) ||
      (offer.paymentMethod === 'pix' && this.config.BILLING_PIX_ENABLED === false)
    )
      throw new PatchGoRequiredException();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) throw new PatchGoRequiredException();

    const checkout = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`patch-checkout:${userId}`}))`;
      const now = new Date();
      const open = await tx.billingPurchase.findFirst({
        where: {
          userId,
          OR: [
            { status: { in: ['pending', 'reversing'] } },
            { status: 'created', expiresAt: { gt: now } },
            { status: 'created', subscriptionId: { not: null } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      if (open) {
        if (open.offerCode === offerCode) {
          const purchase =
            open.status === 'created' && open.expiresAt <= now
              ? await tx.billingPurchase.update({
                  where: { id: open.id },
                  data: { expiresAt: new Date(Date.now() + CARD_CHECKOUT_TTL_MS) },
                })
              : open;
          return { type: 'open', purchase } as const;
        }
        throw new PatchGoRequiredException();
      }
      const entitlement = await tx.billingEntitlement.findFirst({
        where: { userId, status: 'active', startsAt: { lte: now }, endsAt: { gt: now } },
        include: { purchase: true },
        orderBy: [{ plan: 'desc' }, { endsAt: 'desc' }],
      });
      const recurringSubscription = await tx.billingSubscription.findFirst({
        where: {
          userId,
          status: { in: ['active', 'paused', 'canceled'] },
          periodStart: { lte: now },
          periodEnd: { gt: now },
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (
        offer.paymentMethod === 'card' &&
        entitlement &&
        !['active', 'paused'].includes(recurringSubscription?.status ?? '')
      )
        throw new PatchGoRequiredException();
      const prorationCreditCents =
        entitlement && entitlement.plan !== offer.plan
          ? await this.unusedEntitlementValue(entitlement)
          : 0;
      const cardPlanChange = Boolean(
        offer.recurring && entitlement && entitlement.plan !== offer.plan,
      );
      const targetAmountCents =
        cardPlanChange && entitlement
          ? this.proratedAmount(offer.amountCents, entitlement)
          : offer.amountCents;
      const credit =
        offer.paymentMethod === 'pix' || cardPlanChange
          ? await tx.billingCreditEntry.aggregate({
              where: { userId, currency: 'BRL' },
              _sum: { amountCents: true },
            })
          : null;
      const storedCredit = Math.max(0, credit?._sum.amountCents ?? 0);
      const creditAppliedCents = Math.min(
        targetAmountCents,
        Math.max(0, storedCredit + prorationCreditCents),
      );
      const amountCents = targetAmountCents - creditAppliedCents;
      const id = randomUUID();
      const expiresAt = new Date(
        Date.now() + (offer.paymentMethod === 'pix' ? PIX_CHECKOUT_TTL_MS : CARD_CHECKOUT_TTL_MS),
      );
      if (offer.founderLimit) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('patch-max-founder'))`;
        const reserved = await tx.billingPurchase.count({
          where: {
            offerCode,
            OR: [
              { status: 'approved' },
              { status: { in: ['created', 'pending'] }, expiresAt: { gt: new Date() } },
            ],
          },
        });
        if (reserved >= offer.founderLimit) throw new PatchGoRequiredException();
      }
      const purchase = await tx.billingPurchase.create({
        data: {
          id,
          userId,
          offerCode,
          plan: offer.plan,
          kind: cardPlanChange
            ? 'card_plan_change'
            : offer.recurring
              ? 'card_subscription'
              : 'pix_prepaid',
          amountCents,
          listAmountCents: offer.listAmountCents,
          prorationCreditCents,
          creditAppliedCents,
          currency: offer.currency,
          termMonths: offer.termMonths,
          externalReference: `patch:${id}`,
          expiresAt,
        },
      });
      return { type: 'created', purchase, amountCents, cardPlanChange } as const;
    });
    if (checkout.type === 'open') return this.checkoutResponse(checkout.purchase);
    const { purchase, amountCents, cardPlanChange } = checkout;

    if (amountCents === 0) {
      if (cardPlanChange) await this.applyRecurringPlanChange(purchase);
      else if (offer.paymentMethod === 'pix') await this.cancelRecurringSubscription(userId);
      await this.approvePurchase(purchase.id, `credit:${purchase.id}`, new Date());
      return this.checkoutStatus(userId, purchase.id);
    }
    if (offer.paymentMethod === 'card') return this.checkoutResponse(purchase);

    const order = await provider.createPixOrder({
      purchaseId: purchase.id,
      externalReference: purchase.externalReference,
      email: user.email,
      amountCents,
      currency: 'BRL',
      expirationMinutes: PIX_CHECKOUT_TTL_MS / 60_000,
    });
    await this.syncOrder(order);
    return this.checkoutStatus(userId, purchase.id, false);
  }

  async submitCardCheckout(
    userId: string,
    purchaseId: string,
    cardToken: string,
    paymentMethodId?: string,
    installments = 1,
  ) {
    const provider = this.requireProvider();
    if (!cardToken || cardToken.length > 512) throw new PatchGoRequiredException();
    const purchase = await this.prisma.billingPurchase.findFirst({
      where: { id: purchaseId, userId },
    });
    if (
      !purchase ||
      !['card_subscription', 'card_plan_change'].includes(purchase.kind) ||
      purchase.status !== 'created' ||
      purchase.expiresAt.getTime() <= Date.now()
    )
      throw new PatchGoRequiredException();
    const offer = PATCH_BILLING_OFFERS[purchase.offerCode as BillingOfferCode];
    if (!offer || offer.paymentMethod !== 'card') throw new PatchGoRequiredException();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) throw new PatchGoRequiredException();
    if (purchase.kind === 'card_plan_change') {
      if (!paymentMethodId || !/^[a-z0-9_-]{2,64}$/iu.test(paymentMethodId))
        throw new PatchGoRequiredException();
      if (!Number.isInteger(installments) || installments !== 1)
        throw new PatchGoRequiredException();
      const order = await provider.createCardOrder({
        purchaseId: purchase.id,
        externalReference: purchase.externalReference,
        email: user.email,
        amountCents: purchase.amountCents,
        currency: 'BRL',
        cardToken,
        paymentMethodId,
        installments,
      });
      await this.syncOrder(order);
      return this.checkoutStatus(userId, purchase.id, false);
    }
    const current = await this.currentSubscription(userId);
    if (this.isActive(current)) throw new PatchGoRequiredException();
    const subscription = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`patch-checkout:${userId}`}))`;
      const currentPurchase = await tx.billingPurchase.findUniqueOrThrow({
        where: { id: purchase.id },
      });
      if (currentPurchase.subscriptionId)
        return tx.billingSubscription.findUniqueOrThrow({
          where: { id: currentPurchase.subscriptionId },
        });
      const created = await tx.billingSubscription.create({
        data: {
          userId,
          provider: 'mercado_pago',
          plan: offer.plan,
          status: 'creating',
          amountCents: offer.amountCents,
          currency: 'BRL',
        },
      });
      await tx.billingPurchase.update({
        where: { id: purchase.id },
        data: { subscriptionId: created.id },
      });
      return created;
    });
    const remote = await provider.createSubscription({
      localSubscriptionId: subscription.id,
      userId,
      email: user.email,
      plan: offer.plan,
      amountCents: offer.amountCents,
      currency: 'BRL',
      returnUrl: `${this.frontendUrl()}/billing/checkout?checkout=${purchase.id}`,
      cardToken,
    });
    if (remote.currency !== 'BRL' || remote.amountCents !== offer.amountCents)
      throw new Error('Mercado Pago returned an invalid authorized subscription');
    await this.prisma.$transaction([
      this.prisma.billingSubscription.update({
        where: { id: subscription.id },
        data: this.subscriptionProjection(remote, { status: 'pending' }),
      }),
      this.prisma.billingPurchase.update({
        where: { id: purchase.id },
        data: {
          subscriptionId: subscription.id,
          providerSubscriptionId: remote.id,
          status: 'pending',
        },
      }),
    ]);
    return this.checkoutStatus(userId, purchase.id, false);
  }

  async checkoutStatus(userId: string, purchaseId: string, refresh = true) {
    let purchase = await this.prisma.billingPurchase.findFirst({
      where: { id: purchaseId, userId },
    });
    if (!purchase) throw new PatchGoRequiredException();
    if (refresh && purchase.status === 'created' && purchase.amountCents === 0) {
      if (purchase.kind === 'card_plan_change') await this.applyRecurringPlanChange(purchase);
      if (purchase.kind === 'pix_prepaid') await this.cancelRecurringSubscription(purchase.userId);
      await this.approvePurchase(purchase.id, `credit:${purchase.id}`, new Date());
      purchase = await this.prisma.billingPurchase.findUniqueOrThrow({ where: { id: purchaseId } });
    }
    if (
      refresh &&
      purchase.kind === 'pix_prepaid' &&
      purchase.status === 'created' &&
      !purchase.providerOrderId &&
      purchase.expiresAt.getTime() > Date.now()
    ) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user?.email) throw new PatchGoRequiredException();
      await this.syncOrder(
        await this.requireProvider().createPixOrder({
          purchaseId: purchase.id,
          externalReference: purchase.externalReference,
          email: user.email,
          amountCents: purchase.amountCents,
          currency: 'BRL',
          expirationMinutes: PIX_CHECKOUT_TTL_MS / 60_000,
        }),
      );
      purchase = await this.prisma.billingPurchase.findUniqueOrThrow({ where: { id: purchaseId } });
    }
    if (
      refresh &&
      purchase.providerOrderId &&
      (purchase.status === 'created' || purchase.status === 'pending')
    ) {
      await this.syncOrder(await this.requireProvider().getOrder(purchase.providerOrderId));
      purchase = await this.prisma.billingPurchase.findUniqueOrThrow({ where: { id: purchaseId } });
    } else if (purchase.status === 'created' && purchase.expiresAt.getTime() <= Date.now()) {
      purchase = await this.prisma.billingPurchase.update({
        where: { id: purchase.id },
        data: { status: 'expired', failedAt: new Date() },
      });
    }
    return this.checkoutResponse(purchase);
  }

  async checkout(userId: string, plan: PaidPatchPlan): Promise<string> {
    const provider = this.requireProvider();
    const current = await this.currentSubscription(userId);
    if (this.isActive(current)) return `${this.frontendUrl()}/go?manage=1`;
    if (current?.status === 'pending' && current.checkoutUrl) return current.checkoutUrl;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) throw new PatchGoRequiredException();
    const price = PATCH_PLAN_PRICES[plan].BRL;
    const local =
      current?.status === 'creating'
        ? current
        : await this.prisma.billingSubscription.create({
            data: {
              userId,
              provider: 'mercado_pago',
              plan,
              status: 'creating',
              amountCents: price.cents,
              currency: price.currency,
            },
          });
    let validatedRemote = false;
    try {
      const remote = await provider.createSubscription({
        localSubscriptionId: local.id,
        userId,
        email: user.email,
        plan,
        amountCents: price.cents,
        currency: 'BRL',
        returnUrl: `${this.frontendUrl()}/go?checkout=success`,
      });
      if (
        remote.currency !== 'BRL' ||
        remote.amountCents !== price.cents ||
        !remote.checkoutUrl ||
        !this.isAllowedCheckoutUrl(remote.checkoutUrl)
      )
        throw new Error('Mercado Pago returned an invalid subscription');
      validatedRemote = true;
      await this.prisma.billingSubscription.update({
        where: { id: local.id },
        data: this.subscriptionProjection(remote, { status: 'pending' }),
      });
      return remote.checkoutUrl;
    } catch (error) {
      // Once Mercado Pago accepted the idempotent request, keep the local row
      // reusable. A client retry uses the same local id/idempotency key and can
      // persist the same remote subscription without creating a duplicate.
      if (!validatedRemote)
        await this.prisma.billingSubscription.update({
          where: { id: local.id },
          data: { status: 'failed' },
        });
      throw error;
    }
  }

  /** Legacy portal compatibility: management now lives inside Patch. */
  async portal(userId: string): Promise<string> {
    if (!(await this.isPaid(userId))) throw new PatchGoRequiredException();
    return `${this.frontendUrl()}/go?manage=1`;
  }

  async changePlan(userId: string, plan: PaidPatchPlan) {
    return this.createCheckout(userId, plan === 'max' ? 'max_card_month' : 'go_card_month');
  }

  async cancel(userId: string): Promise<void> {
    const provider = this.requireProvider();
    const subscription = await this.currentSubscription(userId);
    if (!subscription?.providerSubscriptionId || !this.isActive(subscription))
      throw new PatchGoRequiredException();
    await provider.cancelSubscription(subscription.providerSubscriptionId);
    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: { status: 'canceled', cancelAtPeriodEnd: true, lastSyncedAt: new Date() },
    });
  }

  async createPaymentMethodSession(userId: string, requestedReturnTarget?: string) {
    this.requireProvider();
    const subscription = await this.currentSubscription(userId);
    if (!subscription?.providerSubscriptionId || !this.isActive(subscription))
      throw new PatchGoRequiredException();
    const token = randomBytes(32).toString('base64url');
    const returnUrl = this.allowedReturnUrl(requestedReturnTarget);
    await this.prisma.billingPaymentMethodSession.create({
      data: {
        subscriptionId: subscription.id,
        tokenHash: this.hashToken(token),
        returnUrl,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    return { url: `${this.frontendUrl()}/billing/payment-method#token=${token}` };
  }

  async paymentMethodSession(token: string) {
    const paymentMethodState = await this.prisma.billingPaymentMethodSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { subscription: true },
    });
    if (
      !paymentMethodState ||
      paymentMethodState.usedAt ||
      paymentMethodState.expiresAt.getTime() <= Date.now()
    )
      throw new PatchGoRequiredException();
    if (!this.config.MERCADO_PAGO_PUBLIC_KEY) throw new PatchGoNotConfiguredException();
    return {
      publicKey: this.config.MERCADO_PAGO_PUBLIC_KEY,
      plan: paymentMethodState.subscription.plan === 'max' ? ('max' as const) : ('go' as const),
      returnUrl: paymentMethodState.returnUrl,
    };
  }

  async updatePaymentMethod(
    sessionToken: string,
    cardToken: string,
  ): Promise<{ returnUrl: string }> {
    const provider = this.requireProvider();
    if (!cardToken || cardToken.length > 512) throw new PatchGoRequiredException();
    const tokenHash = this.hashToken(sessionToken);
    const paymentMethodState = await this.prisma.billingPaymentMethodSession.findUnique({
      where: { tokenHash },
      include: { subscription: true },
    });
    if (
      !paymentMethodState ||
      paymentMethodState.usedAt ||
      paymentMethodState.expiresAt.getTime() <= Date.now() ||
      !paymentMethodState.subscription.providerSubscriptionId
    )
      throw new PatchGoRequiredException();
    const claimed = await this.prisma.billingPaymentMethodSession.updateMany({
      where: { id: paymentMethodState.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new PatchGoRequiredException();
    await provider.updatePaymentMethod(
      paymentMethodState.subscription.providerSubscriptionId,
      cardToken,
    );
    return { returnUrl: paymentMethodState.returnUrl };
  }

  async payments(userId: string, page = 1, limit = 20) {
    const subscription = await this.currentSubscription(userId);
    if (!subscription)
      return { items: [], total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false };
    const where = { subscriptionId: subscription.id };
    const [items, total] = await Promise.all([
      this.prisma.billingPayment.findMany({
        where,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.billingPayment.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        amountCents: item.amountCents,
        currency: item.currency,
        paidAt: item.paidAt?.toISOString() ?? null,
        periodStart: item.periodStart?.toISOString() ?? null,
        periodEnd: item.periodEnd?.toISOString() ?? null,
      })),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  verifyWebhook(rawBody: string, signature: string, requestId: string): ProviderWebhookEvent {
    return this.requireProvider().verifyWebhook({ rawBody, signature, requestId });
  }

  async handleEvent(event: ProviderWebhookEvent): Promise<void> {
    if (event.type === 'ignored') return;
    const provider = this.requireProvider();
    const webhook = await this.claimWebhook(event);
    if (!webhook) return;
    try {
      if (event.type === 'subscription') {
        await this.syncSubscription(await provider.getSubscription(event.resourceId));
      } else if (event.type === 'authorized_payment') {
        await this.syncPayment(await provider.getAuthorizedPayment(event.resourceId));
      } else if (event.type === 'order') {
        await this.syncOrder(await provider.getOrder(event.resourceId));
      } else {
        // The payment topic is required by Mercado Pago, but authorized-payment
        // notifications carry the stable preapproval relationship we need.
        this.logger?.log(
          `Received Mercado Pago payment event ${event.resourceId}`,
          'BillingWebhook',
        );
      }
      await this.prisma.billingWebhookEvent.update({
        where: { id: webhook.id },
        data: { status: 'processed', processedAt: new Date(), lastError: null },
      });
    } catch (error) {
      await this.prisma.billingWebhookEvent.update({
        where: { id: webhook.id },
        data: {
          status: 'failed',
          lastError: error instanceof Error ? error.message.slice(0, 500) : 'unknown',
        },
      });
      throw error;
    }
  }

  async reconcile(): Promise<void> {
    if (!this.enabled || !this.provider) return;
    const subscriptions = await this.prisma.billingSubscription.findMany({
      where: {
        provider: 'mercado_pago',
        status: { in: ['pending', 'active', 'paused', 'canceled'] },
      },
      orderBy: { lastSyncedAt: 'asc' },
      take: 100,
    });
    for (const local of subscriptions) {
      if (!local.providerSubscriptionId) continue;
      try {
        const remote = await this.provider.getSubscription(local.providerSubscriptionId);
        await this.syncSubscription(remote);
        for (const payment of await this.provider.listAuthorizedPayments(remote.id))
          await this.syncPayment(payment);
      } catch (error) {
        this.logger?.error(`Billing reconciliation failed for subscription=${local.id}`, {
          context: 'BillingReconciliation',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
    const purchases = await this.prisma.billingPurchase.findMany({
      where: {
        provider: 'mercado_pago',
        providerOrderId: { not: null },
        status: { in: ['created', 'pending', 'reversing'] },
      },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });
    for (const purchase of purchases) {
      if (!purchase.providerOrderId) continue;
      try {
        await this.syncOrder(await this.provider.getOrder(purchase.providerOrderId));
      } catch (error) {
        this.logger?.error(`Billing order reconciliation failed for purchase=${purchase.id}`, {
          context: 'BillingReconciliation',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
  }

  private async syncSubscription(remote: ProviderSubscription): Promise<void> {
    const local = await this.findSubscription(remote);
    if (!local) return;
    if (remote.currency !== 'BRL') throw new Error('Unexpected Mercado Pago subscription currency');
    await this.prisma.billingSubscription.update({
      where: { id: local.id },
      data: this.subscriptionProjection(remote, {
        status:
          remote.status === 'canceled' && local.periodEnd && local.periodEnd.getTime() > Date.now()
            ? 'canceled'
            : remote.status,
        cancelAtPeriodEnd:
          remote.status === 'canceled' &&
          Boolean(local.periodEnd && local.periodEnd.getTime() > Date.now()),
      }),
    });
  }

  private async syncPayment(remote: ProviderPayment): Promise<void> {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { providerSubscriptionId: remote.subscriptionId },
    });
    if (!subscription) return;
    const existingPayment = await this.prisma.billingPayment.findUnique({
      where: { providerPaymentId: remote.id },
    });
    if (remote.status === 'refunded' || remote.status === 'charged_back') {
      if (!existingPayment || existingPayment.subscriptionId !== subscription.id) {
        this.logger?.error(`Rejected unknown Mercado Pago reversal=${remote.id}`, {
          context: 'BillingWebhook',
        });
        return;
      }
      await this.prisma.billingPayment.update({
        where: { id: existingPayment.id },
        data: { status: remote.status },
      });
      if (existingPayment.periodEnd && existingPayment.periodEnd.getTime() > Date.now()) {
        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`patch-checkout:${subscription.userId}`}))`;
          await tx.billingSubscription.update({
            where: { id: subscription.id },
            data: { status: 'revoked', periodEnd: new Date(), lastSyncedAt: new Date() },
          });
          await tx.billingEntitlement.updateMany({
            where: {
              userId: subscription.userId,
              source: 'mercado_pago_subscription',
              sourceRef: remote.id,
              status: 'active',
            },
            data: { status: 'revoked', terminatedAt: new Date(), endsAt: new Date() },
          });
        });
      }
      return;
    }
    const expectedPlan =
      subscription.pendingPlan === 'go' || subscription.pendingPlan === 'max'
        ? subscription.pendingPlan
        : subscription.plan === 'max'
          ? 'max'
          : 'go';
    const expected = PATCH_PLAN_PRICES[expectedPlan].BRL;
    if (remote.currency !== expected.currency || remote.amountCents !== expected.cents) {
      this.logger?.error(`Rejected mismatched Mercado Pago payment=${remote.id}`, {
        context: 'BillingWebhook',
        expectedAmountCents: expected.cents,
        actualAmountCents: remote.amountCents,
        actualCurrency: remote.currency,
      });
      return;
    }
    const paidAt = remote.paidAt ?? new Date();
    const remoteSubscription = await this.requireProvider().getSubscription(remote.subscriptionId);
    const periodEnd = remoteSubscription.nextPaymentAt ?? this.addMonth(paidAt);
    await this.prisma.billingPayment.upsert({
      where: { providerPaymentId: remote.id },
      create: {
        subscriptionId: subscription.id,
        providerPaymentId: remote.id,
        status: remote.status,
        amountCents: remote.amountCents,
        currency: remote.currency,
        paidAt,
        periodStart: remote.status === 'approved' ? paidAt : null,
        periodEnd: remote.status === 'approved' ? periodEnd : null,
      },
      update: { status: remote.status, paidAt },
    });
    if (remote.status === 'approved') {
      if (!this.prisma.billingPurchase || !this.prisma.billingEntitlement) {
        await this.prisma.billingSubscription.update({
          where: { id: subscription.id },
          data: {
            plan: expectedPlan,
            pendingPlan: null,
            status: 'active',
            periodStart: paidAt,
            periodEnd,
            nextPaymentAt: remoteSubscription.nextPaymentAt,
            providerVersion: remoteSubscription.version,
            providerPayerId: remoteSubscription.payerId,
            lastSyncedAt: new Date(),
          },
        });
        return;
      }
      const purchase = await this.prisma.billingPurchase.findFirst({
        where: { providerSubscriptionId: remote.subscriptionId },
        orderBy: { createdAt: 'desc' },
      });
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`patch-checkout:${subscription.userId}`}))`;
        await tx.billingSubscription.update({
          where: { id: subscription.id },
          data: {
            plan: expectedPlan,
            pendingPlan: null,
            status: 'active',
            periodStart: paidAt,
            periodEnd,
            nextPaymentAt: remoteSubscription.nextPaymentAt,
            providerVersion: remoteSubscription.version,
            providerPayerId: remoteSubscription.payerId,
            lastSyncedAt: new Date(),
          },
        });
        await tx.billingEntitlement.updateMany({
          where: {
            userId: subscription.userId,
            source: 'mercado_pago_subscription',
            sourceRef: remote.subscriptionId,
            status: 'active',
          },
          data: { status: 'replaced', terminatedAt: paidAt },
        });
        await tx.billingEntitlement.upsert({
          where: {
            source_sourceRef: { source: 'mercado_pago_subscription', sourceRef: remote.id },
          },
          create: {
            userId: subscription.userId,
            purchaseId: purchase?.id,
            source: 'mercado_pago_subscription',
            sourceRef: remote.id,
            plan: expectedPlan,
            startsAt: paidAt,
            endsAt: periodEnd,
            quotaAnchorAt: paidAt,
          },
          update: { status: 'active', plan: expectedPlan, endsAt: periodEnd },
        });
        if (purchase)
          await tx.billingPurchase.update({
            where: { id: purchase.id },
            data: {
              status: 'approved',
              approvedAt: paidAt,
              providerPaymentId: remote.id,
            },
          });
      });
    }
  }

  private async syncOrder(remote: ProviderOrder): Promise<void> {
    const purchase = await this.prisma.billingPurchase.findFirst({
      where: {
        OR: [
          { providerOrderId: remote.id },
          ...(remote.externalReference ? [{ externalReference: remote.externalReference }] : []),
        ],
      },
    });
    if (!purchase) {
      this.logger?.error(`Rejected unknown Mercado Pago order=${remote.id}`, {
        context: 'BillingWebhook',
      });
      return;
    }
    if (
      remote.currency !== purchase.currency ||
      remote.amountCents !== purchase.amountCents ||
      remote.externalReference !== purchase.externalReference
    ) {
      this.logger?.error(`Rejected mismatched Mercado Pago order=${remote.id}`, {
        context: 'BillingWebhook',
      });
      return;
    }
    if (remote.status === 'approved') {
      await this.prisma.billingPurchase.update({
        where: { id: purchase.id },
        data: {
          providerOrderId: remote.id,
          providerPaymentId: remote.paymentId,
          status: 'pending',
        },
      });
      if (purchase.kind === 'card_plan_change') await this.applyRecurringPlanChange(purchase);
      if (purchase.kind === 'pix_prepaid') await this.cancelRecurringSubscription(purchase.userId);
      await this.approvePurchase(
        purchase.id,
        remote.paymentId ?? remote.id,
        remote.paidAt ?? new Date(),
      );
      return;
    }
    if (remote.status === 'refunded' || remote.status === 'charged_back') {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`patch-checkout:${purchase.userId}`}))`;
        await tx.billingPurchase.update({
          where: { id: purchase.id },
          data: { status: 'reversing' },
        });
      });
      if (purchase.kind === 'card_plan_change') await this.rollbackRecurringPlanChange(purchase);
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`patch-checkout:${purchase.userId}`}))`;
        await tx.billingPurchase.update({
          where: { id: purchase.id },
          data: { status: remote.status, providerOrderId: remote.id },
        });
        await tx.billingEntitlement.updateMany({
          where: { purchaseId: purchase.id, status: 'active' },
          data: { status: 'revoked', terminatedAt: new Date(), endsAt: new Date() },
        });
        const replaced = await tx.billingEntitlement.findFirst({
          where: {
            userId: purchase.userId,
            status: 'replaced',
            terminatedAt: purchase.approvedAt,
            endsAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (replaced)
          await tx.billingEntitlement.update({
            where: { id: replaced.id },
            data: { status: 'active', terminatedAt: null },
          });
        if (purchase.prorationCreditCents > 0)
          await tx.billingCreditEntry.upsert({
            where: { reference: `reversal-proration:${purchase.id}` },
            create: {
              userId: purchase.userId,
              purchaseId: purchase.id,
              amountCents: -purchase.prorationCreditCents,
              reason: remote.status,
              reference: `reversal-proration:${purchase.id}`,
            },
            update: {},
          });
        if (purchase.creditAppliedCents > 0)
          await tx.billingCreditEntry.upsert({
            where: { reference: `reversal-checkout:${purchase.id}` },
            create: {
              userId: purchase.userId,
              purchaseId: purchase.id,
              amountCents: purchase.creditAppliedCents,
              reason: remote.status,
              reference: `reversal-checkout:${purchase.id}`,
            },
            update: {},
          });
      });
      return;
    }
    const failed = remote.status === 'rejected' || remote.status === 'canceled';
    await this.prisma.billingPurchase.update({
      where: { id: purchase.id },
      data: {
        providerOrderId: remote.id,
        providerPaymentId: remote.paymentId,
        status: failed
          ? purchase.expiresAt.getTime() <= Date.now()
            ? 'expired'
            : remote.status
          : 'pending',
        pixQrCode: remote.qrCode,
        pixQrCodeBase64: remote.qrCodeBase64,
        pixTicketUrl: remote.ticketUrl,
        ...(failed ? { failedAt: new Date() } : {}),
      },
    });
  }

  private async approvePurchase(purchaseId: string, providerPaymentId: string, paidAt: Date) {
    const owner = await this.prisma.billingPurchase.findUniqueOrThrow({
      where: { id: purchaseId },
      select: { userId: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`patch-checkout:${owner.userId}`}))`;
      const purchase = await tx.billingPurchase.findUniqueOrThrow({ where: { id: purchaseId } });
      if (purchase.status === 'approved') return;
      const offer = PATCH_BILLING_OFFERS[purchase.offerCode as BillingOfferCode];
      if (!offer || purchase.currency !== 'BRL') throw new Error('Unknown billing offer');
      const current = await tx.billingEntitlement.findFirst({
        where: {
          userId: purchase.userId,
          status: 'active',
          startsAt: { lte: paidAt },
          endsAt: { gt: paidAt },
        },
        orderBy: { endsAt: 'desc' },
      });
      let startsAt = paidAt;
      let quotaAnchorAt = paidAt;
      if (purchase.kind === 'card_plan_change' && current) {
        await tx.billingEntitlement.update({
          where: { id: current.id },
          data: { status: 'replaced', terminatedAt: paidAt },
        });
        if (purchase.prorationCreditCents > 0)
          await tx.billingCreditEntry.upsert({
            where: { reference: `proration:${purchase.id}` },
            create: {
              userId: purchase.userId,
              purchaseId: purchase.id,
              amountCents: purchase.prorationCreditCents,
              reason: 'proration',
              reference: `proration:${purchase.id}`,
            },
            update: {},
          });
        quotaAnchorAt = current.quotaAnchorAt;
      } else if (current?.plan === offer.plan) {
        startsAt = current.endsAt > paidAt ? current.endsAt : paidAt;
        quotaAnchorAt = current.quotaAnchorAt;
      } else if (current) {
        await tx.billingEntitlement.update({
          where: { id: current.id },
          data: { status: 'replaced', terminatedAt: paidAt },
        });
        if (purchase.prorationCreditCents > 0)
          await tx.billingCreditEntry.upsert({
            where: { reference: `proration:${purchase.id}` },
            create: {
              userId: purchase.userId,
              purchaseId: purchase.id,
              amountCents: purchase.prorationCreditCents,
              reason: 'proration',
              reference: `proration:${purchase.id}`,
            },
            update: {},
          });
        quotaAnchorAt = current.quotaAnchorAt;
      }
      if (purchase.creditAppliedCents > 0)
        await tx.billingCreditEntry.upsert({
          where: { reference: `checkout:${purchase.id}` },
          create: {
            userId: purchase.userId,
            purchaseId: purchase.id,
            amountCents: -purchase.creditAppliedCents,
            reason: 'checkout',
            reference: `checkout:${purchase.id}`,
          },
          update: {},
        });
      const endsAt =
        purchase.kind === 'card_plan_change' && current
          ? current.endsAt
          : this.addCalendarMonths(startsAt, purchase.termMonths);
      await tx.billingEntitlement.create({
        data: {
          userId: purchase.userId,
          purchaseId: purchase.id,
          source:
            purchase.kind === 'pix_prepaid'
              ? 'mercado_pago_pix'
              : purchase.kind === 'card_plan_change'
                ? 'mercado_pago_card_adjustment'
                : 'mercado_pago_card',
          sourceRef: providerPaymentId,
          plan: offer.plan,
          startsAt,
          endsAt,
          quotaAnchorAt,
        },
      });
      await tx.billingPurchase.update({
        where: { id: purchase.id },
        data: { status: 'approved', approvedAt: paidAt, providerPaymentId },
      });
    });
  }

  private async claimWebhook(event: ProviderWebhookEvent) {
    const existing = await this.prisma.billingWebhookEvent.findUnique({
      where: {
        provider_providerEventId: { provider: 'mercado_pago', providerEventId: event.eventId },
      },
    });
    if (existing?.status === 'processed') return null;
    if (existing?.status === 'processing' && existing.updatedAt.getTime() > Date.now() - 5 * 60_000)
      return null;
    if (existing)
      return this.prisma.billingWebhookEvent.update({
        where: { id: existing.id },
        data: { status: 'processing', attempts: { increment: 1 }, lastError: null },
      });
    return this.prisma.billingWebhookEvent.create({
      data: {
        provider: 'mercado_pago',
        providerEventId: event.eventId,
        type: event.type,
        resourceId: event.resourceId,
      },
    });
  }

  private async findSubscription(remote: ProviderSubscription) {
    const byProvider = await this.prisma.billingSubscription.findUnique({
      where: { providerSubscriptionId: remote.id },
    });
    if (byProvider) return byProvider;
    const localId = remote.externalReference?.split(':').at(-1);
    if (!localId) return null;
    return this.prisma.billingSubscription.findUnique({ where: { id: localId } });
  }

  private subscriptionProjection(
    remote: ProviderSubscription,
    overrides: { status?: string; cancelAtPeriodEnd?: boolean } = {},
  ) {
    return {
      providerSubscriptionId: remote.id,
      providerPayerId: remote.payerId,
      providerVersion: remote.version,
      checkoutUrl: remote.checkoutUrl,
      status: overrides.status ?? remote.status,
      amountCents: remote.amountCents,
      currency: remote.currency,
      nextPaymentAt: remote.nextPaymentAt,
      cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
      lastSyncedAt: new Date(),
    };
  }

  private requireProvider(): PaymentProviderPort {
    if (!this.enabled || !this.provider) throw new PatchGoNotConfiguredException();
    return this.provider;
  }

  private frontendUrl(): string {
    if (!this.config.FRONTEND_URL) throw new PatchGoNotConfiguredException();
    return this.config.FRONTEND_URL.replace(/\/$/, '');
  }

  private isActive(
    billing:
      | { status: string; periodStart: Date | null; periodEnd: Date | null }
      | null
      | undefined,
  ): boolean {
    if (!billing?.periodStart || !billing.periodEnd) return false;
    const now = Date.now();
    return (
      billing.status !== 'revoked' &&
      billing.periodStart.getTime() <= now &&
      billing.periodEnd.getTime() > now
    );
  }

  private currentEntitlement(userId: string) {
    if (!this.prisma.billingEntitlement) return Promise.resolve(null);
    const now = new Date();
    return this.prisma.billingEntitlement.findFirst({
      where: { userId, status: 'active', startsAt: { lte: now }, endsAt: { gt: now } },
      include: { purchase: true },
      orderBy: [{ plan: 'desc' }, { endsAt: 'desc' }],
    });
  }

  private async creditBalance(userId: string): Promise<number> {
    if (!this.prisma.billingCreditEntry) return 0;
    const total = await this.prisma.billingCreditEntry.aggregate({
      where: { userId, currency: 'BRL' },
      _sum: { amountCents: true },
    });
    return Math.max(0, total._sum.amountCents ?? 0);
  }

  private async unusedEntitlementValue(entitlement: {
    plan: string;
    startsAt: Date;
    endsAt: Date;
    purchase: { amountCents: number; creditAppliedCents: number } | null;
  }): Promise<number> {
    const now = Date.now();
    if (entitlement.endsAt.getTime() <= now) return 0;
    const paidCents = entitlement.purchase
      ? entitlement.purchase.amountCents + entitlement.purchase.creditAppliedCents
      : PATCH_PLAN_PRICES[entitlement.plan === 'max' ? 'max' : 'go'].BRL.cents;
    if (paidCents <= 0) return 0;
    const duration = entitlement.endsAt.getTime() - entitlement.startsAt.getTime();
    const remaining = entitlement.endsAt.getTime() - Math.max(now, entitlement.startsAt.getTime());
    return duration > 0 ? Math.floor((paidCents * remaining) / duration) : 0;
  }

  private proratedAmount(
    fullAmountCents: number,
    entitlement: { startsAt: Date; endsAt: Date },
  ): number {
    const now = Date.now();
    const duration = entitlement.endsAt.getTime() - entitlement.startsAt.getTime();
    const remaining = entitlement.endsAt.getTime() - Math.max(now, entitlement.startsAt.getTime());
    return duration > 0
      ? Math.max(0, Math.ceil((fullAmountCents * remaining) / duration))
      : fullAmountCents;
  }

  private async applyRecurringPlanChange(purchase: {
    userId: string;
    plan: string;
  }): Promise<void> {
    const subscription = await this.currentSubscription(purchase.userId);
    if (!subscription?.providerSubscriptionId || !this.isActive(subscription))
      throw new PatchGoRequiredException();
    const plan = purchase.plan === 'max' ? 'max' : 'go';
    const amountCents = PATCH_PLAN_PRICES[plan].BRL.cents;
    const remote = await this.requireProvider().updateSubscriptionAmount(
      subscription.providerSubscriptionId,
      amountCents,
    );
    if (remote.currency !== 'BRL' || remote.amountCents !== amountCents)
      throw new Error('Mercado Pago did not apply the requested plan price');
    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        pendingPlan: null,
        amountCents,
        providerVersion: remote.version,
        nextPaymentAt: remote.nextPaymentAt,
        lastSyncedAt: new Date(),
      },
    });
  }

  private async cancelRecurringSubscription(userId: string): Promise<void> {
    const subscription = await this.currentSubscription(userId);
    if (!subscription?.providerSubscriptionId || !this.isActive(subscription)) return;
    await this.requireProvider().cancelSubscription(subscription.providerSubscriptionId);
    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: false,
        periodEnd: new Date(),
        lastSyncedAt: new Date(),
      },
    });
  }

  private async rollbackRecurringPlanChange(purchase: {
    userId: string;
    approvedAt: Date | null;
  }): Promise<void> {
    if (!purchase.approvedAt) return;
    const replaced = await this.prisma.billingEntitlement.findFirst({
      where: {
        userId: purchase.userId,
        status: 'replaced',
        terminatedAt: purchase.approvedAt,
        endsAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!replaced) return;
    const subscription = await this.currentSubscription(purchase.userId);
    if (!subscription?.providerSubscriptionId) return;
    const plan = replaced.plan === 'max' ? 'max' : 'go';
    const amountCents = PATCH_PLAN_PRICES[plan].BRL.cents;
    const remote = await this.requireProvider().updateSubscriptionAmount(
      subscription.providerSubscriptionId,
      amountCents,
    );
    if (remote.currency !== 'BRL' || remote.amountCents !== amountCents)
      throw new Error('Mercado Pago did not roll back the recurring plan price');
    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: { plan, amountCents, pendingPlan: null, lastSyncedAt: new Date() },
    });
  }

  private async founderRemaining(): Promise<number> {
    const offer = PATCH_BILLING_OFFERS.max_pix_year_founder;
    const reserved = await this.prisma.billingPurchase.count({
      where: {
        offerCode: offer.code,
        OR: [
          { status: 'approved' },
          { status: { in: ['created', 'pending'] }, expiresAt: { gt: new Date() } },
        ],
      },
    });
    return Math.max(0, (offer.founderLimit ?? 0) - reserved);
  }

  private checkoutResponse(purchase: {
    id: string;
    offerCode: string;
    kind: string;
    status: string;
    amountCents: number;
    listAmountCents: number;
    creditAppliedCents: number;
    currency: string;
    expiresAt: Date;
    pixQrCode: string | null;
    pixQrCodeBase64: string | null;
    pixTicketUrl: string | null;
  }) {
    const cardCheckout =
      purchase.kind === 'card_subscription' || purchase.kind === 'card_plan_change';
    if (cardCheckout && !this.config.MERCADO_PAGO_PUBLIC_KEY)
      throw new PatchGoNotConfiguredException();
    return {
      id: purchase.id,
      offerCode: purchase.offerCode,
      kind: purchase.kind === 'pix_prepaid' ? ('pix' as const) : ('card' as const),
      status: purchase.status,
      amountCents: purchase.amountCents,
      listAmountCents: purchase.listAmountCents,
      creditAppliedCents: purchase.creditAppliedCents,
      currency: purchase.currency,
      expiresAt: purchase.expiresAt.toISOString(),
      publicKey: cardCheckout ? (this.config.MERCADO_PAGO_PUBLIC_KEY ?? null) : null,
      qrCode: purchase.pixQrCode,
      qrCodeBase64: purchase.pixQrCodeBase64,
      ticketUrl: purchase.pixTicketUrl,
    };
  }

  private quotaWindow(anchor: Date, now = new Date()): { start: Date; end: Date } {
    let monthOffset =
      (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
      now.getUTCMonth() -
      anchor.getUTCMonth();
    let start = this.addCalendarMonths(anchor, Math.max(0, monthOffset));
    if (start.getTime() > now.getTime()) {
      monthOffset--;
      start = this.addCalendarMonths(anchor, Math.max(0, monthOffset));
    }
    return { start, end: this.addCalendarMonths(anchor, Math.max(0, monthOffset) + 1) };
  }

  private addCalendarMonths(anchor: Date, months: number): Date {
    const result = new Date(anchor);
    const originalDay = anchor.getUTCDate();
    result.setUTCDate(1);
    result.setUTCFullYear(anchor.getUTCFullYear(), anchor.getUTCMonth() + months, 1);
    const lastDay = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
    ).getUTCDate();
    result.setUTCDate(Math.min(originalDay, lastDay));
    return result;
  }

  private async currentSubscription(userId: string) {
    const current = await this.prisma.billingSubscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'paused', 'canceled'] },
        periodStart: { lte: new Date() },
        periodEnd: { gt: new Date() },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (current) return current;
    return this.prisma.billingSubscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private addMonth(date: Date): Date {
    const next = new Date(date);
    const originalDay = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
    ).getUTCDate();
    next.setUTCDate(Math.min(originalDay, lastDay));
    return next;
  }

  private isAllowedCheckoutUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        (url.hostname === 'mercadopago.com.br' || url.hostname.endsWith('.mercadopago.com.br'))
      );
    } catch {
      return false;
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private allowedReturnUrl(requested?: string): string {
    const fallback = `${this.frontendUrl()}/go?paymentMethod=success`;
    if (!requested) return fallback;
    if (requested === 'patchcareers://go?paymentMethod=success') return requested;
    try {
      const candidate = new URL(requested);
      const frontend = new URL(this.frontendUrl());
      if (candidate.origin === frontend.origin && candidate.pathname.endsWith('/go'))
        return requested;
    } catch {
      return fallback;
    }
    return fallback;
  }
}
