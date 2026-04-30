/**
 * Outbound port for sending a single webhook delivery over HTTP.
 *
 * The adapter owns the HMAC signing, the request shape, the retry
 * policy, and the timeout — everything network-y. The use case just
 * asks for a delivery and gets back an outcome (success + status, or
 * the final failure message). The adapter MUST NOT throw on a 4xx /
 * 5xx — it returns the outcome so the caller can record it.
 */

import type { DeliveryOutcome } from '../entities/webhook';

export interface DeliveryRequest {
  readonly url: string;
  readonly secret: string;
  readonly eventType: string;
  readonly payload: unknown;
}

export abstract class WebhookDeliveryPort {
  abstract deliver(request: DeliveryRequest): Promise<DeliveryOutcome>;
}
