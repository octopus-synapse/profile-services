/**
 * Audit Log Service
 * Single Responsibility: Track security-critical and compliance-related actions
 *
 * Usage:
 *   constructor(private auditLog: AuditLogService) {}
 *   await this.auditLog.log(userId, AuditAction.USERNAME_CHANGED, 'User', userId, { before, after }, request);
 */

import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppLoggerService } from '../logger/logger.service';

export interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  geo?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Log an audit event
   * @param userId User performing the action
   * @param action Type of action performed
   * @param entityType Entity type affected (e.g., 'User', 'Resume')
   * @param entityId ID of affected entity
   * @param changes Optional before/after state snapshot
   * @param request Optional Express request object for metadata extraction
   */
  async log(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    changes?: {
      before?: Prisma.InputJsonValue;
      after?: Prisma.InputJsonValue;
    },
    request?: Request,
  ): Promise<void> {
    try {
      const metadata = this.extractMetadata(request);

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
      // Never fail the main operation due to audit logging
      this.logger.error(
        'Failed to create audit log',
        error instanceof Error ? error.stack : 'Unknown error',
        'AuditLogService',
        {
          userId,
          action,
          entityType,
          entityId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
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
      {
        before: resumeData,
      },
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
      {
        before: oldPreferences,
        after: newPreferences,
      },
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
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Extract metadata from Express request
   */
  private extractMetadata(request?: Request): {
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonValue;
  } {
    if (!request) {
      return {};
    }

    const forwardedFor = request.headers['x-forwarded-for'];
    const ipAddress =
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ??
      request.ip ??
      request.socket.remoteAddress;

    return {
      ipAddress,
      userAgent: request.headers['user-agent'],
      metadata: {
        referer: request.headers.referer,
        method: request.method,
        path: request.path,
      },
    };
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
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} audit logs older than ${retentionDays} days`,
      'AuditLogService',
    );

    return result.count;
  }
}
