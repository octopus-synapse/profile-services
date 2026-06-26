import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { hashToken } from '@/shared-kernel/crypto';
import { isForeignKeyConstraintError } from '@/shared-kernel/http/prisma-error.mapper';
import { InvalidCredentialsException } from '../../domain/exceptions';
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

  /**
   * Stores the SHA-256 fingerprint of `plaintext` (column name kept as
   * `token` for backward compat; semantics changed in P0-#5 fix). Plaintext
   * stays exclusively in the user's cookie / response body.
   */
  async createRefreshToken(
    userId: string,
    plaintext: string,
    expiresAt: Date,
    authMethod?: string,
  ): Promise<void> {
    try {
      await this.prisma.refreshToken.create({
        data: { userId, token: hashToken(plaintext), expiresAt, authMethod },
      });
    } catch (err) {
      // A foreign-key violation here means the user row vanished between
      // the (possibly cached) credential check and this write — e.g. the
      // account was deleted mid-login. The only correct client-facing
      // outcome is "those credentials are no longer valid" (401), not a
      // raw 400 INVALID_FOREIGN_KEY leaking the persistence detail.
      if (isForeignKeyConstraintError(err)) {
        throw new InvalidCredentialsException();
      }
      throw err;
    }
  }

  async findRefreshToken(plaintext: string): Promise<RefreshTokenData | null> {
    const tokenHash = hashToken(plaintext);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    if (!tokenRecord) {
      return null;
    }

    return {
      id: tokenRecord.id,
      userId: tokenRecord.userId,
      // Expose the plaintext the caller passed in — `RefreshTokenData.token`
      // is consumed by handlers that re-issue the cookie. The hash never
      // leaves the DB.
      token: plaintext,
      expiresAt: tokenRecord.expiresAt,
      authMethod: tokenRecord.authMethod,
    };
  }

  async deleteRefreshToken(plaintext: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: hashToken(plaintext) },
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
