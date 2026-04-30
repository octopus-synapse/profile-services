/**
 * HTTP-backed implementation of `WebhookDeliveryPort`.
 *
 * Owns the request shape (JSON body with event/timestamp/data), the
 * HMAC-SHA256 signing of that body, the 15s abort timeout, and the
 * 3-attempt exponential-backoff retry loop. Returns a structured
 * `DeliveryOutcome` for every attempt — never throws.
 */

import { LoggerPort } from '@/shared-kernel';
import type { DeliveryOutcome } from '../../../domain/entities/webhook';
import {
  type DeliveryRequest,
  WebhookDeliveryPort,
} from '../../../domain/ports/webhook-delivery.port';

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15_000;

export class HttpWebhookDeliveryAdapter extends WebhookDeliveryPort {
  constructor(private readonly logger: LoggerPort) {
    super();
  }

  async deliver(request: DeliveryRequest): Promise<DeliveryOutcome> {
    const body = JSON.stringify({
      event: request.eventType,
      timestamp: new Date().toISOString(),
      data: request.payload,
    });
    const signature = await this.generateHMAC(request.secret, body);

    let lastOutcome: DeliveryOutcome = {
      attempt: 0,
      success: false,
      statusCode: null,
      errorMessage: 'no attempts made',
    };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const outcome = await this.attempt(request, body, signature, attempt);
      lastOutcome = outcome;
      if (outcome.success) return outcome;
      if (attempt < MAX_RETRIES) {
        // 2s, 4s, 8s exponential backoff.
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      }
    }
    return lastOutcome;
  }

  private async attempt(
    request: DeliveryRequest,
    body: string,
    signature: string,
    attempt: number,
  ): Promise<DeliveryOutcome> {
    try {
      const response = await fetch(request.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': request.eventType,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(
          `Webhook delivery non-2xx attempt=${attempt} status=${response.status}`,
          'HttpWebhookDeliveryAdapter',
        );
        return {
          attempt,
          success: false,
          statusCode: response.status,
          errorMessage: response.statusText || `HTTP ${response.status}`,
        };
      }
      return { attempt, success: true, statusCode: response.status, errorMessage: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(
        `Webhook delivery error attempt=${attempt}: ${message}`,
        'HttpWebhookDeliveryAdapter',
      );
      return { attempt, success: false, statusCode: null, errorMessage: message };
    }
  }

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
