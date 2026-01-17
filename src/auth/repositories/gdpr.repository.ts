/**
 * GDPR Repository
 * Single Responsibility: Complex GDPR data operations (cascading deletion, audit logs, resume export)
 *
 * Encapsulates the intricate Prisma operations required for GDPR compliance:
 * - Right to Access (data export)
 * - Right to be Forgotten (cascading deletion)
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Prisma-inferred type for resume with all related entities
 */
const resumeWithRelationsInclude = {
  experiences: true,
  education: true,
  skills: true,
  projects: true,
  certifications: true,
  languages: true,
  openSource: true,
} as const;

export type ResumeWithRelationsForExport = Prisma.ResumeGetPayload<{
  include: typeof resumeWithRelationsInclude;
}>;

export interface AuditLogForExport {
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  ipAddress: string | null;
}

export interface CascadingDeletionResult {
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
}

@Injectable()
export class GdprRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all resume IDs for a user (for cascading operations)
   */
  async findUserResumeIds(userId: string): Promise<string[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      select: { id: true },
    });
    return resumes.map((r) => r.id);
  }

  /**
   * Get resumes with all relations for GDPR export
   */
  async findResumesWithRelationsForExport(
    userId: string,
  ): Promise<ResumeWithRelationsForExport[]> {
    return this.prisma.resume.findMany({
      where: { userId },
      include: resumeWithRelationsInclude,
    });
  }

  /**
   * Get audit logs for GDPR export
   */
  async findAuditLogsForExport(
    userId: string,
    limit = 1000,
  ): Promise<AuditLogForExport[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      select: {
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        ipAddress: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Execute cascading deletion of all user data in a transaction
   * Implements GDPR Article 17 - Right to be Forgotten
   */
  async deleteUserWithCascade(
    userId: string,
    resumeIds: string[],
  ): Promise<CascadingDeletionResult> {
    return this.prisma.$transaction(async (tx) => {
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
  }
}
