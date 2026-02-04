/**
 * Two-Factor Authentication Service
 *
 * Handles TOTP-based two-factor authentication setup, verification, and management.
 * Uses speakeasy for TOTP and qrcode for QR code generation.
 *
 * Uncle Bob: "Security code must be explicit about its invariants"
 * Kent Beck: "Make the happy path obvious, make errors explicit"
 */

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';

interface SetupResult {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

interface VerifyResult {
  success: boolean;
  backupCodes?: string[];
}

interface TwoFactorStatus {
  enabled: boolean;
  lastUsedAt: Date | null;
  backupCodesRemaining: number;
}

const BACKUP_CODE_COUNT = 10;
const TOTP_WINDOW = 2; // Allow 2 time steps before/after
const APP_NAME = 'ProFile';

@Injectable()
export class TwoFactorAuthService {
  private readonly context = 'TwoFactorAuthService';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Sets up 2FA for a user by generating a TOTP secret and QR code.
   * Does not enable 2FA - user must verify with a valid token first.
   */
  async setup(userId: string): Promise<SetupResult> {
    // Check if 2FA is already enabled
    const existing = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existing?.enabled) {
      throw new ConflictException('2FA is already enabled');
    }

    // Get user email for QR code label
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${user?.email ?? userId})`,
      issuer: APP_NAME,
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url ?? '');

    // Save or update the 2FA record (not enabled yet)
    if (existing) {
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: { secret: secret.base32 },
      });
    } else {
      await this.prisma.twoFactorAuth.create({
        data: {
          userId,
          secret: secret.base32,
          enabled: false,
        },
      });
    }

    this.logger.log('2FA setup initiated', this.context, { userId });

    return {
      secret: secret.base32,
      qrCode,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Verifies a TOTP token and enables 2FA if valid.
   * Generates backup codes upon successful verification.
   */
  async verifyAndEnable(userId: string, token: string): Promise<VerifyResult> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new NotFoundException('2FA setup not found');
    }

    const isValid = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      encoding: 'base32',
      token,
      window: TOTP_WINDOW,
    });

    if (!isValid) {
      this.logger.warn('Invalid 2FA token during setup', this.context, {
        userId,
      });
      return { success: false };
    }

    // Enable 2FA
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: true },
    });

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(userId);

    this.logger.log('2FA enabled successfully', this.context, { userId });

    return {
      success: true,
      backupCodes,
    };
  }

  /**
   * Validates a TOTP token for login.
   */
  async validateToken(userId: string, token: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth?.enabled) {
      return false;
    }

    const isValid = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      encoding: 'base32',
      token,
      window: TOTP_WINDOW,
    });

    if (isValid) {
      // Update last used timestamp
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });
    }

    return isValid;
  }

  /**
   * Disables 2FA for a user.
   * Removes the secret and all backup codes.
   */
  async disable(userId: string): Promise<void> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new NotFoundException('2FA is not enabled');
    }

    // Delete backup codes first
    await this.prisma.twoFactorBackupCode.deleteMany({
      where: { userId },
    });

    // Delete 2FA record
    await this.prisma.twoFactorAuth.delete({
      where: { userId },
    });

    this.logger.log('2FA disabled', this.context, { userId });
  }

  /**
   * Checks if 2FA is enabled for a user.
   */
  async isEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { enabled: true },
    });

    return twoFactorAuth?.enabled ?? false;
  }

  /**
   * Generates new backup codes for a user.
   * Deletes existing codes before generating new ones.
   * Returns plain text codes (only shown once).
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    // Delete existing backup codes
    await this.prisma.twoFactorBackupCode.deleteMany({
      where: { userId },
    });

    const codes: string[] = [];
    const hashPromises: Promise<{ codeHash: string }>[] = [];

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = this.generateBackupCodeString();
      codes.push(code);
      hashPromises.push(this.hashBackupCode(code));
    }

    const hashedCodes = await Promise.all(hashPromises);

    // Store hashed codes
    await this.prisma.twoFactorBackupCode.createMany({
      data: hashedCodes.map((hash) => ({
        userId,
        codeHash: hash.codeHash,
        used: false,
      })),
    });

    this.logger.log('Backup codes generated', this.context, {
      userId,
      count: BACKUP_CODE_COUNT,
    });

    return codes;
  }

  /**
   * Validates a backup code for login.
   * Marks the code as used if valid.
   */
  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    const backupCodes = await this.prisma.twoFactorBackupCode.findMany({
      where: { userId, used: false },
    });

    if (backupCodes.length === 0) {
      return false;
    }

    for (const backupCode of backupCodes) {
      const isValid = await bcrypt.compare(code, backupCode.codeHash);

      if (isValid) {
        // Mark as used
        await this.prisma.twoFactorBackupCode.update({
          where: { id: backupCode.id },
          data: { used: true, usedAt: new Date() },
        });

        this.logger.log('Backup code used', this.context, { userId });

        return true;
      }
    }

    return false;
  }

  /**
   * Gets the 2FA status for a user.
   */
  async getStatus(userId: string): Promise<TwoFactorStatus> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { enabled: true, lastUsedAt: true },
    });

    if (!twoFactorAuth) {
      return {
        enabled: false,
        lastUsedAt: null,
        backupCodesRemaining: 0,
      };
    }

    const backupCodes = await this.prisma.twoFactorBackupCode.findMany({
      where: { userId, used: false },
      select: { id: true },
    });

    return {
      enabled: twoFactorAuth.enabled,
      lastUsedAt: twoFactorAuth.lastUsedAt,
      backupCodesRemaining: backupCodes.length,
    };
  }

  /**
   * Generates a random backup code string in format XXXX-XXXX.
   */
  private generateBackupCodeString(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  /**
   * Hashes a backup code using bcrypt.
   */
  private async hashBackupCode(code: string): Promise<{ codeHash: string }> {
    const codeHash = await bcrypt.hash(code, 10);
    return { codeHash };
  }
}
