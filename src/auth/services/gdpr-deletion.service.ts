/**
 * GDPR User Deletion Service
 * Issue #70: Implement cascading user deletion (Right to be Forgotten)
 *
 * Implements GDPR Article 17 - complete erasure of all user data
 * with proper cascading deletion of related entities
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditAction } from '@prisma/client';
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
    private readonly prisma: PrismaService,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all resume IDs for this user (needed for cascading)
    const resumeIds = await this.prisma.resume
      .findMany({
        where: { userId },
        select: { id: true },
      })
      .then((resumes) => resumes.map((r) => r.id));

    // Execute cascading deletion in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Delete all resume sub-resources first
      const [
        experiences,
        education,
        skills,
        projects,
        certifications,
        languages,
        openSource,
      ] = await Promise.all([
        tx.experience.deleteMany({ where: { resumeId: { in: resumeIds } } }),
        tx.education.deleteMany({ where: { resumeId: { in: resumeIds } } }),
        tx.skill.deleteMany({ where: { resumeId: { in: resumeIds } } }),
        tx.project.deleteMany({ where: { resumeId: { in: resumeIds } } }),
        tx.certification.deleteMany({ where: { resumeId: { in: resumeIds } } }),
        tx.language.deleteMany({ where: { resumeId: { in: resumeIds } } }),
        tx.openSourceContribution.deleteMany({
          where: { resumeId: { in: resumeIds } },
        }),
      ]);

      // 2. Delete resume versions and shares
      const [resumeVersions, resumeShares] = await Promise.all([
        tx.resumeVersion.deleteMany({ where: { resumeId: { in: resumeIds } } }),
        tx.resumeShare.deleteMany({
          where: { resumeId: { in: resumeIds } },
        }),
      ]);

      // 3. Delete resumes
      const resumes = await tx.resume.deleteMany({ where: { userId } });

      // 4. Delete user consents
      const consents = await tx.userConsent.deleteMany({ where: { userId } });

      // 5. Delete audit logs (user has right to have logs deleted too)
      const auditLogs = await tx.auditLog.deleteMany({ where: { userId } });

      // 6. Finally, delete the user
      await tx.user.delete({ where: { id: userId } });

      return {
        resumes: resumes.count,
        experiences: experiences.count,
        education: education.count,
        skills: skills.count,
        projects: projects.count,
        certifications: certifications.count,
        languages: languages.count,
        openSource: openSource.count,
        consents: consents.count,
        auditLogs: auditLogs.count,
        resumeVersions: resumeVersions.count,
        resumeShares: resumeShares.count,
      };
    });

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
