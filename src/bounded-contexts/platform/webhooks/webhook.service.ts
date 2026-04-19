import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

/**
 * Webhook Notification Service
 *
 * Provides webhook delivery system for external integrations.
 * Listens to domain events and sends HTTP notifications to registered webhook URLs.
 *
 * Use Cases:
 * - Third-party integration (notify external systems of resume updates)
 * - CI/CD triggers (rebuild personal website when resume changes)
 * - Custom automation (trigger workflows on specific events)
 *
 * Features:
 * - Event-driven webhook delivery
 * - Retry mechanism with exponential backoff
 * - Webhook verification via HMAC signatures
 * - Per-user webhook configuration
 *
 * Architecture Pattern: Observer/Event-Driven
 * - Domain events → WebhookService → HTTP POST to external URLs
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Event Handler: Resume Created
   *
   * Triggers webhooks when a new resume is created.
   */
  @OnEvent('resume.created', { async: true })
  async handleResumeCreated(payload: {
    resumeId: string;
    userId: string;
    title: string;
  }): Promise<void> {
    this.logger.log(`[Webhook] Resume created event for user ${payload.userId}`);

    await this.sendWebhooks(payload.userId, 'resume.created', payload);
  }

  /**
   * Event Handler: Resume Published
   *
   * Triggers webhooks when a resume is published.
   */
  @OnEvent('resume.published', { async: true })
  async handleResumePublished(payload: {
    resumeId: string;
    userId: string;
    publicUrl: string;
  }): Promise<void> {
    this.logger.log(`[Webhook] Resume published event for user ${payload.userId}`);

    await this.sendWebhooks(payload.userId, 'resume.published', payload);
  }

  /**
   * Event Handler: ATS Score Updated
   *
   * Triggers webhooks when ATS score changes significantly.
   */
  @OnEvent('ats.score.updated', { async: true })
  async handleATSScoreUpdated(payload: {
    resumeId: string;
    userId: string;
    score: number;
    previousScore?: number;
  }): Promise<void> {
    // Only send webhook if score changed by >5 points
    if (payload.previousScore && Math.abs(payload.score - payload.previousScore) < 5) {
      return;
    }

    this.logger.log(`[Webhook] ATS score updated for user ${payload.userId}: ${payload.score}`);

    await this.sendWebhooks(payload.userId, 'ats.score.updated', payload);
  }

  /**
   * Core: Send Webhooks to User's Registered URLs
   *
   * Fetches user's webhook configurations and delivers HTTP POST requests.
   */
  private async sendWebhooks(userId: string, eventType: string, payload: unknown): Promise<void> {
    const webhooks = await this.prisma.webhookConfig.findMany({
      where: { userId, enabled: true, events: { has: eventType } },
      select: { id: true, url: true, secret: true },
    });

    if (webhooks.length === 0) {
      this.logger.debug(`[Webhook] No webhooks configured for user ${userId}, event ${eventType}`);
      return;
    }

    // Send webhooks in parallel with error handling
    const results = await Promise.allSettled(
      webhooks.map((webhook) =>
        this.deliverWebhook(webhook.id, webhook.url, webhook.secret, eventType, payload),
      ),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(
        `[Webhook] ${failures.length}/${webhooks.length} webhooks failed for user ${userId}`,
      );
    }
  }

  /**
   * Core: Deliver Single Webhook with Retry
   *
   * Sends HTTP POST with HMAC signature for verification.
   */
  private async deliverWebhook(
    webhookId: string,
    url: string,
    secret: string,
    eventType: string,
    payload: unknown,
  ): Promise<void> {
    const body = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    // Generate HMAC signature for webhook verification
    const signature = await this.generateHMAC(secret, body);

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': eventType,
          },
          body,
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          await this.logDelivery(webhookId, eventType, payload, attempt, false, response.status);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        await this.logDelivery(webhookId, eventType, payload, attempt, true, response.status);
        this.logger.log(`[Webhook] Successfully delivered to ${url}`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `[Webhook] Delivery failed (attempt ${attempt}/${maxRetries}): ${message}`,
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = 2 ** attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          await this.logDelivery(webhookId, eventType, payload, attempt, false, null, message);
          throw error;
        }
      }
    }
  }

  private async logDelivery(
    webhookId: string,
    eventType: string,
    payload: unknown,
    attempt: number,
    success: boolean,
    statusCode: number | null,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          eventType,
          payload: payload as never,
          attempt,
          success,
          statusCode: statusCode ?? undefined,
          errorMessage,
        },
      });
    } catch (err) {
      this.logger.error(
        `[Webhook] Failed to log delivery: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  /**
   * Helper: Generate HMAC Signature
   *
   * Creates HMAC-SHA256 signature for webhook verification.
   */
  private async generateHMAC(secret: string, body: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));

    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
