/**
 * Audit Logger Port
 *
 * Defines the contract for logging audit events for GDPR compliance.
 */

import type { AuditAction } from '@prisma/client';

export interface AuditLoggerPort {
  /**
   * Generic log method for audit actions
   */
  log(userId: string, action: AuditAction, entityType: string, entityId: string): Promise<void>;

  /**
   * Log data export request
   */
  logDataExportRequested(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;

  /**
   * Log data export download
   */
  logDataExportDownloaded(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
}

export const AUDIT_LOGGER_PORT = Symbol('AuditLoggerPort');
