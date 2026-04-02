import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { InvalidResetTokenException } from '../../../domain/exceptions';
import type { PasswordResetTokenPort } from '../../../domain/ports';

const TOKEN_EXPIRATION_HOURS = 24;

@Injectable()
export class PrismaPasswordResetTokenService implements PasswordResetTokenPort {
  constructor(private readonly prisma: PrismaService) {}

  async createToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS);

    // Delete any existing tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId },
    });

    // Create new token
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async validateToken(token: string): Promise<string> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new InvalidResetTokenException();
    }

    if (new Date() > resetToken.expiresAt) {
      // Delete expired token (use deleteMany to avoid "not found" errors)
      await this.prisma.passwordResetToken.deleteMany({
        where: { token },
      });
      throw new InvalidResetTokenException();
    }

    return resetToken.userId;
  }

  /**
   * Atomically validates and consumes a token using Prisma transaction.
   * This prevents race conditions where the same token could be used twice.
   */
  async validateAndConsumeToken(token: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      // Find the token first
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { token },
      });

      if (!resetToken) {
        throw new InvalidResetTokenException();
      }

      if (new Date() > resetToken.expiresAt) {
        // Delete expired token (use deleteMany to avoid "not found" errors)
        await tx.passwordResetToken.deleteMany({
          where: { token },
        });
        throw new InvalidResetTokenException();
      }

      // Atomically consume the token - use deleteMany and check count
      // This prevents race conditions where another process already consumed it
      const result = await tx.passwordResetToken.deleteMany({
        where: { token },
      });

      // If count is 0, the token was already consumed by another request
      if (result.count === 0) {
        throw new InvalidResetTokenException();
      }

      return resetToken.userId;
    });
  }

  async invalidateToken(token: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: { token },
    });
  }
}
