import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { InvalidResetTokenException } from '../../domain/exceptions';
import type { PasswordResetTokenPort } from '../../ports/outbound';

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
      // Delete expired token
      await this.prisma.passwordResetToken.delete({
        where: { token },
      });
      throw new InvalidResetTokenException();
    }

    return resetToken.userId;
  }

  async invalidateToken(token: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: { token },
    });
  }
}
