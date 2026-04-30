/**
 * Fans out a domain event to every webhook a user has registered
 * for that event type. Each delivery goes through the
 * `WebhookDeliveryPort` (HTTP + retries) and the outcome is logged
 * back to the repository regardless of success/failure so the
 * `/deliveries` endpoint can show it.
 *
 * Per-target failures are isolated via `Promise.allSettled` so one
 * dead webhook can't block the rest. The use case returns a count
 * summary for the caller to log.
 */

import type { LoggerPort } from '@/shared-kernel';
import { WebhookConfigRepositoryPort } from '../../../domain/ports/webhook-config.repository.port';
import { WebhookDeliveryPort } from '../../../domain/ports/webhook-delivery.port';

const CTX = 'DeliverEventWebhooksUseCase';

export interface DeliverEventInput {
  readonly userId: string;
  readonly eventType: string;
  readonly payload: unknown;
}

export interface DeliveryFanoutSummary {
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
}

export class DeliverEventWebhooksUseCase {
  constructor(
    private readonly repository: WebhookConfigRepositoryPort,
    private readonly delivery: WebhookDeliveryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: DeliverEventInput): Promise<DeliveryFanoutSummary> {
    const targets = await this.repository.findDeliveryTargets(input.userId, input.eventType);
    if (targets.length === 0) {
      return { attempted: 0, succeeded: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      targets.map(async (target) => {
        const outcome = await this.delivery.deliver({
          url: target.url,
          secret: target.secret,
          eventType: input.eventType,
          payload: input.payload,
        });
        await this.repository.recordDelivery(target.id, input.eventType, input.payload, outcome);
        return outcome.success;
      }),
    );

    let succeeded = 0;
    let failed = 0;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) succeeded++;
      else failed++;
    }

    if (failed > 0) {
      this.logger.warn(
        `Webhook fanout user=${input.userId} event=${input.eventType} failed=${failed}/${targets.length}`,
        CTX,
      );
    }
    return { attempted: targets.length, succeeded, failed };
  }
}
