/**
 * GDPR Data Export Service
 * Issue #69: Implement GDPR data export (Right to Access)
 *
 * Exports all user data in machine-readable JSON format
 * as required by GDPR Article 20 (Right to Data Portability)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import type { Request } from 'express';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface GdprExportData {
  exportedAt: string;
  dataRetentionPolicy: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    username: string | null;
    hasCompletedOnboarding: boolean;
    createdAt: string;
    updatedAt: string;
  };
  consents: Array<{
    documentType: string;
    version: string;
    acceptedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  resumes: Array<{
    id: string;
    title: string | null;
    slug: string | null;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    personalInfo: unknown;
    sections: Array<{
      sectionTypeKey: string;
      semanticKind: string;
      items: Array<{
        id: string;
        order: number;
        content: unknown;
        createdAt: string;
        updatedAt: string;
      }>;
    }>;
  }>;
  auditLogs: Array<{
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    ipAddress: string | null;
  }>;
}

@Injectable()
export class GdprExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Export all user data in GDPR-compliant format
   */
  async exportUserData(userId: string, request?: Request): Promise<GdprExportData> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        hasCompletedOnboarding: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch all related data in parallel
    const [consents, resumes, auditLogs] = await Promise.all([
      this.getUserConsents(userId),
      this.getUserResumes(userId),
      this.getUserAuditLogs(userId),
    ]);

    // Log the export request
    await this.auditLog.log(
      userId,
      AuditAction.DATA_EXPORT_REQUESTED,
      'User',
      userId,
      undefined,
      request,
    );

    return {
      exportedAt: new Date().toISOString(),
      dataRetentionPolicy:
        'Your data is retained as long as your account is active. ' +
        'You may request deletion at any time under GDPR Article 17.',
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      consents,
      resumes,
      auditLogs,
    };
  }

  private async getUserConsents(userId: string) {
    const consents = await this.prisma.userConsent.findMany({
      where: { userId },
      select: {
        documentType: true,
        version: true,
        acceptedAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { acceptedAt: 'desc' },
    });

    return consents.map((c) => ({
      ...c,
      acceptedAt: c.acceptedAt.toISOString(),
    }));
  }

  private async getUserResumes(userId: string) {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      include: {
        resumeSections: {
          include: {
            sectionType: {
              select: {
                key: true,
                semanticKind: true,
              },
            },
            items: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return resumes.map((r) => ({
      sections: this.mapResumeSections(r.resumeSections),
      id: r.id,
      title: r.title,
      slug: r.slug,
      isPublic: r.isPublic,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      personalInfo: {
        fullName: r.fullName,
        jobTitle: r.jobTitle,
        summary: r.summary,
        emailContact: r.emailContact,
        phone: r.phone,
        location: r.location,
        website: r.website,
        linkedin: r.linkedin,
        github: r.github,
      },
    }));
  }

  private mapResumeSections(
    resumeSections: Array<{
      sectionType: { key: string; semanticKind: string };
      items: Array<{
        id: string;
        order: number;
        content: unknown;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }>,
  ): GdprExportData['resumes'][number]['sections'] {
    return resumeSections.map((section) => ({
      sectionTypeKey: section.sectionType.key,
      semanticKind: section.sectionType.semanticKind,
      items: section.items.map((item) => ({
        id: item.id,
        order: item.order,
        content: item.content,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    }));
  }

  private async getUserAuditLogs(userId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      select: {
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        ipAddress: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to last 1000 entries
    });

    return logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Log when user downloads their export
   */
  async logExportDownload(userId: string, request?: Request): Promise<void> {
    await this.auditLog.log(
      userId,
      AuditAction.DATA_EXPORT_DOWNLOADED,
      'User',
      userId,
      undefined,
      request,
    );
  }
}
