/**
 * Bridge `AuditLogService` (legacy positional surface) to the canonical
 * `AuditLogPort` (Q50 — single `log({ entry }, options)` shape).
 *
 * Used by P1-035 audit handlers (auth/export/social/version) so they
 * depend on the framework-free port instead of the platform service.
 * The action is cast via `as AuditAction` because the port's contract
 * accepts any SCREAMING_SNAKE_CASE action string (per `audit-log.port`
 * docs); the underlying service tightens to the Prisma enum at write
 * time.
 */

import type { AuditAction } from '@prisma/client';
import {
  type AuditLogEntry,
  type AuditLogOptions,
  AuditLogPort,
} from '@/shared-kernel/audit/audit-log.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type { AuditLogService } from './audit-log.service';

export class AuditLogServiceAdapter extends AuditLogPort {
  constructor(
    private readonly service: AuditLogService,
    private readonly logger: LoggerPort,
  ) {
    super();
    void this.logger; // reserved for future debug breadcrumbs
  }

  async log(entry: AuditLogEntry, options?: AuditLogOptions): Promise<void> {
    await this.service.log(
      entry.userId,
      entry.action as AuditAction,
      entry.entityType,
      entry.entityId,
      undefined,
      undefined,
      { lenient: options?.lenient ?? false },
    );
  }
}
