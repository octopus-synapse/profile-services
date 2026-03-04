/**
 * In-Memory Audit Logger
 *
 * Fake implementation for testing audit logging.
 * Stores audit entries in memory for verification.
 */

import type { AuditAction } from '@prisma/client';
import type { AuditLoggerPort } from '../../../account-lifecycle/ports/outbound/audit-logger.port';

export interface AuditEntry {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  timestamp: Date;
}

export interface ExportAuditEntry {
  userId: string;
  type: 'requested' | 'downloaded';
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class InMemoryAuditLogger implements AuditLoggerPort {
  private entries: AuditEntry[] = [];
  private exportEntries: ExportAuditEntry[] = [];

  async log(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    this.entries.push({
      userId,
      action,
      entityType,
      entityId,
      timestamp: new Date(),
    });
  }

  async logDataExportRequested(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    this.exportEntries.push({
      userId,
      type: 'requested',
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  async logDataExportDownloaded(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    this.exportEntries.push({
      userId,
      type: 'downloaded',
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  // Test helpers
  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getExportEntries(): ExportAuditEntry[] {
    return [...this.exportEntries];
  }

  getEntriesForUser(userId: string): AuditEntry[] {
    return this.entries.filter((e) => e.userId === userId);
  }

  hasLoggedAction(userIdOrAction: string | AuditAction, action?: AuditAction): boolean {
    // Support both (userId, action) and (action) signatures
    if (action !== undefined) {
      // Called as hasLoggedAction(userId, action)
      const userId = userIdOrAction as string;
      return this.entries.some((e) => e.userId === userId && e.action === action);
    }
    // Called as hasLoggedAction(action)
    return this.entries.some((e) => e.action === userIdOrAction);
  }

  hasExportRequested(userId?: string): boolean {
    if (userId) {
      return this.exportEntries.some((e) => e.userId === userId && e.type === 'requested');
    }
    return this.exportEntries.some((e) => e.type === 'requested');
  }

  hasExportDownloaded(userId?: string): boolean {
    if (userId) {
      return this.exportEntries.some((e) => e.userId === userId && e.type === 'downloaded');
    }
    return this.exportEntries.some((e) => e.type === 'downloaded');
  }

  getLastEntry(): AuditEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  getLastExportEntry(): ExportAuditEntry | undefined {
    return this.exportEntries[this.exportEntries.length - 1];
  }

  clear(): void {
    this.entries = [];
    this.exportEntries = [];
  }
}
