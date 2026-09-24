import type { PrismaLikeClient } from '@/shared-kernel/persistence/prisma-types';
import type { BillingEntitlementState } from '../../../domain/entities/billing-entitlement.entity';
import {
  BillingPurchase,
  type BillingPurchaseState,
} from '../../../domain/entities/billing-purchase.entity';
import type {
  BillingOfferCode,
  PaidPatchPlan,
} from '../../../domain/policies/billing-offer.policy';
import type { BillingSubscriptionRecord } from '../../../domain/ports/billing-store.port';

type Row = Record<string, unknown>;

export class PrismaBillingCoreRepository {
  constructor(private readonly prisma: PrismaLikeClient) {}

  async findCustomerEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  async findActiveEntitlement(userId: string, at: Date): Promise<BillingEntitlementState | null> {
    const row = await this.prisma.billingEntitlement.findFirst({
      where: { userId, status: 'active', startsAt: { lte: at }, endsAt: { gt: at } },
      orderBy: [{ plan: 'desc' }, { endsAt: 'desc' }],
    });
    return row ? this.entitlement(row) : null;
  }

  async findReplacedEntitlement(
    userId: string,
    terminatedAt: Date | null,
  ): Promise<BillingEntitlementState | null> {
    if (!terminatedAt) return null;
    const row = await this.prisma.billingEntitlement.findFirst({
      where: { userId, status: 'replaced', terminatedAt, endsAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.entitlement(row) : null;
  }

  async createEntitlement(record: BillingEntitlementState): Promise<void> {
    await this.prisma.billingEntitlement.create({ data: record });
  }

  async updateEntitlement(record: BillingEntitlementState): Promise<void> {
    await this.prisma.billingEntitlement.update({
      where: { id: record.id },
      data: {
        status: record.status,
        startsAt: record.startsAt,
        endsAt: record.endsAt,
        quotaAnchorAt: record.quotaAnchorAt,
        terminatedAt: record.terminatedAt,
      },
    });
  }

  async findCurrentSubscription(
    userId: string,
    at: Date,
  ): Promise<BillingSubscriptionRecord | null> {
    const active = await this.prisma.billingSubscription.findFirst({
      where: { userId, periodStart: { lte: at }, periodEnd: { gt: at } },
      orderBy: { updatedAt: 'desc' },
    });
    const row =
      active ??
      (await this.prisma.billingSubscription.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }));
    return row ? this.subscription(row) : null;
  }

  async findSubscriptionByProviderId(
    providerId: string,
  ): Promise<BillingSubscriptionRecord | null> {
    const row = await this.prisma.billingSubscription.findUnique({
      where: { providerSubscriptionId: providerId },
    });
    return row ? this.subscription(row) : null;
  }

  async createSubscription(
    userId: string,
    plan: PaidPatchPlan,
    amountCents: number,
  ): Promise<BillingSubscriptionRecord> {
    return this.subscription(
      await this.prisma.billingSubscription.create({
        data: {
          userId,
          provider: 'mercado_pago',
          plan,
          status: 'creating',
          amountCents,
          currency: 'BRL',
        },
      }),
    );
  }

  async updateSubscription(record: BillingSubscriptionRecord): Promise<void> {
    await this.prisma.billingSubscription.update({
      where: { id: record.id },
      data: {
        providerSubscriptionId: record.providerSubscriptionId,
        providerPayerId: record.providerPayerId,
        providerVersion: record.providerVersion,
        plan: record.plan,
        status: record.status,
        amountCents: record.amountCents,
        currency: record.currency,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        nextPaymentAt: record.nextPaymentAt,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        lastSyncedAt: new Date(),
      },
    });
  }

  async findPurchase(id: string, userId?: string): Promise<BillingPurchaseState | null> {
    const row = await this.prisma.billingPurchase.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
    });
    return row ? this.purchase(row) : null;
  }

  async findPurchaseByProvider(
    orderId: string,
    externalReference?: string | null,
  ): Promise<BillingPurchaseState | null> {
    const row = await this.prisma.billingPurchase.findFirst({
      where: {
        OR: [{ providerOrderId: orderId }, ...(externalReference ? [{ externalReference }] : [])],
      },
    });
    return row ? this.purchase(row) : null;
  }

  async findPurchaseBySubscriptionProvider(
    providerSubscriptionId: string,
  ): Promise<BillingPurchaseState | null> {
    const row = await this.prisma.billingPurchase.findFirst({
      where: { providerSubscriptionId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.purchase(row) : null;
  }

  async findPurchaseByPaymentProvider(
    providerPaymentId: string,
  ): Promise<BillingPurchaseState | null> {
    const row = await this.prisma.billingPurchase.findUnique({ where: { providerPaymentId } });
    return row ? this.purchase(row) : null;
  }

  async findOpenPurchase(userId: string, at: Date): Promise<BillingPurchaseState | null> {
    const row = await this.prisma.billingPurchase.findFirst({
      where: {
        userId,
        OR: [
          { status: { in: ['pending', 'reversing'] } },
          { status: 'created', expiresAt: { gt: at } },
          { status: 'created', subscriptionId: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.purchase(row) : null;
  }

  async savePurchase(purchase: BillingPurchase): Promise<void> {
    const row = purchase.snapshot;
    await this.prisma.billingPurchase.upsert({
      where: { id: row.id },
      create: { ...row, provider: 'mercado_pago' },
      update: {
        subscriptionId: row.subscriptionId,
        status: row.status,
        providerOrderId: row.providerOrderId,
        providerPaymentId: row.providerPaymentId,
        providerSubscriptionId: row.providerSubscriptionId,
        approvedAt: row.approvedAt,
        pixQrCode: row.pixQrCode,
        pixQrCodeBase64: row.pixQrCodeBase64,
        pixTicketUrl: row.pixTicketUrl,
        failedAt: ['rejected', 'canceled', 'expired'].includes(row.status) ? new Date() : undefined,
      },
    });
  }

  private purchase(row: Row): BillingPurchaseState {
    return {
      id: String(row.id),
      userId: String(row.userId),
      subscriptionId: row.subscriptionId ? String(row.subscriptionId) : null,
      offerCode: String(row.offerCode) as BillingOfferCode,
      plan: String(row.plan) as PaidPatchPlan,
      kind: String(row.kind) as BillingPurchaseState['kind'],
      status: String(row.status) as BillingPurchaseState['status'],
      amountCents: Number(row.amountCents),
      listAmountCents: Number(row.listAmountCents),
      prorationCreditCents: Number(row.prorationCreditCents),
      creditAppliedCents: Number(row.creditAppliedCents),
      currency: 'BRL',
      termMonths: Number(row.termMonths),
      externalReference: String(row.externalReference),
      expiresAt: row.expiresAt as Date,
      providerOrderId: row.providerOrderId ? String(row.providerOrderId) : null,
      providerPaymentId: row.providerPaymentId ? String(row.providerPaymentId) : null,
      providerSubscriptionId: row.providerSubscriptionId
        ? String(row.providerSubscriptionId)
        : null,
      approvedAt: (row.approvedAt as Date | null) ?? null,
      pixQrCode: row.pixQrCode ? String(row.pixQrCode) : null,
      pixQrCodeBase64: row.pixQrCodeBase64 ? String(row.pixQrCodeBase64) : null,
      pixTicketUrl: row.pixTicketUrl ? String(row.pixTicketUrl) : null,
    };
  }

  private entitlement(row: Row): BillingEntitlementState {
    return {
      id: String(row.id),
      userId: String(row.userId),
      purchaseId: row.purchaseId ? String(row.purchaseId) : null,
      source: String(row.source),
      sourceRef: String(row.sourceRef),
      plan: String(row.plan) as PaidPatchPlan,
      status: String(row.status) as BillingEntitlementState['status'],
      startsAt: row.startsAt as Date,
      endsAt: row.endsAt as Date,
      quotaAnchorAt: row.quotaAnchorAt as Date,
      terminatedAt: (row.terminatedAt as Date | null) ?? null,
    };
  }

  private subscription(row: Row): BillingSubscriptionRecord {
    return {
      id: String(row.id),
      userId: String(row.userId),
      providerSubscriptionId: row.providerSubscriptionId
        ? String(row.providerSubscriptionId)
        : null,
      providerPayerId: row.providerPayerId ? String(row.providerPayerId) : null,
      providerVersion: row.providerVersion === null ? null : Number(row.providerVersion),
      plan: String(row.plan) as PaidPatchPlan,
      status: String(row.status),
      amountCents: Number(row.amountCents),
      currency: String(row.currency),
      periodStart: (row.periodStart as Date | null) ?? null,
      periodEnd: (row.periodEnd as Date | null) ?? null,
      nextPaymentAt: (row.nextPaymentAt as Date | null) ?? null,
      cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
    };
  }
}
