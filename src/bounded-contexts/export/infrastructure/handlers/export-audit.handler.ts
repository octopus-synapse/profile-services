/**
 * Audit handler for export lifecycle events (P1-035).
 *
 * Subscribes to: `ExportRequestedEvent`, `ExportCompletedEvent`,
 * `ExportFailedEvent`. STRICT mode (Q51) — exporting carries
 * compliance weight (data export under LGPD), so a missed audit row
 * is treated as a regulatory gap.
 */

import { type AuditLogPort, buildAuditEntry } from '@/shared-kernel/audit';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type {
  ExportCompletedEvent,
  ExportFailedEvent,
  ExportRequestedEvent,
} from '../../domain/events';

export class ExportAuditHandler {
  constructor(
    private readonly audit: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {
    // logger reserved for future enrichment / debug breadcrumbs.
    void this.logger;
  }

  async onRequested(event: ExportRequestedEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: event.payload.userId,
        action: 'EXPORT_REQUESTED',
        entityType: 'Export',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }

  async onCompleted(event: ExportCompletedEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: (event.payload as { userId?: string }).userId ?? event.aggregateId,
        action: 'EXPORT_COMPLETED',
        entityType: 'Export',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }

  async onFailed(event: ExportFailedEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: (event.payload as { userId?: string }).userId ?? event.aggregateId,
        action: 'EXPORT_FAILED',
        entityType: 'Export',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }
}
