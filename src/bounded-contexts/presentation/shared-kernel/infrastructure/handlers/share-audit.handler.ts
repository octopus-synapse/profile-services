/**
 * Audit handler for the public-share lifecycle (P1-035).
 *
 * `ShareDownloadedEvent` used to be audited by the social BC's handler,
 * which is gone with the social graph; the share is a presentation
 * concern and its audit lives next to the event now.
 */

import { type AuditLogPort, buildAuditEntry } from '@/shared-kernel/audit';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type { ShareDownloadedEvent } from '../../domain/events/share-downloaded.event';

export class ShareAuditHandler {
  constructor(
    private readonly audit: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {
    void this.logger; // reserved for future debug breadcrumbs.
  }

  async onShareDownloaded(event: ShareDownloadedEvent): Promise<void> {
    // Public shares are downloaded by anonymous visitors most of the
    // time, and `AuditLog.userId` has a FK to `User`. We only persist
    // when the payload carries a confirmed authenticated downloader.
    const downloaderId = (event.payload as { downloaderUserId?: string }).downloaderUserId;
    if (!downloaderId) return;
    await this.audit.log(
      buildAuditEntry({
        userId: downloaderId,
        action: 'SHARE_DOWNLOADED',
        entityType: 'ResumeShare',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }
}
