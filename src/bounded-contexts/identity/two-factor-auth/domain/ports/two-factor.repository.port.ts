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

export abstract class TwoFactorRepositoryPort {
  /**
   * Find 2FA record by user ID
   */
  abstract findByUserId(userId: string): Promise<TwoFactorRecord | null>;

  /**
   * Create a new 2FA record (not enabled yet)
   */
  abstract create(userId: string, secret: string): Promise<TwoFactorRecord>;

  /**
   * Update 2FA secret (during setup)
   */
  abstract updateSecret(userId: string, secret: string): Promise<TwoFactorRecord>;

  /**
   * Enable 2FA for user
   */
  abstract enable(userId: string): Promise<TwoFactorRecord>;

  /**
   * Update last used timestamp
   */
  abstract updateLastUsed(userId: string): Promise<void>;

  /**
   * Delete 2FA record
   */
  abstract delete(userId: string): Promise<void>;

  /**
   * Find unused backup codes for user
   */
  abstract findUnusedBackupCodes(userId: string): Promise<BackupCodeRecord[]>;

  /**
   * Create backup codes for user
   */
  abstract createBackupCodes(userId: string, codeHashes: string[]): Promise<void>;

  /**
   * Mark backup code as used
   */
  abstract markBackupCodeUsed(codeId: string): Promise<void>;

  /**
   * Atomically try to consume a backup code (mark as used).
   * Returns true if the code was successfully consumed (was unused).
   * Returns false if the code was already used (race condition prevented).
   */
  abstract tryConsumeBackupCode(codeId: string): Promise<boolean>;

  /**
   * Delete all backup codes for user
   */
  abstract deleteBackupCodes(userId: string): Promise<void>;

  /**
   * Count unused backup codes
   */
  abstract countUnusedBackupCodes(userId: string): Promise<number>;

  /**
   * Get user email for QR code label
   */
  abstract getUserEmail(userId: string): Promise<string | null>;
}
