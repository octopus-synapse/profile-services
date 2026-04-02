/**
 * Two-Factor Auth Testing Module
 *
 * In-memory implementations for testing 2FA features:
 * - TwoFactorAuth records
 * - Backup codes
 * - TOTP validation
 * - Hash service
 */

import type { HashServicePort } from '../domain/ports/hash-service.port';
import type { QrCodeServicePort } from '../domain/ports/qrcode-service.port';
import type { TotpSecret, TotpServicePort } from '../domain/ports/totp-service.port';
import type {
  BackupCodeRecord,
  TwoFactorRecord,
  TwoFactorRepositoryPort,
} from '../domain/ports/two-factor.repository.port';

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY TWO-FACTOR REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryTwoFactorRepository implements TwoFactorRepositoryPort {
  private twoFactorRecords = new Map<string, TwoFactorRecord>();
  private backupCodes: BackupCodeRecord[] = [];
  private users = new Map<string, { email: string }>();

  // ───────────────────────────────────────────────────────────────
  // TwoFactorRepositoryPort Implementation
  // ───────────────────────────────────────────────────────────────

  async findByUserId(userId: string): Promise<TwoFactorRecord | null> {
    return this.twoFactorRecords.get(userId) ?? null;
  }

  async create(userId: string, secret: string): Promise<TwoFactorRecord> {
    const record: TwoFactorRecord = {
      userId,
      secret,
      enabled: false,
      lastUsedAt: null,
    };
    this.twoFactorRecords.set(userId, record);
    return record;
  }

  async updateSecret(userId: string, secret: string): Promise<TwoFactorRecord> {
    const existing = this.twoFactorRecords.get(userId);
    if (!existing) {
      throw new Error(`TwoFactorRecord not found for userId: ${userId}`);
    }
    const updated: TwoFactorRecord = { ...existing, secret };
    this.twoFactorRecords.set(userId, updated);
    return updated;
  }

  async enable(userId: string): Promise<TwoFactorRecord> {
    const existing = this.twoFactorRecords.get(userId);
    if (!existing) {
      throw new Error(`TwoFactorRecord not found for userId: ${userId}`);
    }
    const updated: TwoFactorRecord = { ...existing, enabled: true };
    this.twoFactorRecords.set(userId, updated);
    return updated;
  }

  async updateLastUsed(userId: string): Promise<void> {
    const existing = this.twoFactorRecords.get(userId);
    if (existing) {
      this.twoFactorRecords.set(userId, { ...existing, lastUsedAt: new Date() });
    }
  }

  async delete(userId: string): Promise<void> {
    this.twoFactorRecords.delete(userId);
  }

  async findUnusedBackupCodes(userId: string): Promise<BackupCodeRecord[]> {
    return this.backupCodes.filter((code) => code.userId === userId && !code.used);
  }

  async createBackupCodes(userId: string, codeHashes: string[]): Promise<void> {
    for (const codeHash of codeHashes) {
      this.backupCodes.push({
        id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId,
        codeHash,
        used: false,
        usedAt: null,
      });
    }
  }

  async markBackupCodeUsed(codeId: string): Promise<void> {
    const code = this.backupCodes.find((c) => c.id === codeId);
    if (code) {
      code.used = true;
      code.usedAt = new Date();
    }
  }

  async tryConsumeBackupCode(codeId: string): Promise<boolean> {
    const code = this.backupCodes.find((c) => c.id === codeId);
    if (code && !code.used) {
      code.used = true;
      code.usedAt = new Date();
      return true;
    }
    return false;
  }

  async deleteBackupCodes(userId: string): Promise<void> {
    this.backupCodes = this.backupCodes.filter((c) => c.userId !== userId);
  }

  async countUnusedBackupCodes(userId: string): Promise<number> {
    return this.backupCodes.filter((c) => c.userId === userId && !c.used).length;
  }

  async getUserEmail(userId: string): Promise<string | null> {
    return this.users.get(userId)?.email ?? null;
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  seedUser(userId: string, email: string): void {
    this.users.set(userId, { email });
  }

  seedTwoFactor(record: TwoFactorRecord): void {
    this.twoFactorRecords.set(record.userId, record);
  }

  seedBackupCode(code: BackupCodeRecord): void {
    this.backupCodes.push(code);
  }

  clear(): void {
    this.twoFactorRecords.clear();
    this.backupCodes = [];
    this.users.clear();
  }

  getAllTwoFactorRecords(): TwoFactorRecord[] {
    return Array.from(this.twoFactorRecords.values());
  }

  getAllBackupCodes(): BackupCodeRecord[] {
    return [...this.backupCodes];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY HASH SERVICE
// ═══════════════════════════════════════════════════════════════

export class InMemoryHashService implements HashServicePort {
  private hashMap = new Map<string, string>();

  async hash(value: string): Promise<string> {
    const hash = `hashed:${value}`;
    this.hashMap.set(hash, value);
    return hash;
  }

  async compare(value: string, hash: string): Promise<boolean> {
    // For in-memory testing, we store the original value
    const original = this.hashMap.get(hash);
    if (original) {
      return original === value;
    }
    // Fallback: check if hash matches our format
    return hash === `hashed:${value}`;
  }

  // Test helper
  clear(): void {
    this.hashMap.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY TOTP SERVICE
// ═══════════════════════════════════════════════════════════════

export class InMemoryTotpService implements TotpServicePort {
  private validTokens = new Map<string, Set<string>>();
  private secretCounter = 0;

  generateSecret(label: string, issuer: string): TotpSecret {
    this.secretCounter++;
    const base32 = `SECRET${this.secretCounter}BASE32`;
    return {
      base32,
      otpauthUrl: `otpauth://totp/${issuer}:${label}?secret=${base32}&issuer=${issuer}`,
    };
  }

  verifyToken(secret: string, token: string, _window?: number): boolean {
    const validForSecret = this.validTokens.get(secret);
    if (validForSecret?.has(token)) {
      return true;
    }
    // Default: tokens "123456" and "000000" are always valid for testing
    return token === '123456' || token === '000000';
  }

  // Test helpers
  setValidToken(secret: string, token: string): void {
    const existing = this.validTokens.get(secret) ?? new Set();
    existing.add(token);
    this.validTokens.set(secret, existing);
  }

  setInvalidAllTokens(secret: string): void {
    this.validTokens.set(secret, new Set());
  }

  clear(): void {
    this.validTokens.clear();
    this.secretCounter = 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY QR CODE SERVICE
// ═══════════════════════════════════════════════════════════════

export class InMemoryQrCodeService implements QrCodeServicePort {
  async generateDataUrl(data: string): Promise<string> {
    return `data:image/png;base64,FAKE_QR_CODE_FOR_${Buffer.from(data).toString('base64').slice(0, 20)}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY CACHE SERVICE (for replay attack prevention)
// ═══════════════════════════════════════════════════════════════

export class InMemoryCacheService {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  readonly isEnabled = true;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds ?? 3600) * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  // Test helpers
  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createTwoFactorRecord(overrides: Partial<TwoFactorRecord> = {}): TwoFactorRecord {
  return {
    userId: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    secret: 'TESTSECRETBASE32',
    enabled: false,
    lastUsedAt: null,
    ...overrides,
  };
}

export function createBackupCodeRecord(
  overrides: Partial<BackupCodeRecord> = {},
): BackupCodeRecord {
  return {
    id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: 'user-1',
    codeHash: 'hashed:ABCD-1234',
    used: false,
    usedAt: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_USER = {
  id: 'user-1',
  email: 'test@example.com',
};

export const DEFAULT_TWO_FACTOR_RECORD: TwoFactorRecord = {
  userId: 'user-1',
  secret: 'TESTSECRETBASE32',
  enabled: false,
  lastUsedAt: null,
};

export const DEFAULT_ENABLED_TWO_FACTOR_RECORD: TwoFactorRecord = {
  userId: 'user-1',
  secret: 'TESTSECRETBASE32',
  enabled: true,
  lastUsedAt: new Date('2024-01-01'),
};

export const DEFAULT_BACKUP_CODES: BackupCodeRecord[] = [
  createBackupCodeRecord({ id: 'backup-1', userId: 'user-1', codeHash: 'hashed:ABCD-1234' }),
  createBackupCodeRecord({ id: 'backup-2', userId: 'user-1', codeHash: 'hashed:EFGH-5678' }),
  createBackupCodeRecord({ id: 'backup-3', userId: 'user-1', codeHash: 'hashed:IJKL-9012' }),
];
