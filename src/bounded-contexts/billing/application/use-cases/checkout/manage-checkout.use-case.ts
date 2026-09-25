import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { BillingPurchase } from '../../../domain/entities/billing-purchase.entity';
import {
  BillingBusyException,
  BillingInvariantException,
  PatchGoNotConfiguredException,
  PatchGoRequiredException,
} from '../../../domain/exceptions/billing.exceptions';
import {
  type BillingOfferCode,
  CARD_CHECKOUT_TTL_MS,
  PATCH_BILLING_OFFERS,
  PIX_CHECKOUT_TTL_MS,
} from '../../../domain/policies/billing-offer.policy';
import type { BillingStorePort } from '../../../domain/ports/billing-store.port';
import { BillingUnitOfWorkPort } from '../../../domain/ports/billing-store.port';
import type { PaymentProviderPort } from '../../../domain/ports/payment-provider.port';
import type { BillingRuntimeConfig } from '../../ports/billing-runtime.port';
import { BillingClockPort, BillingIdPort } from '../../ports/billing-runtime.port';
import { ProcessProviderEventUseCase } from '../provider/process-provider-event.use-case';

export class ManageCheckoutUseCase {
  constructor(
    private readonly store: BillingStorePort,
    private readonly unit: BillingUnitOfWorkPort,
    private readonly provider: PaymentProviderPort | null,
    private readonly processProvider: ProcessProviderEventUseCase | null,
    private readonly lock: DistributedLockPort,
    private readonly ids: BillingIdPort,
    private readonly clock: BillingClockPort,
    private readonly config: BillingRuntimeConfig,
    private readonly logger?: LoggerPort,
  ) {}

  async offers() {
    const remaining = Math.max(
      0,
      100 - (await this.store.founderReserved('max_pix_year_founder', this.clock.now())),
    );
    const items = Object.values(PATCH_BILLING_OFFERS)
      .filter((offer) =>
        offer.paymentMethod === 'card' ? this.config.cardEnabled : this.config.pixEnabled,
      )
      .filter((offer) => offer.code !== 'max_pix_year_founder' || remaining > 0)
      .map((offer) => ({ ...offer, founderRemaining: offer.founderLimit ? remaining : null }));
    return { checkoutEnabled: this.config.enabled && Boolean(this.provider), items };
  }

