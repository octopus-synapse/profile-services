/**
 * In-Memory Audit Log Repository
 *
 * Stores audit logs for testing audit trail functionality.
 */

import type { AuditAction } from '@prisma/client';

export class InMemoryAuditLogRepository {
  private logs: Array<{
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
  }> = [];

  async create(data: {
    data: {
      userId: string;
      action: AuditAction;
      entityType: string;
      entityId: string;
      changesBefore?: unknown;
      changesAfter?: unknown;
      ipAddress?: string;
      userAgent?: string;
      metadata?: unknown;
    };
  }): Promise<(typeof this.logs)[0]> {
    const log = {
      id: `log-${this.logs.length + 1}`,
      ...data.data,
      createdAt: new Date(),
    };
    this.logs.push(log);
    return log;
  }

  async findMany(options?: {
    where?: { userId?: string; action?: AuditAction; entityType?: string; entityId?: string };
    orderBy?: { createdAt?: 'asc' | 'desc' };
    take?: number;
    include?: { user?: { select?: Record<string, boolean> } };
  }): Promise<typeof this.logs> {
    let results = [...this.logs];

    // Apply filters
    if (options?.where?.userId) {
      results = results.filter((log) => log.userId === options.where?.userId);
    }
    if (options?.where?.action) {
      results = results.filter((log) => log.action === options.where?.action);
    }
    if (options?.where?.entityType) {
      results = results.filter((log) => log.entityType === options.where?.entityType);
    }
    if (options?.where?.entityId) {
      results = results.filter((log) => log.entityId === options.where?.entityId);
    }

    // Apply ordering
    if (options?.orderBy?.createdAt === 'desc') {
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (options?.orderBy?.createdAt === 'asc') {
      results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    // Apply limit
    if (options?.take) {
      results = results.slice(0, options.take);
    }

    return results;
  }

  async deleteMany(options?: {
    where?: { createdAt?: { lt?: Date } };
  }): Promise<{ count: number }> {
    const initialCount = this.logs.length;

    if (options?.where?.createdAt?.lt) {
      this.logs = this.logs.filter(
        (log) => log.createdAt >= (options.where?.createdAt?.lt ?? new Date()),
      );
    } else {
      this.logs = [];
    }

    return { count: initialCount - this.logs.length };
  }

  // Test helpers
  seed(log: {
    id?: string;
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    changesBefore?: unknown;
    changesAfter?: unknown;
    ipAddress?: string;
    userAgent?: string;
    metadata?: unknown;
    createdAt?: Date;
  }): void {
    this.logs.push({
      id: log.id ?? `log-${this.logs.length + 1}`,
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      changesBefore: log.changesBefore,
      changesAfter: log.changesAfter,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt ?? new Date(),
    });
  }

  clear(): void {
    this.logs = [];
  }

  getAll(): typeof this.logs {
    return [...this.logs];
  }

  getByUserId(userId: string): typeof this.logs {
    return this.logs.filter((log) => log.userId === userId);
  }

  getByAction(action: AuditAction): typeof this.logs {
    return this.logs.filter((log) => log.action === action);
  }
}
