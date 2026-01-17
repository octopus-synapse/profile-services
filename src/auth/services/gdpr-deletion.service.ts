/**
 * GDPR User Deletion Service
 * Issue #70: Implement cascading user deletion (Right to be Forgotten)
 *
 * Implements GDPR Article 17 - complete erasure of all user data
 * with proper cascading deletion of related entities
 */

import { Injectable } from '@nestjs/common';
import { UserNotFoundError } from '@octopus-synapse/profile-contracts';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditAction } from '@prisma/client';
import { AuthUserRepository, GdprRepository } from '../repositories';
import type { Request } from 'express';

export interface DeletionResult {
  success: boolean;
  deletedEntities: {
    user: boolean;
    resumes: number;
    experiences: number;
    education: number;
    skills: number;
    projects: number;
    certifications: number;
    languages: number;
    openSource: number;
    consents: number;
    auditLogs: number;
    resumeVersions: number;
    resumeShares: number;
  };
  deletedAt: string;
}

@Injectable()
export class GdprDeletionService {
  constructor(
    private readonly userRepo: AuthUserRepository,
    private readonly gdprRepo: GdprRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Completely delete a user and all their data (Right to be Forgotten)
   * This is a cascading deletion that removes ALL user-related data
   */
  async deleteUserCompletely(
    userId: string,
    requestingUserId: string,
    request?: Request,
  ): Promise<DeletionResult> {
    // Verify user exists
    const user = await this.userRepo.findByIdWithEmail(userId);

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Get all resume IDs for this user (needed for cascading)
    const resumeIds = await this.gdprRepo.findUserResumeIds(userId);

    // Execute cascading deletion in a transaction
    const result = await this.gdprRepo.deleteUserWithCascade(userId, resumeIds);

    // Log the deletion (to a separate system log, not user's audit log)
    // This is logged under the requesting user's ID for accountability
    if (requestingUserId !== userId) {
      await this.auditLog.log(
        requestingUserId,
        AuditAction.ACCOUNT_DELETED,
        'User',
        userId,
        { before: { email: user.email } },
        request,
      );
    }

    return {
      success: true,
      deletedEntities: {
        user: true,
        ...result,
      },
      deletedAt: new Date().toISOString(),
    };
  }

  /**
   * Self-deletion by user (with confirmation)
   */
  async requestSelfDeletion(
    userId: string,
    request?: Request,
  ): Promise<DeletionResult> {
    return this.deleteUserCompletely(userId, userId, request);
  }
}