  async create(userId: string, offerCode: BillingOfferCode) {
    if (!this.config.enabled) throw new PatchGoNotConfiguredException();
    const provider = this.requireProvider();
    const offer = PATCH_BILLING_OFFERS[offerCode];
    if (
      !offer ||
      (offer.paymentMethod === 'card' ? !this.config.cardEnabled : !this.config.pixEnabled)
    )
      throw new PatchGoRequiredException();
    const email = await this.store.findCustomerEmail(userId);
    if (!email) throw new PatchGoRequiredException();
    const created = await this.lock.withLock(
      `billing:user:${userId}`,
      { ttlMs: 30_000 },
      async () => {
        const work = async () =>
          this.unit.execute(async (tx) => {
            const now = this.clock.now();
            const open = await tx.findOpenPurchase(userId, now);
            if (open) {
              if (open.offerCode !== offerCode) throw new PatchGoRequiredException();
              return { purchase: open, fresh: false };
            }
            const entitlement = await tx.findActiveEntitlement(userId, now);
            const subscription = await tx.findCurrentSubscription(userId, now);
            if (entitlement?.plan === 'max' && offer.plan === 'go')
              throw new PatchGoRequiredException();
            const proration =
              entitlement && entitlement.plan !== offer.plan
                ? await this.unusedValue(
                    tx,
                    entitlement.purchaseId,
                    entitlement.startsAt,
                    entitlement.endsAt,
                    now,
                  )
                : 0;
            const cardChange = Boolean(
              offer.recurring && entitlement && entitlement.plan !== offer.plan,
            );
            if (offer.recurring && entitlement && !subscription?.providerSubscriptionId)
              throw new PatchGoRequiredException();
            const target =
              cardChange && entitlement
                ? this.proratedAmount(
                    offer.amountCents,
                    entitlement.startsAt,
                    entitlement.endsAt,
                    now,
                  )
                : offer.amountCents;
            const balance =
              offer.paymentMethod === 'pix' || cardChange ? await tx.creditBalance(userId) : 0;
            const creditApplied = Math.min(target, Math.max(0, balance + proration));
            const purchaseId = this.ids.id();
            const purchase = BillingPurchase.create({
              id: purchaseId,
              userId,
              subscriptionId: null,
              offerCode,
              plan: offer.plan,
              kind: cardChange
                ? 'card_plan_change'
                : offer.recurring
                  ? 'card_subscription'
                  : 'pix_prepaid',
              amountCents: target - creditApplied,
              listAmountCents: offer.listAmountCents,
              prorationCreditCents: proration,
              creditAppliedCents: creditApplied,
              currency: 'BRL',
              termMonths: offer.termMonths,
              externalReference: `patch:${purchaseId}`,
              expiresAt: new Date(
                now.getTime() +
                  (offer.paymentMethod === 'pix' ? PIX_CHECKOUT_TTL_MS : CARD_CHECKOUT_TTL_MS),
              ),
            });
            await tx.savePurchase(purchase);
            await tx.appendEvents(purchase.pullEvents());
            return { purchase: purchase.snapshot, fresh: true };
          });
        if (!offer.founderLimit) return work();
        const founder = await this.lock.withLock('billing:founder', { ttlMs: 30_000 }, async () => {
          if (
            (await this.store.founderReserved(offerCode, this.clock.now())) >= offer.founderLimit!
          )
            throw new PatchGoRequiredException();
          return work();
        });
        if (!founder) throw new BillingBusyException();
        return founder;
      },
    );
    if (!created) throw new BillingBusyException();
    let purchase = created.purchase;
    if (purchase.amountCents === 0) {
      if (purchase.kind === 'card_plan_change') {
        const subscription = await this.store.findCurrentSubscription(userId, this.clock.now());
        if (!subscription?.providerSubscriptionId) throw new PatchGoRequiredException();
        const remote = await provider.updateSubscriptionAmount(
          subscription.providerSubscriptionId,
          offer.amountCents,
        );
        if (remote.currency !== 'BRL' || remote.amountCents !== offer.amountCents)
          throw new BillingInvariantException('provider subscription amount or currency mismatch');
        await this.store.updateSubscription({
          ...subscription,
          plan: offer.plan,
          pendingPlan: null,
          amountCents: offer.amountCents,
          providerVersion: remote.version,
          nextPaymentAt: remote.nextPaymentAt,
        });
      }
      await this.processProvider?.approve(purchase.id, `credit:${purchase.id}`, this.clock.now());
      return this.status(userId, purchase.id, false);
    }
    if (!created.fresh && (offer.paymentMethod === 'card' || purchase.providerOrderId))
      return this.status(userId, purchase.id, false);
    if (offer.paymentMethod === 'card') return this.response(purchase);
    const order = await provider.createPixOrder({
      purchaseId: purchase.id,
      externalReference: purchase.externalReference,
      email,
      amountCents: purchase.amountCents,
      currency: 'BRL',
      expirationMinutes: PIX_CHECKOUT_TTL_MS / 60_000,
    });
    await this.processProvider?.syncOrder(order);
    purchase = (await this.store.findPurchase(purchase.id, userId)) ?? purchase;
    return this.response(purchase);
  }

