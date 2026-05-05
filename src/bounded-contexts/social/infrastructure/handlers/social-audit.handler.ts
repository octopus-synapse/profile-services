/**
 * Audit handler for social-graph + share lifecycle events (P1-035).
 *
 * Subscribes to: `UserFollowedEvent`, `ConnectionRequestedEvent`,
 * `ShareDownloadedEvent`. STRICT mode (Q51) per the user's policy
 * decision — keeping the audit envelope uniform across the four
 * concrete handlers; lenient telemetry can be carved out in a
 * follow-up PR if the SLA story changes.
 */

import type { ShareDownloadedEvent } from '@/bounded-contexts/presentation/shared-kernel/domain/events/share-downloaded.event';
import { type AuditLogPort, buildAuditEntry } from '@/shared-kernel/audit';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type { ConnectionRequestedEvent, UserFollowedEvent } from '../../domain/events';

export class SocialAuditHandler {
  constructor(
    private readonly audit: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {
    void this.logger; // reserved for future debug breadcrumbs.
  }

  async onUserFollowed(event: UserFollowedEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: event.payload.followerId,
        action: 'USER_FOLLOWED',
        entityType: 'User',
        entityId: event.aggregateId, // followee
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }

  async onConnectionRequested(event: ConnectionRequestedEvent): Promise<void> {
    const requesterId =
      (event.payload as { requesterId?: string }).requesterId ?? event.aggregateId;
    await this.audit.log(
      buildAuditEntry({
        userId: requesterId,
        action: 'CONNECTION_REQUESTED',
        entityType: 'Connection',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
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
