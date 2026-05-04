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
import type { LoggerPort } from '@/shared-kernel';
import type { AuditLogPort } from '../../application/use-cases/access-modifier/apply-access-modifier.use-case';

export class AccessModifierAuditLogAdapter implements AuditLogPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async log(input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action as never,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      this.logger.error(
        `AuditLog write failed (action=${input.action}): ${reason}`,
        err instanceof Error ? err.stack : undefined,
        'AccessModifierAuditLogAdapter',
      );
      throw new AuditLogFailedException(reason);
    }
  }
}
