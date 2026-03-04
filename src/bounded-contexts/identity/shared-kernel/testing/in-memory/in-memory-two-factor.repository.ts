/**
 * In-Memory Two-Factor Repository
 *
 * Fake implementation for testing 2FA operations.
 */

import type {
  BackupCodeRecord,
  TwoFactorRecord,
  TwoFactorRepositoryPort,
} from '../../../two-factor-auth/ports/outbound/two-factor-repository.port';

export class InMemoryTwoFactorRepository implements TwoFactorRepositoryPort {
  private records: Map<string, TwoFactorRecord> = new Map();
  private backupCodes: Map<string, BackupCodeRecord[]> = new Map();
  private userEmails: Map<string, string> = new Map();
  private backupCodeIdCounter = 0;

  async findByUserId(userId: string): Promise<TwoFactorRecord | null> {
    return this.records.get(userId) ?? null;
  }

  async create(userId: string, secret: string): Promise<TwoFactorRecord> {
    const record: TwoFactorRecord = {
      userId,
      secret,
      enabled: false,
      lastUsedAt: null,
    };
    this.records.set(userId, record);
    return record;
  }

  async updateSecret(userId: string, secret: string): Promise<TwoFactorRecord> {
    const record = this.records.get(userId);
    if (!record) {
      return this.create(userId, secret);
    }
    record.secret = secret;
    return record;
  }

  async enable(userId: string): Promise<TwoFactorRecord> {
    const record = this.records.get(userId);
    if (!record) {
      throw new Error(`2FA record not found for user ${userId}`);
    }
    record.enabled = true;
    return record;
  }

  async updateLastUsed(userId: string): Promise<void> {
    const record = this.records.get(userId);
    if (record) {
      record.lastUsedAt = new Date();
    }
  }

  async delete(userId: string): Promise<void> {
    this.records.delete(userId);
    this.backupCodes.delete(userId);
  }

  async findUnusedBackupCodes(userId: string): Promise<BackupCodeRecord[]> {
    const codes = this.backupCodes.get(userId) ?? [];
    return codes.filter((c) => !c.used);
  }

  async createBackupCodes(userId: string, codeHashes: string[]): Promise<void> {
    const codes: BackupCodeRecord[] = codeHashes.map((hash) => ({
      id: `backup-${++this.backupCodeIdCounter}`,
      userId,
      codeHash: hash,
      used: false,
      usedAt: null,
    }));
    this.backupCodes.set(userId, codes);
  }

  async markBackupCodeUsed(codeId: string): Promise<void> {
    for (const codes of this.backupCodes.values()) {
      const code = codes.find((c) => c.id === codeId);
      if (code) {
        code.used = true;
        code.usedAt = new Date();
        return;
      }
    }
  }

  async deleteBackupCodes(userId: string): Promise<void> {
    this.backupCodes.delete(userId);
  }

  async countUnusedBackupCodes(userId: string): Promise<number> {
    const codes = this.backupCodes.get(userId) ?? [];
    return codes.filter((c) => !c.used).length;
  }

  async getUserEmail(userId: string): Promise<string | null> {
    return this.userEmails.get(userId) ?? null;
  }

  // Test helpers
  seedRecord(record: TwoFactorRecord): void {
    this.records.set(record.userId, record);
  }

  seedEmail(userId: string, email: string): void {
    this.userEmails.set(userId, email);
  }

  seedBackupCodes(userId: string, codes: BackupCodeRecord[]): void {
    this.backupCodes.set(userId, codes);
  }

  getRecord(userId: string): TwoFactorRecord | undefined {
    return this.records.get(userId);
  }

  getAllRecords(): TwoFactorRecord[] {
    return [...this.records.values()];
  }

  getAllBackupCodes(userId: string): BackupCodeRecord[] {
    return this.backupCodes.get(userId) ?? [];
  }

  clear(): void {
    this.records.clear();
    this.backupCodes.clear();
    this.userEmails.clear();
    this.backupCodeIdCounter = 0;
  }
}