  async submitCard(
    userId: string,
    purchaseId: string,
    cardToken: string,
    paymentMethodId?: string,
    installments = 1,
  ) {
    const provider = this.requireProvider();
    const state = await this.store.findPurchase(purchaseId, userId);
    if (
      !state ||
      !['card_subscription', 'card_plan_change'].includes(state.kind) ||
      state.status !== 'created' ||
      state.expiresAt <= this.clock.now()
    )
      throw new PatchGoRequiredException();
    const offer = PATCH_BILLING_OFFERS[state.offerCode];
    const email = await this.store.findCustomerEmail(userId);
    if (!email || !cardToken || installments !== 1) throw new PatchGoRequiredException();
    if (state.kind === 'card_plan_change') {
      if (!paymentMethodId) throw new PatchGoRequiredException();
      await this.processProvider?.syncOrder(
        await provider.createCardOrder({
          purchaseId,
          externalReference: state.externalReference,
          email,
          amountCents: state.amountCents,
          currency: 'BRL',
          cardToken,
          paymentMethodId,
          installments,
        }),
      );
      return this.status(userId, purchaseId, false);
    }
    const subscription = await this.unit.execute(async (tx) => {
      const created = await tx.createSubscription(userId, offer.plan, offer.amountCents);
      const purchase = BillingPurchase.restore(state);
      purchase.attachSubscription(created.id, 'creating');
      await tx.savePurchase(purchase);
      return created;
    });
    const remote = await provider.createSubscription({
      localSubscriptionId: subscription.id,
      userId,
      email,
      plan: offer.plan,
      amountCents: offer.amountCents,
      currency: 'BRL',
      returnUrl: `${this.config.frontendUrl}/billing/checkout?checkout=${purchaseId}`,
      cardToken,
    });
    if (remote.currency !== 'BRL' || remote.amountCents !== offer.amountCents)
      throw new BillingInvariantException('provider subscription amount or currency mismatch');
    await this.store.updateSubscription({
      ...subscription,
      providerSubscriptionId: remote.id,
      providerPayerId: remote.payerId,
      providerVersion: remote.version,
      status: remote.status,
      nextPaymentAt: remote.nextPaymentAt,
    });
    const purchase = BillingPurchase.restore((await this.store.findPurchase(purchaseId))!);
    purchase.attachSubscription(subscription.id, remote.id);
    await this.store.savePurchase(purchase);
    return this.status(userId, purchaseId, false);
  }

  async status(userId: string, id: string, refresh = true) {
    let purchase = await this.store.findPurchase(id, userId);
    if (!purchase) throw new PatchGoRequiredException();
    if (
      refresh &&
      purchase.providerOrderId &&
      ['created', 'pending', 'reversing'].includes(purchase.status)
    ) {
      await this.processProvider?.syncOrder(
        await this.requireProvider().getOrder(purchase.providerOrderId),
      );
      purchase = await this.store.findPurchase(id, userId);
    }
    return this.response(purchase!);
  }

  private response(purchase: Awaited<ReturnType<BillingStorePort['findPurchase']>> & {}) {
    return {
      id: purchase.id,
      offerCode: purchase.offerCode,
      kind: purchase.kind === 'pix_prepaid' ? 'pix' : 'card',
      status: purchase.status,
      amountCents: purchase.amountCents,
      listAmountCents: purchase.listAmountCents,
      creditAppliedCents: purchase.creditAppliedCents,
      currency: purchase.currency,
      expiresAt: purchase.expiresAt.toISOString(),
      publicKey:
        purchase.kind === 'pix_prepaid'
          ? null
          : purchase.kind === 'card_subscription'
            ? this.config.subscriptionsPublicKey
            : this.config.ordersPublicKey,
      qrCode: purchase.pixQrCode,
      qrCodeBase64: purchase.pixQrCodeBase64,
      ticketUrl: purchase.pixTicketUrl,
    };
  }
  private requireProvider() {
    if (!this.provider) throw new PatchGoNotConfiguredException();
    return this.provider;
  }
  private async unusedValue(
    store: BillingStorePort,
    purchaseId: string | null,
    starts: Date,
    ends: Date,
    now: Date,
  ) {
    if (!purchaseId) return 0;
    const purchase = await store.findPurchase(purchaseId);
    if (!purchase) return 0;
    const total = ends.getTime() - starts.getTime();
    return total <= 0
      ? 0
      : Math.max(
          0,
          Math.round((purchase.listAmountCents * (ends.getTime() - now.getTime())) / total),
        );
  }
  private proratedAmount(amount: number, starts: Date, ends: Date, now: Date) {
    const total = ends.getTime() - starts.getTime();
    return total <= 0
      ? amount
      : Math.max(0, Math.round((amount * (ends.getTime() - now.getTime())) / total));
  }
}
