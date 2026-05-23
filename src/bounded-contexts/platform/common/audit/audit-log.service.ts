/**
 * Audit Log Service
 * Single Responsibility: Track security-critical and compliance-related actions
 *
 * Usage:
 *   constructor(private auditLog: AuditLogService) {  }
 *   await this.auditLog.log(userId, AuditAction.USERNAME_CHANGED, 'User', userId, { before, after }, request);
 */

import { AuditAction, Prisma } from '@prisma/client';
import type { Request } from 'express';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { AuditLogFailedException } from '../exceptions/platform.exceptions';
import { extractAuditMetadata } from './audit-log.helpers';
import type { AuditMetadata, RequestMetadataSource } from './audit-log.types';

/**
 * Detect the specific Prisma error that surfaces when AuditLog.userId
 * FK points at a row that was deleted in the race window between an
 * auth event publishing and the audit handler firing. Other FK
 * violations (e.g. malformed AuditAction enum) shouldn't trigger the
 * AuditLogLost fallback — only this case.
 */
function isUserFkViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2003') return false;
  const meta = (error.meta ?? {}) as { field_name?: string; constraint?: string };
  const target = meta.field_name ?? meta.constraint ?? '';
  return /userid|user_fkey|AuditLog_userId_fkey/i.test(target);
}

export type { AuditMetadata, RequestMetadataSource };

