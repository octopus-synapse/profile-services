import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { AuthUser, RefreshTokenData, SessionAuthUser } from '../../domain/ports';
import { AuthenticationRepositoryPort } from '../../domain/ports';

// Cache TTLs in seconds
const SESSION_CACHE_TTL = 600; // 10 minutes
const USER_EMAIL_CACHE_TTL = 300; // 5 minutes

export class PrismaAuthenticationRepository implements AuthenticationRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const cacheKey = `auth:user:email:${email.toLowerCase()}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, passwordHash: true, isActive: true },
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
      },
      USER_EMAIL_CACHE_TTL,
    );
  }

  async findUserById(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true, isActive: true },
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
    const cacheKey = `auth:session:user:${userId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            onboardingCompletedAt: true,
            emailVerified: true,
            userRoles: { select: { role: { select: { name: true } } } },
          },
        });

        if (!user) {
          return null;
        }

        const roleNames = user.userRoles.map((ur) => ur.role.name);
        const isAdmin = roleNames.includes('admin');
        // Legacy callers expect role IDs in `role_*` form. Map between
        // the new model (`admin`, `user`) and the historical IDs.
        const legacyRoles = roleNames.flatMap((name): string[] => {
          if (name === 'admin') return ['role_admin', 'role_user'];
          if (name === 'user') return ['role_user'];
          return [];
        });

        return {
          id: user.id,
          email: user.email ?? '',
          name: user.name,
          username: user.username,
          hasCompletedOnboarding: user.onboardingCompletedAt !== null,
          emailVerified: !!user.emailVerified,
          role: isAdmin ? 'ADMIN' : 'USER',
          roles: legacyRoles,
        };
      },
      SESSION_CACHE_TTL,
    );
  }

  /**
   * Invalidate session cache when user profile changes
   */
  async invalidateSessionCache(userId: string): Promise<void> {
    await this.cacheService.delete(`auth:session:user:${userId}`);
  }

  /**
   * Invalidate email cache when email changes
   */
  async invalidateEmailCache(email: string): Promise<void> {
    await this.cacheService.delete(`auth:user:email:${email.toLowerCase()}`);
  }

  async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    authMethod?: string,
  ): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt, authMethod },
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
      authMethod: tokenRecord.authMethod,
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
