import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  EmailVerificationRepositoryPort,
  UserVerificationStatus,
  VerificationTokenData,
} from '../../../domain/ports';

@Injectable()
export class PrismaEmailVerificationRepository implements EmailVerificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string): Promise<UserVerificationStatus | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      emailVerified: user.emailVerified !== null,
    };
  }

  async findUserByEmail(email: string): Promise<UserVerificationStatus | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      emailVerified: user.emailVerified !== null,
    };
  }

  async createVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
    email: string,
  ): Promise<void> {
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt,
        email,
      },
    });
  }

  async findVerificationToken(token: string): Promise<VerificationTokenData | null> {
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      return null;
    }

    return {
      userId: tokenRecord.userId,
      token: tokenRecord.token,
      expiresAt: tokenRecord.expiresAt,
    };
  }

  async deleteVerificationToken(token: string): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({
      where: { token },
    });
  }

  async deleteUserVerificationTokens(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }

  async hasRecentToken(userId: string, withinMinutes: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);

    const token = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        createdAt: { gte: cutoff },
      },
    });

    return token !== null;
  }
}
