import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  AuthenticationRepositoryPort,
  AuthUser,
  RefreshTokenData,
  SessionAuthUser,
} from '../../ports/outbound';

@Injectable()
export class PrismaAuthenticationRepository implements AuthenticationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      passwordHash: user.passwordHash,
      isActive: user.isActive ?? true,
    };
  }

  async findUserById(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      passwordHash: user.passwordHash,
      isActive: user.isActive ?? true,
    };
  }

  async findSessionUser(userId: string): Promise<SessionAuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        hasCompletedOnboarding: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      username: user.username,
      hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
      emailVerified: !!user.emailVerified,
    };
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async findRefreshToken(token: string): Promise<RefreshTokenData | null> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      return null;
    }

    return {
      id: tokenRecord.id,
      userId: tokenRecord.userId,
      token: tokenRecord.token,
      expiresAt: tokenRecord.expiresAt,
    };
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
