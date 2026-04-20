import * as crypto from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export type WebhookEvent = 'resume.created' | 'resume.published' | 'ats.score.updated';

export interface CreateWebhookInput {
  url: string;
  events: WebhookEvent[];
}

export interface UpdateWebhookInput {
  url?: string;
  events?: WebhookEvent[];
  enabled?: boolean;
}

export interface WebhookView {
  id: string;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface WebhookDeliveryView {
  id: string;
  eventType: string;
  attempt: number;
  success: boolean;
  statusCode: number | null;
  errorMessage: string | null;
  createdAt: Date;
}

@Injectable()
export class WebhookConfigService {
  constructor(private readonly prisma: PrismaService) {}

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
  ): Promise<{ webhook: WebhookView; secret: string }> {
    const secret = crypto.randomBytes(32).toString('hex');
    const webhook = await this.prisma.webhookConfig.create({
      data: {
        userId,
        url: input.url,
        events: input.events,
        secret,
      },
      select: { id: true, url: true, events: true, enabled: true, createdAt: true },
    });
    return { webhook: webhook as WebhookView, secret };
  }

  async updateForUser(userId: string, id: string, input: UpdateWebhookInput): Promise<WebhookView> {
    await this.assertOwnership(userId, id);
    const updated = await this.prisma.webhookConfig.update({
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
    return updated as WebhookView;
  }

  async deleteForUser(userId: string, id: string): Promise<void> {
    const result = await this.prisma.webhookConfig.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Webhook not found');
    }
  }

  async listDeliveries(userId: string, webhookId: string): Promise<WebhookDeliveryView[]> {
    await this.assertOwnership(userId, webhookId);
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

  private async assertOwnership(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.webhookConfig.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Webhook not found');
    }
  }
}