export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  /**
   * Log an audit event.
   *
   * @param userId User performing the action
   * @param action Type of action performed
   * @param entityType Entity type affected (e.g., 'User', 'Resume')
   * @param entityId ID of affected entity
   * @param changes Optional before/after state snapshot
   * @param request Optional Express request object for metadata extraction
   * @param options.lenient When `true`, audit-write failures are logged
   *   and swallowed (the parent operation continues). Default `false` —
   *   per Q51+Q52 in the duplication audit, audit failures are
   *   compliance failures and propagate as `AuditLogFailedException`.
   */
  async log(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    changes?: { before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue },
    request?: RequestMetadataSource,
    options: { lenient?: boolean } = {},
  ): Promise<void> {
    try {
      const metadata = extractAuditMetadata(request);

      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          changesBefore: changes?.before ?? Prisma.JsonNull,
          changesAfter: changes?.after ?? Prisma.JsonNull,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          metadata: metadata.metadata ?? Prisma.JsonNull,
        },
      });

      this.logger.debug('Audit log created', 'AuditLogService', {
        userId,
        action,
        entityType,
        entityId,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';

      // Race-window fallback (see docs/audits/integration-test-triage-2026-05-21.md
      // bug #4): the audit handler can fire after the user row was
      // deleted (admin tool, GDPR erase, or a fast-delete test). FK
      // violation here is NOT a real audit failure — the event was
      // produced legitimately, the target row just vanished. Persist
      // to `AuditLogLost` so the trail survives reaper review, then
      // return success without propagating the exception.
      if (isUserFkViolation(error)) {
        await this.persistLostAudit({
          userId,
          action,
          entityType,
          entityId,
          changes,
          // Re-extract — the `metadata` declared inside `try` is out
          // of scope in `catch`.
          metadata: extractAuditMetadata(request),
          reason,
        });
        return;
      }

      this.logger.error(
        options.lenient
          ? 'Audit log write failed (lenient — swallowed)'
          : 'Audit log write failed — propagating to caller',
        {
          context: 'AuditLogService',
          stack: error instanceof Error ? error.stack : 'Unknown error',
          userId,
          action,
          entityType,
          entityId,
          reason,
        },
      );
      if (!options.lenient) {
        throw new AuditLogFailedException(reason);
      }
    }
  }

  /**
   * Best-effort persistence to `AuditLogLost` when the primary write
   * lost the FK race. If this insert ALSO fails (e.g. DB down), we
   * log loudly but never throw — at that point the original event is
   * already gone and propagating would just break the auth/session
   * flow that already succeeded for the user.
   */
  private async persistLostAudit(args: {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    changes?: { before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue };
    metadata: ReturnType<typeof extractAuditMetadata>;
    reason: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLogLost.create({
        data: {
          originalUserId: args.userId,
          action: args.action,
          entityType: args.entityType,
          entityId: args.entityId,
          eventPayload: {
            changesBefore: args.changes?.before ?? null,
            changesAfter: args.changes?.after ?? null,
            ipAddress: args.metadata.ipAddress ?? null,
            userAgent: args.metadata.userAgent ?? null,
            metadata: args.metadata.metadata ?? null,
          } as Prisma.InputJsonValue,
          reason: 'user_deleted_in_race_window',
        },
      });
      this.logger.warn('Audit log redirected to AuditLogLost', 'AuditLogService', {
        userId: args.userId,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId,
        reason: args.reason,
      });
    } catch (sinkError) {
      this.logger.error('AuditLogLost sink itself failed — audit fully lost', {
        context: 'AuditLogService',
        stack: sinkError instanceof Error ? sinkError.stack : 'Unknown error',
        userId: args.userId,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId,
        primaryReason: args.reason,
      });
    }
  }

  /**
   * @deprecated Strict is now the default for `log()`. Kept as a
   * source-compat facade per Q52 in the duplication audit; remove
   * after callers migrate.
   * @removeBy 2026-08-31
   */
  async logStrict(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    changes?: { before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue },
    request?: RequestMetadataSource,
  ): Promise<void> {
    return this.log(userId, action, entityType, entityId, changes, request);
  }

  /**
   * Log username change with validation context
   */
  async logUsernameChange(
    userId: string,
    oldUsername: string | null,
    newUsername: string,
    request?: Request,
  ): Promise<void> {
    await this.log(
      userId,
      AuditAction.USERNAME_CHANGED,
      'User',
      userId,
      {
        before: { username: oldUsername },
        after: { username: newUsername },
      },
      request,
    );
  }

  /**
   * Log resume deletion (compliance requirement)
   */
  async logResumeDeletion(
    userId: string,
    resumeId: string,
    resumeData: Prisma.InputJsonValue,
    request?: Request,
  ): Promise<void> {
    await this.log(
      userId,
      AuditAction.RESUME_DELETED,
      'Resume',
      resumeId,
      { before: resumeData },
      request,
    );
  }

  /**
   * Log resume visibility change (security requirement)
   */
  async logVisibilityChange(
    userId: string,
    resumeId: string,
    oldVisibility: boolean,
    newVisibility: boolean,
    request?: Request,
  ): Promise<void> {
    await this.log(
      userId,
      AuditAction.RESUME_VISIBILITY_CHANGED,
      'Resume',
      resumeId,
      {
        before: { isPublic: oldVisibility },
        after: { isPublic: newVisibility },
      },
      request,
    );
  }

  /**
   * Log unauthorized access attempts (security monitoring)
   */
  async logUnauthorizedAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    request?: Request,
  ): Promise<void> {
    await this.log(
      userId,
      AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
      resourceType,
      resourceId,
      undefined,
      request,
    );
  }

  /**
   * Log onboarding completion
   */
  async logOnboardingCompleted(
    userId: string,
    username: string,
    resumeId: string,
    request?: Request,
  ): Promise<void> {
    await this.log(
      userId,
      AuditAction.ONBOARDING_COMPLETED,
      'User',
      userId,
      {
        after: { username, resumeId, completedAt: new Date() },
      },
      request,
    );
  }

  /**
   * Log preferences update
   */
  async logPreferencesUpdate(
    userId: string,
    oldPreferences: Prisma.InputJsonValue,
    newPreferences: Prisma.InputJsonValue,
    request?: Request,
  ): Promise<void> {
    await this.log(
      userId,
      AuditAction.PREFERENCES_UPDATED,
      'UserPreferences',
      userId,
      { before: oldPreferences, after: newPreferences },
      request,
    );
  }

  /**
   * Get audit logs for a user (for debugging/compliance)
   */
  async getUserLogs(
    userId: string,
    limit: number = 50,
  ): Promise<Prisma.AuditLogGetPayload<Record<string, never>>[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs for specific action type (security monitoring)
   */
  async getActionLogs(
    action: AuditAction,
    limit: number = 100,
  ): Promise<
    Prisma.AuditLogGetPayload<{
      include: { user: { select: { id: true; username: true; email: true } } };
    }>[]
  > {
    return this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });
  }

  /**
   * Cleanup old audit logs (run via cron job)
   * @param retentionDays Number of days to retain logs (default: 90)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} audit logs older than ${retentionDays} days`,
      'AuditLogService',
    );

    return result.count;
  }
}
