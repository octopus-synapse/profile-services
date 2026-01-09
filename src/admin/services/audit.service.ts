import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

/**
 * AuditService - Stub for GDPR compliance
 * TODO: Expand in issue #71 with full audit trail implementation
 */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event
   * Minimal implementation to unblock #75
   * Will be expanded in #71 with IP tracking, user agent, metadata, etc.
   */
  async log(
    userId: string,
    action: AuditAction,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Stub implementation - just log for now
    // Full implementation in #71 will persist to AuditLog model
    console.log(`[AUDIT] User ${userId} performed ${action}`, metadata);
  }
}
