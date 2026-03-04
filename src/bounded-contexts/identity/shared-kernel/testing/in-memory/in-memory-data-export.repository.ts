/**
 * In-Memory Data Export Repository
 *
 * Fake implementation for testing GDPR data export operations.
 */

import type {
  DataExportRepositoryPort,
  ExportedAuditLog,
  ExportedConsent,
  ExportedResume,
  ExportedUserData,
} from '../../../account-lifecycle/ports/outbound/data-export-repository.port';

export class InMemoryDataExportRepository implements DataExportRepositoryPort {
  private users: Map<string, ExportedUserData> = new Map();
  private consents: Map<string, ExportedConsent[]> = new Map();
  private resumes: Map<string, ExportedResume[]> = new Map();
  private auditLogs: Map<string, ExportedAuditLog[]> = new Map();

  async getUserData(userId: string): Promise<ExportedUserData | null> {
    return this.users.get(userId) ?? null;
  }

  async getUserConsents(userId: string): Promise<ExportedConsent[]> {
    return this.consents.get(userId) ?? [];
  }

  async getUserResumes(userId: string): Promise<ExportedResume[]> {
    return this.resumes.get(userId) ?? [];
  }

  async getUserAuditLogs(userId: string, limit = 1000): Promise<ExportedAuditLog[]> {
    const logs = this.auditLogs.get(userId) ?? [];
    return logs.slice(0, limit);
  }

  // Test helpers
  seedUser(user: ExportedUserData): void {
    this.users.set(user.id, user);
  }

  seedConsents(userId: string, consents: ExportedConsent[]): void {
    this.consents.set(userId, consents);
  }

  seedResumes(userId: string, resumes: ExportedResume[]): void {
    this.resumes.set(userId, resumes);
  }

  seedAuditLogs(userId: string, logs: ExportedAuditLog[]): void {
    this.auditLogs.set(userId, logs);
  }

  clear(): void {
    this.users.clear();
    this.consents.clear();
    this.resumes.clear();
    this.auditLogs.clear();
  }
}
