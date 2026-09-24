import { DomainEvent, type EventBusPort, type LoggerPort } from '@/shared-kernel';
import type { BillingStorePort } from '../../../domain/ports/billing-store.port';

class RehydratedBillingEvent extends DomainEvent<unknown> {
  constructor(row: {
    eventId: string;
    eventType: string;
    aggregateId: string;
    payload: unknown;
    schemaVersion: number;
    occurredAt: Date;
  }) {
    super(row.eventType, row.aggregateId, row.payload, row.schemaVersion, {
      eventId: row.eventId,
      occurredAt: row.occurredAt,
    });
  }
}

export class PublishBillingOutboxUseCase {
  constructor(
    private readonly store: BillingStorePort,
    private readonly bus: EventBusPort,
    private readonly logger?: LoggerPort,
  ) {}
  async execute(limit = 100): Promise<number> {
    const rows = await this.store.listPendingOutbox(limit);
    let published = 0;
    for (const row of rows) {
      try {
        await this.bus.publishAsync(new RehydratedBillingEvent(row));
        await this.store.markOutboxPublished(row.id);
        published++;
      } catch (error) {
        this.logger?.error('Billing outbox publish failed', {
          context: 'PublishBillingOutboxUseCase',
          eventId: row.eventId,
        });
        await this.store.markOutboxFailed(
          row.id,
          error instanceof Error ? error.message : 'unknown',
        );
        throw error;
      }
    }
    return published;
  }
}
