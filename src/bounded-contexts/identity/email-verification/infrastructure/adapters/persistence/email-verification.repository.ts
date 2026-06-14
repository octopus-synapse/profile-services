import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  CreatePurposeTokenInput,
  EmailVerificationRepositoryPort,
  PurposeTokenData,
  UserVerificationStatus,
  VerificationPurposeValue,
  VerificationTokenData,
} from '../../../domain/ports';

export class PrismaEmailVerificationRepository implements EmailVerificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string): Promise<UserVerificationStatus | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      return null;
    }

    return { id: user.id, email: user.email ?? '', emailVerified: user.emailVerified !== null };
  }

  async findUserByEmail(email: string): Promise<UserVerificationStatus | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      return null;
    }

    return { id: user.id, email: user.email ?? '', emailVerified: user.emailVerified !== null };
  }

  async createVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
    email: string,
  ): Promise<void> {
    await this.prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt, email },
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

  async getLastTokenCreatedAt(userId: string): Promise<Date | null> {
    const token = await this.prisma.emailVerificationToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return token?.createdAt ?? null;
  }

  async createPurposeToken(input: CreatePurposeTokenInput): Promise<void> {
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: input.userId,
        token: input.token,
        email: input.email,
        expiresAt: input.expiresAt,
        purpose: input.purpose,
        pendingEmail: input.pendingEmail ?? null,
        pendingPasswordHash: input.pendingPasswordHash ?? null,
      },
    });
  }

  async findPurposeToken(
    userId: string,
    token: string,
    purpose: VerificationPurposeValue,
  ): Promise<PurposeTokenData | null> {
    const row = await this.prisma.emailVerificationToken.findFirst({
      where: { userId, token, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!row) return null;
    return {
      userId: row.userId,
      token: row.token,
      email: row.email,
      purpose: row.purpose as VerificationPurposeValue,
      pendingEmail: row.pendingEmail,
      pendingPasswordHash: row.pendingPasswordHash,
      expiresAt: row.expiresAt,
    };
  }

  async deleteUserPurposeTokens(
    userId: string,
    purpose: VerificationPurposeValue,
  ): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId, purpose } });
  }

  async getLastTokenCreatedAtForPurpose(
    userId: string,
    purpose: VerificationPurposeValue,
  ): Promise<Date | null> {
    const token = await this.prisma.emailVerificationToken.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return token?.createdAt ?? null;
  }
}
