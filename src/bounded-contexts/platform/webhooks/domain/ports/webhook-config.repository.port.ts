/**
 * Outbound port for webhook configuration persistence. The Prisma
 * adapter handles the schema; the use cases see only domain shapes.
 *
 * Ownership semantics: every read/write that takes a `userId` MUST
 * scope the underlying query to that user. Cross-user reads/writes
 * surface as `WebhookNotFoundException` (treat-as-missing) rather
 * than 403 to avoid leaking the existence of other users' webhooks.
 */

import type {
  DeliveryOutcome,
  WebhookDeliveryView,
  WebhookEvent,
  WebhookView,
} from '../entities/webhook';

export interface CreateWebhookInput {
  readonly url: string;
  readonly events: WebhookEvent[];
}

export interface UpdateWebhookInput {
  readonly url?: string;
  readonly events?: WebhookEvent[];
  readonly enabled?: boolean;
}

/** A single webhook record matched for a given (userId, eventType) — only
 *  what the delivery use case needs to fire one POST. */
export interface DeliveryTarget {
  readonly id: string;
  readonly url: string;
  readonly secret: string;
}

export abstract class WebhookConfigRepositoryPort {
  abstract listForUser(userId: string): Promise<WebhookView[]>;
  abstract createForUser(
    userId: string,
    input: CreateWebhookInput,
    secret: string,
  ): Promise<WebhookView>;
  abstract updateForUser(
    userId: string,
    id: string,
    input: UpdateWebhookInput,
  ): Promise<WebhookView | null>;
  abstract deleteForUser(userId: string, id: string): Promise<boolean>;
  abstract listDeliveries(userId: string, webhookId: string): Promise<WebhookDeliveryView[] | null>;
  abstract findDeliveryTargets(userId: string, eventType: string): Promise<DeliveryTarget[]>;
  abstract recordDelivery(
    webhookId: string,
    eventType: string,
    payload: unknown,
    outcome: DeliveryOutcome,
  ): Promise<void>;
}
