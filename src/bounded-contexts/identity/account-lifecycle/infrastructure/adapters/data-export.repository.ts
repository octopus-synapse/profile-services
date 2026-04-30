/**
 * Data Export Repository Implementation
 *
 * Prisma-based implementation for exporting user data (GDPR compliance).
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  ExportedAuditLog,
  ExportedConsent,
  ExportedResume,
  ExportedUserData,
} from '../../domain/ports/data-export-repository.port';
import { DataExportRepositoryPort } from '../../domain/ports/data-export-repository.port';

const DEFAULT_AUDIT_LOG_LIMIT = 1000;

export class DataExportRepository implements DataExportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getUserData(userId: string): Promise<ExportedUserData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      hasCompletedOnboarding: user.onboardingCompletedAt !== null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserConsents(userId: string): Promise<ExportedConsent[]> {
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

    return consents;
  }

  async getUserResumes(userId: string): Promise<ExportedResume[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      include: {
        resumeSections: {
          include: {
            sectionType: {
              select: { key: true, semanticKind: true },
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
      id: r.id,
      title: r.title,
      slug: r.slug,
      isPublic: r.isPublic,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      personalInfo: {
        fullName: r.fullName,
        jobTitle: r.jobTitle,
        summary: r.summary,
        phone: r.phone,
        location: r.location,
        website: r.website,
        linkedin: r.linkedin,
        github: r.github,
      },
      sections: r.resumeSections.map((section) => ({
        sectionTypeKey: section.sectionType.key,
        semanticKind: section.sectionType.semanticKind,
        items: section.items.map((item) => ({
          id: item.id,
          order: item.order,
          content: item.content,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      })),
    }));
  }

  async getUserAuditLogs(
    userId: string,
    limit = DEFAULT_AUDIT_LOG_LIMIT,
  ): Promise<ExportedAuditLog[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      select: { action: true, entityType: true, entityId: true, createdAt: true, ipAddress: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  }
}
