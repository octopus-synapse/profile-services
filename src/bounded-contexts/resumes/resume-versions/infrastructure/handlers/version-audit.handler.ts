/**
 * Audit handler for resume-version lifecycle events (P1-035).
 *
 * Subscribes to: `VersionCreatedEvent`, `VersionRestoredEvent`.
 * STRICT mode (Q51).
 */

import type {
  VersionCreatedEvent,
  VersionRestoredEvent,
} from '@/bounded-contexts/resumes/domain/events';
import { type AuditLogPort, buildAuditEntry } from '@/shared-kernel/audit';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

export class VersionAuditHandler {
  constructor(
    private readonly audit: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {
    void this.logger; // reserved for future debug breadcrumbs.
  }

  async onVersionCreated(event: VersionCreatedEvent): Promise<void> {
    const userId = (event.payload as { userId?: string }).userId ?? event.aggregateId;
    await this.audit.log(
      buildAuditEntry({
        userId,
        action: 'RESUME_VERSION_CREATED',
        entityType: 'ResumeVersion',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }

  async onVersionRestored(event: VersionRestoredEvent): Promise<void> {
    const userId = (event.payload as { userId?: string }).userId ?? event.aggregateId;
    await this.audit.log(
      buildAuditEntry({
        userId,
        action: 'RESUME_VERSION_RESTORED',
        entityType: 'ResumeVersion',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }
}
