import type { PrismaLikeClient } from '@/shared-kernel/persistence/prisma-types';
import type { PaidPatchPlan } from '../../../domain/policies/billing-offer.policy';
import type {
  BillingPaymentRecord,
  PaymentMethodSessionRecord,
} from '../../../domain/ports/billing-store.port';

export class PrismaBillingOperationsRepository {
  constructor(private readonly prisma: PrismaLikeClient) {}

  async creditBalance(userId: string): Promise<number> {
    const value = await this.prisma.billingCreditEntry.aggregate({
      where: { userId, currency: 'BRL' },
      _sum: { amountCents: true },
    });
    return Math.max(0, value._sum.amountCents ?? 0);
  }

  async appendCredit(input: {
    userId: string;
    purchaseId: string;
    amountCents: number;
    reason: string;
    reference: string;
  }): Promise<void> {
    await this.prisma.billingCreditEntry.upsert({
      where: { reference: input.reference },
      create: { ...input, currency: 'BRL' },
      update: {},
    });
  }

  async founderReserved(offerCode: string, at: Date): Promise<number> {
    return this.prisma.billingPurchase.count({
      where: {
        offerCode,
        OR: [
          { status: 'approved' },
          { status: { in: ['created', 'pending'] }, expiresAt: { gt: at } },
        ],
      },
    });
  }

  async preparationUsed(userId: string, periodStart: Date): Promise<number> {
    return (
      (
        await this.prisma.patchGoUsage.findUnique({
          where: { userId_periodStart: { userId, periodStart } },
        })
      )?.count ?? 0
    );
  }

  async reservePreparation(userId: string, periodStart: Date, limit: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ userId: string }>>`
      INSERT INTO "patch_go_usage" ("userId", "periodStart", "count") VALUES (${userId}, ${periodStart}, 1)
      ON CONFLICT ("userId", "periodStart") DO UPDATE SET "count" = "patch_go_usage"."count" + 1
      WHERE "patch_go_usage"."count" < ${limit} RETURNING "userId"`;
    return Boolean(rows[0]);
  }

  async releasePreparation(userId: string, periodStart: Date): Promise<void> {
    await this.prisma
      .$executeRaw`UPDATE "patch_go_usage" SET "count" = GREATEST(0, "count" - 1) WHERE "userId" = ${userId} AND "periodStart" = ${periodStart}`;
  }

  async freeTranslationUsed(userId: string, monthStart: Date): Promise<number> {
    return (
      (
        await this.prisma.patchFreeTranslationUsage.findUnique({
          where: { userId_monthStart: { userId, monthStart } },
        })
      )?.count ?? 0
    );
  }

  async reserveFreeTranslation(
    userId: string,
    monthStart: Date,
    count: number,
    limit: number,
  ): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ userId: string }>>`
      INSERT INTO "patch_free_translation_usage" ("userId", "monthStart", "count") VALUES (${userId}, ${monthStart}, ${count}::integer)
      ON CONFLICT ("userId", "monthStart") DO UPDATE SET "count" = "patch_free_translation_usage"."count" + ${count}::integer
      WHERE "patch_free_translation_usage"."count" + ${count}::integer <= ${limit}::integer RETURNING "userId"`;
    return Boolean(rows[0]);
  }

  async releaseFreeTranslation(userId: string, monthStart: Date, count: number): Promise<void> {
    await this.prisma
      .$executeRaw`UPDATE "patch_free_translation_usage" SET "count" = GREATEST(0, "count" - ${count}::integer) WHERE "userId" = ${userId} AND "monthStart" = ${monthStart}`;
  }

  async recordAiUsage(input: {
    userId: string;
    operation: string;
    plan: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsdMicros: bigint | null;
    costBrlMicros: bigint | null;
  }): Promise<void> {
    await this.prisma.patchAiUsage.create({ data: input });
  }

  async createPaymentMethodSession(input: {
    subscriptionId: string;
    tokenHash: string;
    returnUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.billingPaymentMethodSession.create({ data: input });
  }

  async findPaymentMethodSession(tokenHash: string): Promise<PaymentMethodSessionRecord | null> {
    const row = await this.prisma.billingPaymentMethodSession.findUnique({
      where: { tokenHash },
      include: { subscription: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      subscriptionId: row.subscriptionId,
      tokenHash: row.tokenHash,
      returnUrl: row.returnUrl,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      plan: row.subscription.plan as PaidPatchPlan,
      providerSubscriptionId: row.subscription.providerSubscriptionId,
    };
  }

  async consumePaymentMethodSession(id: string, at: Date): Promise<boolean> {
    const result = await this.prisma.billingPaymentMethodSession.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: at } },
      data: { usedAt: at },
    });
    return result.count === 1;
  }

  async listPayments(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: BillingPaymentRecord[]; total: number }> {
    const where = { subscription: { userId } };
    const [rows, total] = await Promise.all([
      this.prisma.billingPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.billingPayment.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        amountCents: row.amountCents,
        currency: row.currency,
        paidAt: row.paidAt,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
      })),
      total,
    };
  }

  async saveProviderPayment(input: {
    subscriptionId: string;
    providerPaymentId: string;
    status: string;
    amountCents: number;
    currency: string;
    paidAt: Date | null;
    periodStart: Date | null;
    periodEnd: Date | null;
  }): Promise<void> {
    await this.prisma.billingPayment.upsert({
      where: { providerPaymentId: input.providerPaymentId },
      create: input,
      update: {
        status: input.status,
        amountCents: input.amountCents,
        currency: input.currency,
        paidAt: input.paidAt,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });
  }
}
