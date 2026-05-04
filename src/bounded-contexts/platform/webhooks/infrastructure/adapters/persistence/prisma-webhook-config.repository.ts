/**
 * Prisma adapter for `WebhookConfigRepositoryPort`. Owns the schema-
 * to-domain conversion (`WebhookConfig` row → `WebhookView`) and the
 * ownership scoping for every CRUD path.
 *
 * Cross-user reads/writes are surfaced as `null` from the read paths
 * and `false` from the delete path — the use case translates those
 * into the not-found exception so callers can't probe ownership.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type {
  DeliveryOutcome,
  WebhookDeliveryView,
  WebhookEvent,
  WebhookView,
} from '../../../domain/entities/webhook';
import {
  type CreateWebhookInput,
  type DeliveryTarget,
  type UpdateWebhookInput,
  WebhookConfigRepositoryPort,
} from '../../../domain/ports/webhook-config.repository.port';

export class PrismaWebhookConfigRepository extends WebhookConfigRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async listForUser(userId: string): Promise<WebhookView[]> {
    const rows = await this.prisma.webhookConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return rows as WebhookView[];
  }

  async createForUser(
    userId: string,
    input: CreateWebhookInput,
    secret: string,
  ): Promise<WebhookView> {
    const row = await this.prisma.webhookConfig.create({
      data: { userId, url: input.url, events: input.events, secret },
      select: { id: true, url: true, events: true, enabled: true, createdAt: true },
    });
    return row as WebhookView;
  }

  async updateForUser(
    userId: string,
    id: string,
    input: UpdateWebhookInput,
  ): Promise<WebhookView | null> {
    if (!(await this.isOwnedBy(userId, id))) return null;
    const row = await this.prisma.webhookConfig.update({
      where: { id },
      data: input,
      select: {
        id: true,
        url: true,
        events: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return row as WebhookView;
  }

  async deleteForUser(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.webhookConfig.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }

  async listDeliveries(userId: string, webhookId: string): Promise<WebhookDeliveryView[] | null> {
    if (!(await this.isOwnedBy(userId, webhookId))) return null;
    const rows = await this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        eventType: true,
        attempt: true,
        success: true,
        statusCode: true,
        errorMessage: true,
        createdAt: true,
      },
    });
    return rows as WebhookDeliveryView[];
  }

  async findDeliveryTargets(userId: string, eventType: string): Promise<DeliveryTarget[]> {
    return this.prisma.webhookConfig.findMany({
      where: { userId, enabled: true, events: { has: eventType as WebhookEvent } },
      select: { id: true, url: true, secret: true },
    });
  }

  async recordDelivery(
    webhookId: string,
    eventType: string,
    payload: unknown,
    outcome: DeliveryOutcome,
  ): Promise<void> {
    try {
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          eventType,
          payload: payload as never,
          attempt: outcome.attempt,
          success: outcome.success,
          statusCode: outcome.statusCode ?? undefined,
          errorMessage: outcome.errorMessage ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to log webhook delivery: ${err instanceof Error ? err.message : 'unknown'}`, { context: 'PrismaWebhookConfigRepository' });
    }
  }

  private async isOwnedBy(userId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.webhookConfig.findUnique({
      where: { id },
      select: { userId: true },
    });
    return !!existing && existing.userId === userId;
  }
}
