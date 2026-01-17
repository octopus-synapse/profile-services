/**
 * GDPR Data Export Service
 * Issue #69: Implement GDPR data export (Right to Access)
 *
 * Exports all user data in machine-readable JSON format
 * as required by GDPR Article 20 (Right to Data Portability)
 */

import { Injectable } from '@nestjs/common';
import { UserNotFoundError } from '@octopus-synapse/profile-contracts';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditAction } from '@prisma/client';
import {
  AuthUserRepository,
  UserConsentRepository,
  GdprRepository,
} from '../repositories';
import type { Request } from 'express';

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
    experiences: unknown[];
    education: unknown[];
    skills: unknown[];
    projects: unknown[];
    certifications: unknown[];
    languages: unknown[];
    openSource: unknown[];
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
    private readonly userRepo: AuthUserRepository,
    private readonly consentRepo: UserConsentRepository,
    private readonly gdprRepo: GdprRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Export all user data in GDPR-compliant format
   */
  async exportUserData(
    userId: string,
    request?: Request,
  ): Promise<GdprExportData> {
    // Verify user exists
    const user = await this.userRepo.findByIdForExport(userId);

    if (!user) {
      throw new UserNotFoundError(userId);
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
    const consents = await this.consentRepo.findAllByUserIdForExport(userId);

    return consents.map((c) => ({
      ...c,
      acceptedAt: c.acceptedAt.toISOString(),
    }));
  }

  private async getUserResumes(userId: string) {
    const resumes =
      await this.gdprRepo.findResumesWithRelationsForExport(userId);

    return resumes.map((r) => ({
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
      experiences: r.experiences.map((e) => ({
        ...e,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate ? e.endDate.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      education: r.education.map((e) => ({
        ...e,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate ? e.endDate.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      skills: r.skills.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      projects: r.projects.map((p) => ({
        ...p,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        endDate: p.endDate ? p.endDate.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      certifications: r.certifications.map((c) => ({
        ...c,
        issueDate: c.issueDate.toISOString(),
        expiryDate: c.expiryDate ? c.expiryDate.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      languages: r.languages.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
      openSource: r.openSource.map((g) => ({
        ...g,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
    }));
  }

  private async getUserAuditLogs(userId: string) {
    const logs = await this.gdprRepo.findAuditLogsForExport(userId);

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
