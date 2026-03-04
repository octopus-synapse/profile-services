/**
 * Data Export Repository Port
 *
 * Defines the contract for exporting all user data for GDPR compliance.
 */

export interface ExportedUserData {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  hasCompletedOnboarding: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportedConsent {
  documentType: string;
  version: string;
  acceptedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ExportedResumeItem {
  id: string;
  order: number;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportedResumeSection {
  sectionTypeKey: string;
  semanticKind: string;
  items: ExportedResumeItem[];
}

export interface ExportedResumePersonalInfo {
  fullName: string | null;
  jobTitle: string | null;
  summary: string | null;
  emailContact: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
}

export interface ExportedResume {
  id: string;
  title: string | null;
  slug: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  personalInfo: ExportedResumePersonalInfo;
  sections: ExportedResumeSection[];
}

export interface ExportedAuditLog {
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  ipAddress: string | null;
}

export interface DataExportRepositoryPort {
  /**
   * Get user data for export
   */
  getUserData(userId: string): Promise<ExportedUserData | null>;

  /**
   * Get user consents
   */
  getUserConsents(userId: string): Promise<ExportedConsent[]>;

  /**
   * Get user resumes with all related data
   */
  getUserResumes(userId: string): Promise<ExportedResume[]>;

  /**
   * Get user audit logs (limited to last 1000)
   */
  getUserAuditLogs(userId: string, limit?: number): Promise<ExportedAuditLog[]>;
}

export const DATA_EXPORT_REPOSITORY_PORT = Symbol('DataExportRepositoryPort');
