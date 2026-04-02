/**
 * Two-Factor Repository Implementation
 *
 * Prisma-based implementation of the TwoFactorRepositoryPort.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  BackupCodeRecord,
  TwoFactorRecord,
  TwoFactorRepositoryPort,
} from '../../../domain/ports/two-factor.repository.port';

@Injectable()
export class TwoFactorRepository implements TwoFactorRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<TwoFactorRecord | null> {
    const record = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!record) return null;

    return {
      userId: record.userId,
      secret: record.secret,
      enabled: record.enabled,
      lastUsedAt: record.lastUsedAt,
    };
  }

  async create(userId: string, secret: string): Promise<TwoFactorRecord> {
    const record = await this.prisma.twoFactorAuth.create({
      data: {
        userId,
        secret,
        enabled: false,
      },
    });

    return {
      userId: record.userId,
      secret: record.secret,
      enabled: record.enabled,
      lastUsedAt: record.lastUsedAt,
    };
  }

  async updateSecret(userId: string, secret: string): Promise<TwoFactorRecord> {
    const record = await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { secret },
    });

    return {
      userId: record.userId,
      secret: record.secret,
      enabled: record.enabled,
      lastUsedAt: record.lastUsedAt,
    };
  }

  async enable(userId: string): Promise<TwoFactorRecord> {
    const record = await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: true },
    });

    return {
      userId: record.userId,
      secret: record.secret,
      enabled: record.enabled,
      lastUsedAt: record.lastUsedAt,
    };
  }

  async updateLastUsed(userId: string): Promise<void> {
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.twoFactorAuth.delete({
      where: { userId },
    });
  }

  async findUnusedBackupCodes(userId: string): Promise<BackupCodeRecord[]> {
    const records = await this.prisma.twoFactorBackupCode.findMany({
      where: { userId, used: false },
    });

    return records.map((r) => ({
      id: r.id,
      userId: r.userId,
      codeHash: r.codeHash,
      used: r.used,
      usedAt: r.usedAt,
    }));
  }

  async createBackupCodes(userId: string, codeHashes: string[]): Promise<void> {
    await this.prisma.twoFactorBackupCode.createMany({
      data: codeHashes.map((codeHash) => ({
        userId,
        codeHash,
        used: false,
      })),
    });
  }

  async markBackupCodeUsed(codeId: string): Promise<void> {
    await this.prisma.twoFactorBackupCode.update({
      where: { id: codeId },
      data: { used: true, usedAt: new Date() },
    });
  }

  /**
   * Atomically try to consume a backup code.
   * Uses updateMany with a WHERE clause to ensure atomicity.
   * Returns true if exactly one record was updated (code was unused).
   * Returns false if no records were updated (code already used - race condition).
   */
  async tryConsumeBackupCode(codeId: string): Promise<boolean> {
    const result = await this.prisma.twoFactorBackupCode.updateMany({
      where: {
        id: codeId,
        used: false, // Only update if still unused
      },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    // If count is 1, we successfully consumed the code
    // If count is 0, the code was already used (race condition prevented)
    return result.count === 1;
  }

  async deleteBackupCodes(userId: string): Promise<void> {
    await this.prisma.twoFactorBackupCode.deleteMany({
      where: { userId },
    });
  }

  async countUnusedBackupCodes(userId: string): Promise<number> {
    return this.prisma.twoFactorBackupCode.count({
      where: { userId, used: false },
    });
  }

  async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return user?.email ?? null;
  }
}
