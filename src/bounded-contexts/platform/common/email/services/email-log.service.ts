/**
 * Email Log Service
 *
 * Handles email logging and tracking for analytics and debugging.
 *
 * Uncle Bob: "Logging is a cross-cutting concern that should be isolated"
 */

import { Injectable } from '@nestjs/common';
import type { EmailLog, EmailStatus } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

interface LogEmailParams {
  userId?: string;
  to: string;
  subject: string;
  template: string;
  metadata?: Record<string, unknown>;
}

interface EmailHistoryOptions {
  skip?: number;
  take?: number;
  status?: EmailStatus;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
}

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class EmailLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an email log entry.
   */
  async logEmail(params: LogEmailParams): Promise<EmailLog> {
    const { userId, to, subject, template, metadata } = params;

    return this.prisma.emailLog.create({
      data: {
        userId,
        to,
        subject,
        template,
        status: 'PENDING',
        metadata: metadata as object,
      },
    });
  }

  /**
   * Marks an email as successfully sent.
   */
  async markAsSent(logId: string): Promise<void> {
    await this.prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Marks an email as failed with error details.
   */
  async markAsFailed(logId: string, error: string): Promise<void> {
    await this.prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        error,
      },
    });
  }

  /**
   * Gets email history for a user.
   */
  async getEmailHistory(userId: string, options: EmailHistoryOptions = {}): Promise<EmailLog[]> {
    const { skip, take = DEFAULT_PAGE_SIZE, status } = options;

    return this.prisma.emailLog.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      ...(skip !== undefined && { skip }),
      take,
    });
  }

  /**
   * Gets email statistics for a user.
   */
  async getEmailStats(userId: string): Promise<EmailStats> {
    const [total, sent, failed] = await Promise.all([
      this.prisma.emailLog.count({ where: { userId } }),
      this.prisma.emailLog.count({ where: { userId, status: 'SENT' } }),
      this.prisma.emailLog.count({ where: { userId, status: 'FAILED' } }),
    ]);

    return { total, sent, failed };
  }

  /**
   * Gets all pending emails for retry processing.
   */
  async getPendingEmails(): Promise<EmailLog[]> {
    return this.prisma.emailLog.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }
}
