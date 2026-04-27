/**
 * Webhook domain shapes consumed by the use cases. They're kept
 * separate from any persistence type so the Prisma row shape can
 * evolve without rippling through the application layer.
 */

export type WebhookEvent = 'resume.created' | 'resume.published' | 'ats.score.updated';

export interface WebhookView {
  readonly id: string;
  readonly url: string;
  readonly events: WebhookEvent[];
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

export interface WebhookDeliveryView {
  readonly id: string;
  readonly eventType: string;
  readonly attempt: number;
  readonly success: boolean;
  readonly statusCode: number | null;
  readonly errorMessage: string | null;
  readonly createdAt: Date;
}

/** What a single delivery attempt records back to the system. */
export interface DeliveryOutcome {
  readonly attempt: number;
  readonly success: boolean;
  readonly statusCode: number | null;
  readonly errorMessage: string | null;
}
