/**
 * Test Audit Log Factory
 *
 * Creates test audit log data with sensible defaults.
 */

import type { AuditAction } from '@prisma/client';

export function createTestAuditLog(overrides?: {
  id?: string;
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  changesBefore?: unknown;
  changesAfter?: unknown;
  ipAddress?: string;
  userAgent?: string;
  metadata?: unknown;
  createdAt?: Date;
}): {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changesBefore?: unknown;
  changesAfter?: unknown;
  ipAddress?: string;
  userAgent?: string;
  metadata?: unknown;
  createdAt: Date;
} {
  return {
    id: overrides?.id ?? 'log-1',
    userId: overrides?.userId ?? 'user-123',
    action: overrides?.action ?? ('USERNAME_CHANGED' as AuditAction),
    entityType: overrides?.entityType ?? 'User',
    entityId: overrides?.entityId ?? 'user-123',
    changesBefore: overrides?.changesBefore,
    changesAfter: overrides?.changesAfter,
    ipAddress: overrides?.ipAddress,
    userAgent: overrides?.userAgent,
    metadata: overrides?.metadata,
    createdAt: overrides?.createdAt ?? new Date(),
  };
}
