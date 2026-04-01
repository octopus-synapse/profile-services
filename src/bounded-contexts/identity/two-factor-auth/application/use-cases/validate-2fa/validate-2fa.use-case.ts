/**
 * Validate 2FA Use Case
 *
 * Validates a TOTP token or backup code for login.
 * This is an internal use case (no controller) - used by authentication BC.
 *
 * Security: Implements replay attack prevention by tracking used tokens in cache.
 */

import * as crypto from 'node:crypto';
import type { HashServicePort } from '../../../domain/ports/hash-service.port';
import type { TotpServicePort } from '../../../domain/ports/totp-service.port';
import type { TwoFactorRepositoryPort } from '../../../domain/ports/two-factor.repository.port';
import type {
  Validate2faInboundPort,
  Validate2faResult,
} from '../../ports/validate-2fa.inbound-port';

// TTL for used tokens: 90 seconds (covers 1 window of 30s before + current + 1 after)
const USED_TOKEN_TTL_SECONDS = 90;

interface CacheService {
  isEnabled?: boolean;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
}

export class Validate2faUseCase implements Validate2faInboundPort {
  constructor(
    private readonly repository: TwoFactorRepositoryPort,
    private readonly totpService: TotpServicePort,
    private readonly hashService: HashServicePort,
    private readonly cacheService?: CacheService,
  ) {}

  /**
   * Validates TOTP token for a user.
   * Implements replay attack prevention by tracking used tokens.
   */
  async validateToken(userId: string, token: string): Promise<boolean> {
    const twoFactorAuth = await this.repository.findByUserId(userId);

    if (!twoFactorAuth?.enabled) {
      return false;
    }

    // Replay attack prevention: check if token was already used
    if (await this.isTokenUsed(userId, token)) {
      return false;
    }

    const isValid = this.totpService.verifyToken(twoFactorAuth.secret, token);

    if (isValid) {
      // Mark token as used to prevent replay attacks
      await this.markTokenAsUsed(userId, token);
      await this.repository.updateLastUsed(userId);
    }

    return isValid;
  }

  /**
   * Checks if a TOTP token has already been used (replay attack prevention).
   */
  private async isTokenUsed(userId: string, token: string): Promise<boolean> {
    if (!this.cacheService?.isEnabled) {
      return false; // Skip check if cache unavailable (graceful degradation)
    }

    const cacheKey = this.getUsedTokenCacheKey(userId, token);
    const used = await this.cacheService.get<string>(cacheKey);
    return used !== null;
  }

  /**
   * Marks a TOTP token as used to prevent replay attacks.
   */
  private async markTokenAsUsed(userId: string, token: string): Promise<void> {
    if (!this.cacheService?.isEnabled) {
      return; // Skip if cache unavailable
    }

    const cacheKey = this.getUsedTokenCacheKey(userId, token);
    await this.cacheService.set(cacheKey, '1', USED_TOKEN_TTL_SECONDS);
  }

  /**
   * Generates cache key for used token tracking.
   * Uses SHA-256 hash of token for security (don't store raw tokens).
   */
  private getUsedTokenCacheKey(userId: string, token: string): string {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
    return `used_totp:${userId}:${tokenHash}`;
  }

  /**
   * Validates backup code for a user.
   * Marks the code as used if valid.
   */
  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    const backupCodes = await this.repository.findUnusedBackupCodes(userId);

    if (backupCodes.length === 0) {
      return false;
    }

    for (const backupCode of backupCodes) {
      const isValid = await this.hashService.compare(code, backupCode.codeHash);

      if (isValid) {
        await this.repository.markBackupCodeUsed(backupCode.id);
        return true;
      }
    }

    return false;
  }

  /**
   * Validates either TOTP token or backup code.
   */
  async validate(userId: string, code: string): Promise<Validate2faResult> {
    // Try TOTP first (more common)
    if (await this.validateToken(userId, code)) {
      return { valid: true, method: 'totp' };
    }

    // Try backup code
    if (await this.validateBackupCode(userId, code)) {
      return { valid: true, method: 'backup_code' };
    }

    return { valid: false, method: null };
  }

  /**
   * Checks if 2FA is enabled for a user.
   */
  async isEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.repository.findByUserId(userId);
    return twoFactorAuth?.enabled ?? false;
  }
}
