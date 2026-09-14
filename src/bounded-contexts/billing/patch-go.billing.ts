import type { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import type { EnvConfig } from '@/shared-kernel/config/config.schema';
import { PATCH_GO_MONTHLY_LIMIT, PATCH_GO_PRICES } from './patch-go.constants';
import {
  PatchGoLimitReachedException,
  PatchGoNotConfiguredException,
  PatchGoRequiredException,
} from './patch-go.exceptions';

type BillingConfig = Pick<
  EnvConfig,
  | 'PATCH_GO_ENABLED'
  | 'STRIPE_SECRET_KEY'
  | 'STRIPE_WEBHOOK_SECRET'
  | 'STRIPE_PRICE_BRL_MONTHLY'
  | 'STRIPE_PRICE_USD_MONTHLY'
  | 'FRONTEND_URL'
>;

export type PatchGoReservation = { userId: string; periodStart: Date };

/** Stripe is the source of truth for subscription state. The database is a
 * webhook-maintained projection used to enforce access at request time. */
export class PatchGoBilling {
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: BillingConfig,
  ) {
    this.stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;
  }

  get enabled(): boolean {
    return this.config.PATCH_GO_ENABLED === true;
  }

  async status(userId: string) {
    if (!this.enabled) {
      return {
        enabled: false,
        status: 'unavailable',
        active: false,
        used: 0,
        limit: PATCH_GO_MONTHLY_LIMIT,
        periodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
    const billing = await this.prisma.patchGoBilling.findUnique({ where: { userId } });
    const active = this.isActive(billing);
    const used = billing?.periodStart
      ? ((
          await this.prisma.patchGoUsage.findUnique({
            where: { userId_periodStart: { userId, periodStart: billing.periodStart } },
          })
        )?.count ?? 0)
      : 0;
    return {
      enabled: true,
      status: billing?.status ?? 'none',
      active,
      used,
      limit: PATCH_GO_MONTHLY_LIMIT,
      periodEnd: billing?.periodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
    };
  }

  /** One atomic SQL statement admits at most 30 requests per billing period,
   * even when the candidate opens multiple tailoring tabs at once. */
  async reserve(userId: string): Promise<PatchGoReservation | null> {
    if (!this.enabled) return null;
    const rows = await this.prisma.$queryRaw<Array<{ periodStart: Date }>>`
      INSERT INTO "patch_go_usage" ("userId", "periodStart", "count")
      SELECT "userId", "periodStart", 1 FROM "patch_go_billing"
      WHERE "userId" = ${userId}
        AND "status" IN ('active', 'trialing')
        AND "periodStart" <= NOW() AND "periodEnd" > NOW()
      ON CONFLICT ("userId", "periodStart") DO UPDATE
        SET "count" = "patch_go_usage"."count" + 1
        WHERE "patch_go_usage"."count" < ${PATCH_GO_MONTHLY_LIMIT}
      RETURNING "periodStart"
    `;
    if (rows[0]) return { userId, periodStart: rows[0].periodStart };
    const billing = await this.prisma.patchGoBilling.findUnique({ where: { userId } });
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

  async checkout(userId: string, market: keyof typeof PATCH_GO_PRICES): Promise<string> {
    const stripe = this.requireStripe();
    const billing = await this.prisma.patchGoBilling.findUnique({ where: { userId } });
    if (this.isActive(billing)) return this.portal(userId);
    const price =
      market === 'BRL'
        ? this.config.STRIPE_PRICE_BRL_MONTHLY
        : this.config.STRIPE_PRICE_USD_MONTHLY;
    if (!price) throw new PatchGoNotConfiguredException();
    const stripePrice = await stripe.prices.retrieve(price);
    if (
      stripePrice.active !== true ||
      stripePrice.currency.toUpperCase() !== PATCH_GO_PRICES[market].currency ||
      stripePrice.unit_amount !== PATCH_GO_PRICES[market].amount * 100 ||
      stripePrice.recurring?.interval !== 'month' ||
      stripePrice.recurring.interval_count !== 1
    ) {
      throw new PatchGoNotConfiguredException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const base = this.frontendUrl();
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      client_reference_id: userId,
      subscription_data: { metadata: { userId } },
      ...(billing?.stripeCustomerId
        ? { customer: billing.stripeCustomerId }
        : user?.email
          ? { customer_email: user.email }
          : {}),
      billing_address_collection: 'required',
      success_url: `${base}/go?checkout=success`,
      cancel_url: `${base}/go?checkout=cancel`,
    });
    if (!checkout.url) throw new Error('Stripe did not return a Checkout URL');
    return checkout.url;
  }

  async portal(userId: string): Promise<string> {
    const stripe = this.requireStripe();
    const billing = await this.prisma.patchGoBilling.findUnique({ where: { userId } });
    if (!billing?.stripeCustomerId) throw new PatchGoRequiredException();
    const portal = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${this.frontendUrl()}/go`,
    });
    return portal.url;
  }

  async constructEvent(rawBody: string, signature: string): Promise<Stripe.Event> {
    const stripe = this.requireStripe();
    if (!this.config.STRIPE_WEBHOOK_SECRET) throw new PatchGoNotConfiguredException();
    return stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      this.config.STRIPE_WEBHOOK_SECRET,
    );
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    const stripe = this.requireStripe();
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription' || typeof session.subscription !== 'string') return;
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await this.sync(subscription, session.client_reference_id ?? undefined);
      return;
    }
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const payload = event.data.object as Stripe.Subscription;
      // Fetch current state to tolerate out-of-order webhook delivery.
      const subscription =
        event.type === 'customer.subscription.deleted'
          ? payload
          : await stripe.subscriptions.retrieve(payload.id);
      await this.sync(subscription);
    }
  }

  private async sync(subscription: Stripe.Subscription, sessionUserId?: string): Promise<void> {
    const item = subscription.items.data[0];
    if (!item) return;
    const allowedPrices = [
      this.config.STRIPE_PRICE_BRL_MONTHLY,
      this.config.STRIPE_PRICE_USD_MONTHLY,
    ];
    if (!allowedPrices.includes(item.price.id)) return;
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const existing = await this.prisma.patchGoBilling.findUnique({
      where: { stripeCustomerId: customerId },
    });
    const userId = subscription.metadata.userId || sessionUserId || existing?.userId;
    if (!userId) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return;
    if (existing && existing.userId !== userId)
      throw new Error('Stripe customer belongs to another user');
    const current = await this.prisma.patchGoBilling.findUnique({ where: { userId } });
    if (current?.stripeSubscriptionId && current.stripeSubscriptionId !== subscription.id) {
      // A late event from an older checkout must not cancel or replace the
      // current active subscription. Never give access from a second pending
      // subscription while a first active subscription is still projected.
      if (this.isActive(current) || !['active', 'trialing'].includes(subscription.status)) return;
    }
    await this.prisma.patchGoBilling.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        priceId: item.price.id,
        status: subscription.status,
        periodStart: new Date(item.current_period_start * 1000),
        periodEnd: new Date(item.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        priceId: item.price.id,
        status: subscription.status,
        periodStart: new Date(item.current_period_start * 1000),
        periodEnd: new Date(item.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private requireStripe(): Stripe {
    if (!this.enabled || !this.stripe) throw new PatchGoNotConfiguredException();
    return this.stripe;
  }

  private frontendUrl(): string {
    if (!this.config.FRONTEND_URL) throw new PatchGoNotConfiguredException();
    return this.config.FRONTEND_URL.replace(/\/$/, '');
  }

  private isActive(
    billing: { status: string; periodStart: Date | null; periodEnd: Date | null } | null,
  ): boolean {
    if (!billing?.periodStart || !billing.periodEnd) return false;
    const now = Date.now();
    return (
      (billing.status === 'active' || billing.status === 'trialing') &&
      billing.periodStart.getTime() <= now &&
      billing.periodEnd.getTime() > now
    );
  }
}
