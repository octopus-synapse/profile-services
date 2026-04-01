/**
 * Export Data Use Case
 *
 * GDPR Article 20 - Right to Data Portability
 * Exports all user data in machine-readable format.
 */

import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import type { AuditLoggerPort } from '../../../domain/ports/audit-logger.port';
import type {
  DataExportRepositoryPort,
  ExportedAuditLog,
  ExportedConsent,
  ExportedResume,
} from '../../../domain/ports/data-export-repository.port';

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

const DATA_RETENTION_POLICY =
  'Your data is retained as long as your account is active. ' +
  'You may request deletion at any time under GDPR Article 17.';

export class ExportDataUseCase {
  constructor(
    private readonly repository: DataExportRepositoryPort,
    private readonly auditLogger?: AuditLoggerPort,
  ) {}

  async execute(userId: string, ipAddress?: string, userAgent?: string): Promise<GdprExportData> {
    const user = await this.repository.getUserData(userId);

    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    // Fetch all related data in parallel
    const [consents, resumes, auditLogs] = await Promise.all([
      this.repository.getUserConsents(userId),
      this.repository.getUserResumes(userId),
      this.repository.getUserAuditLogs(userId),
    ]);

    // Log the export request
    if (this.auditLogger) {
      await this.auditLogger.logDataExportRequested(userId, ipAddress, userAgent);
    }

    return {
      exportedAt: new Date().toISOString(),
      dataRetentionPolicy: DATA_RETENTION_POLICY,
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      consents: this.formatConsents(consents),
      resumes: this.formatResumes(resumes),
      auditLogs: this.formatAuditLogs(auditLogs),
    };
  }

  private formatConsents(consents: ExportedConsent[]): GdprExportData['consents'] {
    return consents.map((c) => ({
      ...c,
      acceptedAt: c.acceptedAt.toISOString(),
    }));
  }

  private formatResumes(resumes: ExportedResume[]): GdprExportData['resumes'] {
    return resumes.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      isPublic: r.isPublic,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      personalInfo: r.personalInfo,
      sections: r.sections.map((section) => ({
        sectionTypeKey: section.sectionTypeKey,
        semanticKind: section.semanticKind,
        items: section.items.map((item) => ({
          id: item.id,
          order: item.order,
          content: item.content,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      })),
    }));
  }

  private formatAuditLogs(logs: ExportedAuditLog[]): GdprExportData['auditLogs'] {
    return logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
