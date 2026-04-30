/**
 * Thin AuditLogPort adapter that writes directly to the `AuditLog`
 * Prisma table. Used by AccessModifier use cases to record
 * APPLY/REVOKE events. A write failure is logged via LoggerPort and
 * swallowed — never blocks the caller's main path because audit is
 * a best-effort observability concern.
 */

import type { Prisma } from '@prisma/client';
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
      this.logger.warn(
        `AuditLog write failed (action=${input.action}): ${err instanceof Error ? err.message : 'unknown'}`,
        'AccessModifierAuditLogAdapter',
      );
    }
  }
}
