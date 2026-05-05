/**
 * Thin AuditLogPort adapter that writes directly to the `AuditLog`
 * Prisma table. Used by AccessModifier use cases to record
 * APPLY/REVOKE role-change events.
 *
 * Q51 in the duplication audit: role/permission changes are GDPR-
 * critical, so a write failure now propagates as
 * `AuditLogFailedException` instead of being silently swallowed. The
 * caller use case decides whether to roll back the parent operation.
 */

import type { Prisma } from '@prisma/client';
import { AuditLogFailedException } from '@/bounded-contexts/platform/common/exceptions/platform.exceptions';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type AuditLogEntry, type AuditLogOptions, AuditLogPort } from '@/shared-kernel/audit';
import type { LoggerPort } from '@/shared-kernel/logger';

export class AccessModifierAuditLogAdapter extends AuditLogPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async log(entry: AuditLogEntry, options: AuditLogOptions = {}): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action as never,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      this.logger.error(`AuditLog write failed (action=${entry.action}): ${reason}`, {
        context: 'AccessModifierAuditLogAdapter',
        stack: err instanceof Error ? err.stack : undefined,
      });
      if (!options.lenient) {
        throw new AuditLogFailedException(reason);
      }
    }
  }
}
