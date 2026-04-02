/**
 * In-Memory Email Log Repository
 *
 * Stores email logs for testing email notification functionality.
 */

import type { EmailLog, EmailStatus } from '@prisma/client';

export class InMemoryEmailLogRepository {
  private logs: Array<{
    id: string;
    userId: string | null;
    to: string;
    subject: string;
    template: string;
    status: EmailStatus;
    sentAt: Date | null;
    failedAt: Date | null;
    error: string | null;
    metadata: unknown;
    createdAt: Date;
  }> = [];

  async create(data: {
    data: {
      userId?: string;
      to: string;
      subject: string;
      template: string;
      status?: EmailStatus;
      metadata?: unknown;
    };
  }): Promise<EmailLog> {
    const log = {
      id: `email-log-${this.logs.length + 1}`,
      userId: data.data.userId ?? null,
      to: data.data.to,
      subject: data.data.subject,
      template: data.data.template,
      status: data.data.status ?? ('PENDING' as EmailStatus),
      sentAt: null,
      failedAt: null,
      error: null,
      metadata: data.data.metadata ?? null,
      createdAt: new Date(),
    };
    this.logs.push(log);
    return log as EmailLog;
  }

  async findMany(options?: {
    where?: { userId?: string; status?: EmailStatus };
    orderBy?: { createdAt?: 'asc' | 'desc' };
    take?: number;
    skip?: number;
  }): Promise<EmailLog[]> {
    let results = [...this.logs];

    // Apply filters
    if (options?.where?.userId) {
      results = results.filter((log) => log.userId === options.where?.userId);
    }
    if (options?.where?.status) {
      results = results.filter((log) => log.status === options.where?.status);
    }

    // Apply ordering
    if (options?.orderBy?.createdAt === 'desc') {
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (options?.orderBy?.createdAt === 'asc') {
      results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    // Apply skip
    if (options?.skip) {
      results = results.slice(options.skip);
    }

    // Apply limit
    if (options?.take) {
      results = results.slice(0, options.take);
    }

    return results as EmailLog[];
  }

  async findUnique(options: { where: { id: string } }): Promise<(typeof this.logs)[0] | null> {
    return this.logs.find((log) => log.id === options.where.id) ?? null;
  }

  async update(options: {
    where: { id: string };
    data: Partial<{
      status: EmailStatus;
      sentAt: Date;
      failedAt: Date;
      error: string;
    }>;
  }): Promise<EmailLog> {
    const index = this.logs.findIndex((log) => log.id === options.where.id);
    if (index === -1) {
      throw new Error(`Email log with id ${options.where.id} not found`);
    }

    this.logs[index] = { ...this.logs[index], ...options.data };
    return this.logs[index] as EmailLog;
  }

  async count(options?: { where?: { userId?: string; status?: EmailStatus } }): Promise<number> {
    let results = [...this.logs];

    if (options?.where?.userId) {
      results = results.filter((log) => log.userId === options.where?.userId);
    }
    if (options?.where?.status) {
      results = results.filter((log) => log.status === options.where?.status);
    }

    return results.length;
  }

  // Test helpers
  seed(log: {
    id?: string;
    userId?: string | null;
    to: string;
    subject: string;
    template: string;
    status?: EmailStatus;
    sentAt?: Date | null;
    failedAt?: Date | null;
    error?: string | null;
    metadata?: unknown;
    createdAt?: Date;
  }): void {
    this.logs.push({
      id: log.id ?? `email-log-${this.logs.length + 1}`,
      userId: log.userId ?? null,
      to: log.to,
      subject: log.subject,
      template: log.template,
      status: log.status ?? ('PENDING' as EmailStatus),
      sentAt: log.sentAt ?? null,
      failedAt: log.failedAt ?? null,
      error: log.error ?? null,
      metadata: log.metadata ?? null,
      createdAt: log.createdAt ?? new Date(),
    });
  }

  clear(): void {
    this.logs = [];
  }

  getAll(): typeof this.logs {
    return [...this.logs];
  }

  getByStatus(status: EmailStatus): typeof this.logs {
    return this.logs.filter((log) => log.status === status);
  }

  getPending(): typeof this.logs {
    return this.logs.filter((log) => log.status === 'PENDING');
  }

  getSent(): typeof this.logs {
    return this.logs.filter((log) => log.status === 'SENT');
  }

  getFailed(): typeof this.logs {
    return this.logs.filter((log) => log.status === 'FAILED');
  }
}
