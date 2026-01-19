/**
 * Two Factor Auth Repository
 * Single Responsibility: 2FA and backup codes persistence
 *
 * Note: TwoFactorAuth and TwoFactorBackupCode are both related to User,
 * not to each other. BackupCodes use userId, not twoFactorAuthId.
 */

import { Injectable } from '@nestjs/common';
import { TwoFactorAuth, TwoFactorBackupCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwoFactorAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find 2FA config by user ID
   */
  async findByUserId(userId: string): Promise<TwoFactorAuth | null> {
    return this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });
  }

  /**
   * Create initial 2FA setup (not enabled)
   */
  async create(userId: string, secret: string): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.create({
      data: {
        userId,
        secret,
        enabled: false,
      },
    });
  }

  /**
   * Update 2FA secret
   */
  async updateSecret(userId: string, secret: string): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { secret },
    });
  }

  /**
   * Enable 2FA after verification
   */
  async enable(userId: string): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: true },
    });
  }

  /**
   * Disable 2FA
   */
  async disable(userId: string): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: false },
    });
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(userId: string): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Delete 2FA config
   */
  async delete(userId: string): Promise<void> {
    await this.prisma.twoFactorAuth.delete({
      where: { userId },
    });
  }

  // ============ Backup Codes ============

  /**
   * Get all backup codes for user
   */
  async getBackupCodes(userId: string): Promise<TwoFactorBackupCode[]> {
    return this.prisma.twoFactorBackupCode.findMany({
      where: { userId },
    });
  }

  /**
   * Find unused backup codes (used = false)
   */
  async getUnusedBackupCodes(userId: string): Promise<TwoFactorBackupCode[]> {
    return this.prisma.twoFactorBackupCode.findMany({
      where: {
        userId,
        used: false,
      },
    });
  }

  /**
   * Create backup codes in batch
   */
  async createBackupCodes(
    userId: string,
    hashedCodes: string[],
  ): Promise<void> {
    await this.prisma.twoFactorBackupCode.createMany({
      data: hashedCodes.map((codeHash) => ({
        userId,
        codeHash,
      })),
    });
  }

  /**
   * Delete all backup codes for user
   */
  async deleteBackupCodes(userId: string): Promise<void> {
    await this.prisma.twoFactorBackupCode.deleteMany({
      where: { userId },
    });
  }

  /**
   * Mark backup code as used
   */
  async markBackupCodeUsed(codeId: string): Promise<void> {
    await this.prisma.twoFactorBackupCode.update({
      where: { id: codeId },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });
  }
}
