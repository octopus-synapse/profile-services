/**
 * Audit Logger Adapter Implementation
 *
 * Delegates to the platform audit log service.
 * Note: ipAddress/userAgent are not passed to the audit service since
 * AuditLogService.log() expects a full Express Request object.
 * The use-case layer shouldn't have access to Request objects.
 */

import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import type { AuditLoggerPort } from '../../ports/outbound/audit-logger.port';

@Injectable()
export class AuditLoggerAdapter implements AuditLoggerPort {
  constructor(private readonly auditLog: AuditLogService) {}

  async log(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.auditLog.log(userId, action, entityType, entityId);
  }

  async logDataExportRequested(
    userId: string,
    _ipAddress?: string,
    _userAgent?: string,
  ): Promise<void> {
    // Note: metadata extraction happens at controller level via Request
    await this.auditLog.log(userId, AuditAction.DATA_EXPORT_REQUESTED, 'User', userId);
  }

  async logDataExportDownloaded(
    userId: string,
    _ipAddress?: string,
    _userAgent?: string,
  ): Promise<void> {
    // Note: metadata extraction happens at controller level via Request
    await this.auditLog.log(userId, AuditAction.DATA_EXPORT_DOWNLOADED, 'User', userId);
  }
}
