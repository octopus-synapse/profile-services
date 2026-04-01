/**
 * Two-Factor Repository Port (Outbound)
 *
 * Defines the contract for persisting two-factor authentication data.
 * Implementation is provided by the infrastructure layer.
 */

export interface TwoFactorRecord {
  userId: string;
  secret: string;
  enabled: boolean;
  lastUsedAt: Date | null;
}

export interface BackupCodeRecord {
  id: string;
  userId: string;
  codeHash: string;
  used: boolean;
  usedAt: Date | null;
}

export interface TwoFactorRepositoryPort {
  /**
   * Find 2FA record by user ID
   */
  findByUserId(userId: string): Promise<TwoFactorRecord | null>;

  /**
   * Create a new 2FA record (not enabled yet)
   */
  create(userId: string, secret: string): Promise<TwoFactorRecord>;

  /**
   * Update 2FA secret (during setup)
   */
  updateSecret(userId: string, secret: string): Promise<TwoFactorRecord>;

  /**
   * Enable 2FA for user
   */
  enable(userId: string): Promise<TwoFactorRecord>;

  /**
   * Update last used timestamp
   */
  updateLastUsed(userId: string): Promise<void>;

  /**
   * Delete 2FA record
   */
  delete(userId: string): Promise<void>;

  /**
   * Find unused backup codes for user
   */
  findUnusedBackupCodes(userId: string): Promise<BackupCodeRecord[]>;

  /**
   * Create backup codes for user
   */
  createBackupCodes(userId: string, codeHashes: string[]): Promise<void>;

  /**
   * Mark backup code as used
   */
  markBackupCodeUsed(codeId: string): Promise<void>;

  /**
   * Delete all backup codes for user
   */
  deleteBackupCodes(userId: string): Promise<void>;

  /**
   * Count unused backup codes
   */
  countUnusedBackupCodes(userId: string): Promise<number>;

  /**
   * Get user email for QR code label
   */
  getUserEmail(userId: string): Promise<string | null>;
}

export const TWO_FACTOR_REPOSITORY_PORT = Symbol('TwoFactorRepositoryPort');
