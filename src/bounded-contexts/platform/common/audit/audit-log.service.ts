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
      this.logger.error(
        options.lenient
          ? 'Audit log write failed (lenient — swallowed)'
          : 'Audit log write failed — propagating to caller',
        error instanceof Error ? error.stack : 'Unknown error',
        'AuditLogService',
        { userId, action, entityType, entityId, reason },
      );
      if (!options.lenient) {
        throw new AuditLogFailedException(reason);
      }
    }
  }

  /**
   * @deprecated Strict is now the default for `log()`. Kept as a
   * source-compat facade per Q52 in the duplication audit; remove
   * after callers migrate.
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
