import type { DomainEvent } from '@/shared-kernel';
import type { PrismaLikeClient } from '@/shared-kernel/persistence/prisma-types';
import type { BillingPurchaseState } from '../../../domain/entities/billing-purchase.entity';
import type {
  BillingOfferCode,
  PaidPatchPlan,
} from '../../../domain/policies/billing-offer.policy';
import type {
  BillingOutboxRecord,
  BillingSubscriptionRecord,
} from '../../../domain/ports/billing-store.port';

export class PrismaBillingEventsRepository {
  constructor(private readonly prisma: PrismaLikeClient) {}

  async claimWebhook(input: {
    providerEventId: string;
    type: string;
    resourceId: string;
  }): Promise<string | null> {
    const existing = await this.prisma.billingWebhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: 'mercado_pago',
          providerEventId: input.providerEventId,
        },
      },
    });
    if (existing?.status === 'processed' || existing?.status === 'processing') return null;
    if (existing)
      return (
        await this.prisma.billingWebhookEvent.update({
          where: { id: existing.id },
          data: { status: 'processing', attempts: { increment: 1 }, lastError: null },
        })
      ).id;
    return (
      await this.prisma.billingWebhookEvent.create({ data: { provider: 'mercado_pago', ...input } })
    ).id;
  }

  async completeWebhook(id: string, error?: string): Promise<void> {
    await this.prisma.billingWebhookEvent.update({
      where: { id },
      data: error
        ? { status: 'failed', lastError: error.slice(0, 500) }
        : { status: 'processed', processedAt: new Date(), lastError: null },
    });
  }

  async appendEvents(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.prisma.billingDomainEventOutbox.upsert({
        where: { eventId: event.eventId },
        create: {
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          schemaVersion: event.schemaVersion,
          payload: event.payload as never,
          occurredAt: event.occurredAt,
        },
        update: {},
      });
    }
  }

  async listPendingOutbox(limit: number): Promise<BillingOutboxRecord[]> {
    return this.prisma.billingDomainEventOutbox.findMany({
      where: { publishedAt: null, nextAttemptAt: { lte: new Date() } },
      orderBy: { occurredAt: 'asc' },
      take: limit,
    });
  }

  async markOutboxPublished(id: string): Promise<void> {
    await this.prisma.billingDomainEventOutbox.update({
      where: { id },
      data: { publishedAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
  }

  async markOutboxFailed(id: string, error: string): Promise<void> {
    const current = await this.prisma.billingDomainEventOutbox.findUniqueOrThrow({
      where: { id },
      select: { attempts: true },
    });
    const delay = Math.min(60 * 60_000, 2 ** Math.min(current.attempts, 10) * 1_000);
    await this.prisma.billingDomainEventOutbox.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: error.slice(0, 500),
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });
  }

  async listSubscriptionsForReconciliation(limit: number): Promise<BillingSubscriptionRecord[]> {
    const rows = await this.prisma.billingSubscription.findMany({
      where: {
        provider: 'mercado_pago',
        status: { in: ['pending', 'active', 'paused', 'canceled'] },
      },
      orderBy: { lastSyncedAt: 'asc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      providerSubscriptionId: row.providerSubscriptionId,
      providerPayerId: row.providerPayerId,
      providerVersion: row.providerVersion,
      plan: row.plan as PaidPatchPlan,
      status: row.status,
      amountCents: row.amountCents,
      currency: row.currency,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      nextPaymentAt: row.nextPaymentAt,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    }));
  }

  async listPurchasesForReconciliation(limit: number): Promise<BillingPurchaseState[]> {
    const rows = await this.prisma.billingPurchase.findMany({
      where: {
        provider: 'mercado_pago',
        providerOrderId: { not: null },
        status: { in: ['created', 'pending', 'reversing'] },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      subscriptionId: row.subscriptionId,
      offerCode: row.offerCode as BillingOfferCode,
      plan: row.plan as PaidPatchPlan,
      kind: row.kind as BillingPurchaseState['kind'],
      status: row.status as BillingPurchaseState['status'],
      amountCents: row.amountCents,
      listAmountCents: row.listAmountCents,
      prorationCreditCents: row.prorationCreditCents,
      creditAppliedCents: row.creditAppliedCents,
      currency: 'BRL',
      termMonths: row.termMonths,
      externalReference: row.externalReference,
      expiresAt: row.expiresAt,
      providerOrderId: row.providerOrderId,
      providerPaymentId: row.providerPaymentId,
      providerSubscriptionId: row.providerSubscriptionId,
      approvedAt: row.approvedAt,
      pixQrCode: row.pixQrCode,
      pixQrCodeBase64: row.pixQrCodeBase64,
      pixTicketUrl: row.pixTicketUrl,
    }));
  }
}
