/**
 * `FlagAuditPort` adapter that delegates to the platform-wide
 * `AuditLogService`. Bridges the BC's narrow audit shape into the
 * generic `AuditAction.FEATURE_FLAG_TOGGLED` write — keeps the
 * application layer free of Prisma + Express coupling.
 */

import { AuditAction } from '@prisma/client';
import type { Request } from 'express';
import type { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import type { LoggerPort } from '@/shared-kernel';
import type { FlagAuditPort } from '../../application/ports/flag-audit.port';

export class AuditLogFlagAuditAdapter implements FlagAuditPort {
  constructor(
    private readonly audit: AuditLogService,
    private readonly logger: LoggerPort,
  ) {}

  async logFlagToggle(input: {
    actorId: string;
    flagKey: string;
    changes: {
      before: { enabled: boolean; enabledForRoles: string[] };
      after: { enabled: boolean; enabledForRoles: string[] };
    };
    request?: unknown;
  }): Promise<void> {
    try {
      await this.audit.log(
        input.actorId,
        AuditAction.FEATURE_FLAG_TOGGLED,
        'FeatureFlag',
        input.flagKey,
        { before: input.changes.before, after: input.changes.after },
        input.request as Request | undefined,
      );
    } catch (err) {
      this.logger.error(`Failed to write flag-toggle audit entry for ${input.flagKey}`, {
        context: 'AuditLogFlagAuditAdapter',
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }
}
