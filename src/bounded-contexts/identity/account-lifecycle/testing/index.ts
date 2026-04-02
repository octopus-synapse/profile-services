/**
 * Account Lifecycle Testing Module
 *
 * In-memory implementations for testing account lifecycle features:
 * - Account CRUD operations
 * - Consent management
 * - Data export
 * - Password hashing
 */

import type { AuditAction, ConsentDocumentType } from '@prisma/client';
import type {
  AccountData,
  AccountLifecycleRepositoryPort,
  CreateAccountData,
} from '../domain/ports/account-lifecycle-repository.port';
import type { AuditLoggerPort } from '../domain/ports/audit-logger.port';
import type {
  ConsentRecord,
  ConsentRepositoryPort,
  CreateConsentData,
} from '../domain/ports/consent-repository.port';
import type {
  DataExportRepositoryPort,
  ExportedAuditLog,
  ExportedConsent,
  ExportedResume,
  ExportedUserData,
} from '../domain/ports/data-export-repository.port';
import type { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import type { VersionConfigPort } from '../domain/ports/version-config.port';

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY ACCOUNT LIFECYCLE REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryAccountLifecycleRepository implements AccountLifecycleRepositoryPort {
  private accounts = new Map<string, AccountData>();
  private emailIndex = new Map<string, string>(); // email -> userId
  private accountCounter = 0;

  async findById(userId: string): Promise<AccountData | null> {
    return this.accounts.get(userId) ?? null;
  }

  async findByEmail(email: string): Promise<AccountData | null> {
    const userId = this.emailIndex.get(email);
    if (!userId) return null;
    return this.accounts.get(userId) ?? null;
  }

  async emailExists(email: string): Promise<boolean> {
    return this.emailIndex.has(email);
  }

  async create(data: CreateAccountData): Promise<AccountData> {
    this.accountCounter++;
    const account: AccountData = {
      id: `user-${this.accountCounter}`,
      email: data.email,
      name: data.name ?? null,
      isActive: true,
      createdAt: new Date(),
    };
    this.accounts.set(account.id, account);
    this.emailIndex.set(account.email, account.id);
    return account;
  }

  async deactivate(userId: string): Promise<void> {
    const account = this.accounts.get(userId);
    if (account) {
      this.accounts.set(userId, { ...account, isActive: false });
    }
  }

  async reactivate(userId: string): Promise<void> {
    const account = this.accounts.get(userId);
    if (account) {
      this.accounts.set(userId, { ...account, isActive: true });
    }
  }

  async delete(userId: string): Promise<void> {
    const account = this.accounts.get(userId);
    if (account) {
      this.emailIndex.delete(account.email);
      this.accounts.delete(userId);
    }
  }

  // Test helpers
  clear(): void {
    this.accounts.clear();
    this.emailIndex.clear();
    this.accountCounter = 0;
  }

  seedAccount(account: AccountData): void {
    this.accounts.set(account.id, account);
    this.emailIndex.set(account.email, account.id);
  }

  getAllAccounts(): AccountData[] {
    return Array.from(this.accounts.values());
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY PASSWORD HASHER
// ═══════════════════════════════════════════════════════════════

export class InMemoryPasswordHasher implements PasswordHasherPort {
  private hashMap = new Map<string, string>();

  async hash(password: string): Promise<string> {
    const hash = `hashed:${password}`;
    this.hashMap.set(hash, password);
    return hash;
  }

  async compare(password: string, hash: string): Promise<boolean> {
    const original = this.hashMap.get(hash);
    if (original) {
      return original === password;
    }
    // Fallback: check if hash matches our format
    return hash === `hashed:${password}`;
  }

  // Test helper
  clear(): void {
    this.hashMap.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY CONSENT REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryConsentRepository implements ConsentRepositoryPort {
  private consents: ConsentRecord[] = [];
  private consentCounter = 0;

  async create(data: CreateConsentData): Promise<ConsentRecord> {
    this.consentCounter++;
    const consent: ConsentRecord = {
      id: `consent-${this.consentCounter}`,
      userId: data.userId,
      documentType: data.documentType,
      version: data.version,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      acceptedAt: new Date(),
    };
    this.consents.push(consent);
    return consent;
  }

  async findByUserAndDocumentType(
    userId: string,
    documentType: ConsentDocumentType,
    version: string,
  ): Promise<ConsentRecord | null> {
    return (
      this.consents.find(
        (c) => c.userId === userId && c.documentType === documentType && c.version === version,
      ) ?? null
    );
  }

  async findAllByUser(userId: string): Promise<ConsentRecord[]> {
    return this.consents
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime());
  }

  // Test helpers
  clear(): void {
    this.consents = [];
    this.consentCounter = 0;
  }

  seedConsent(consent: ConsentRecord): void {
    this.consents.push(consent);
  }

  getAllConsents(): ConsentRecord[] {
    return [...this.consents];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY VERSION CONFIG
// ═══════════════════════════════════════════════════════════════

export class InMemoryVersionConfig implements VersionConfigPort {
  private tosVersion = '1.0.0';
  private privacyVersion = '1.0.0';
  private marketingVersion = '1.0.0';

  getTosVersion(): string {
    return this.tosVersion;
  }

  getPrivacyPolicyVersion(): string {
    return this.privacyVersion;
  }

  getMarketingConsentVersion(): string {
    return this.marketingVersion;
  }

  // Test helpers
  setTosVersion(version: string): void {
    this.tosVersion = version;
  }

  setPrivacyPolicyVersion(version: string): void {
    this.privacyVersion = version;
  }

  setMarketingConsentVersion(version: string): void {
    this.marketingVersion = version;
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY DATA EXPORT REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryDataExportRepository implements DataExportRepositoryPort {
  private users = new Map<string, ExportedUserData>();
  private consents: ExportedConsent[] = [];
  private resumes: ExportedResume[] = [];
  private auditLogs: ExportedAuditLog[] = [];

  async getUserData(userId: string): Promise<ExportedUserData | null> {
    return this.users.get(userId) ?? null;
  }

  async getUserConsents(userId: string): Promise<ExportedConsent[]> {
    return this.consents.filter((c) => c.ipAddress === userId); // Simplified for testing
  }

  async getUserResumes(userId: string): Promise<ExportedResume[]> {
    return this.resumes.filter((r) => r.id.startsWith(userId)); // Simplified for testing
  }

  async getUserAuditLogs(userId: string, limit = 1000): Promise<ExportedAuditLog[]> {
    return this.auditLogs.filter((log) => log.entityId === userId).slice(0, limit);
  }

  // Test helpers
  seedUser(user: ExportedUserData): void {
    this.users.set(user.id, user);
  }

  seedConsent(consent: ExportedConsent): void {
    this.consents.push(consent);
  }

  seedResume(resume: ExportedResume): void {
    this.resumes.push(resume);
  }

  seedAuditLog(log: ExportedAuditLog): void {
    this.auditLogs.push(log);
  }

  clear(): void {
    this.users.clear();
    this.consents = [];
    this.resumes = [];
    this.auditLogs = [];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY AUDIT LOGGER
// ═══════════════════════════════════════════════════════════════

export class InMemoryAuditLogger implements AuditLoggerPort {
  private logs: Array<{
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    timestamp: Date;
  }> = [];

  async log(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    this.logs.push({
      userId,
      action,
      entityType,
      entityId,
      timestamp: new Date(),
    });
  }

  async logDataExportRequested(
    userId: string,
    _ipAddress?: string,
    _userAgent?: string,
  ): Promise<void> {
    this.logs.push({
      userId,
      action: 'DATA_EXPORT_REQUESTED' as AuditAction,
      entityType: 'User',
      entityId: userId,
      timestamp: new Date(),
    });
  }

  async logDataExportDownloaded(
    userId: string,
    _ipAddress?: string,
    _userAgent?: string,
  ): Promise<void> {
    this.logs.push({
      userId,
      action: 'DATA_EXPORT_DOWNLOADED' as AuditAction,
      entityType: 'User',
      entityId: userId,
      timestamp: new Date(),
    });
  }

  // Test helpers
  getLogs() {
    return [...this.logs];
  }

  getLogsByUser(userId: string) {
    return this.logs.filter((log) => log.userId === userId);
  }

  clear(): void {
    this.logs = [];
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createAccountData(overrides: Partial<AccountData> = {}): AccountData {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: 'test@example.com',
    name: 'Test User',
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createConsentRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    id: `consent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: 'user-1',
    documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
    version: '1.0.0',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    acceptedAt: new Date(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_USER: AccountData = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  isActive: true,
  createdAt: new Date('2024-01-01'),
};

export const DEFAULT_CONSENT: ConsentRecord = {
  id: 'consent-1',
  userId: 'user-1',
  documentType: 'TERMS_OF_SERVICE' as ConsentDocumentType,
  version: '1.0.0',
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0',
  acceptedAt: new Date('2024-01-01'),
};
