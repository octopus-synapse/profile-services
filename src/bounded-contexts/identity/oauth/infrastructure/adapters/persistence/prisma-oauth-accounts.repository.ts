/**
 * Prisma adapter for `OAuthAccountsRepositoryPort`. Owns the
 * `Account` row shape and the user-create projection. Email
 * verification is stamped at create time when the provider gave
 * us an email — providers never give us an unverified email
 * because the OAuth flow itself proves ownership.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type { OAuthProfile, OAuthProvider } from '../../../domain/entities/oauth-profile';
import { OAuthAccountsRepositoryPort } from '../../../domain/ports/oauth-accounts.repository.port';

export class PrismaOAuthAccountsRepository extends OAuthAccountsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findUserIdByProviderAccount(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<string | null> {
    const row = await this.prisma.account.findFirst({
      where: { provider, providerAccountId },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }

  async findUserIdByEmail(email: string): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async createUserFromProfile(profile: OAuthProfile): Promise<string> {
    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.displayName,
        photoURL: profile.photoURL,
        emailVerified: profile.email ? new Date() : null,
      },
      select: { id: true },
    });
    return created.id;
  }

  async createAccountForUser(userId: string, profile: OAuthProfile): Promise<void> {
    await this.prisma.account.create({
      data: {
        userId,
        type: 'oauth',
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        access_token: profile.accessToken,
        refresh_token: profile.refreshToken,
      },
    });
  }

  async refreshAccountTokens(userId: string, profile: OAuthProfile): Promise<void> {
    await this.prisma.account.updateMany({
      where: {
        userId,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
      data: {
        access_token: profile.accessToken,
        refresh_token: profile.refreshToken,
      },
    });
  }

  async findAccessToken(userId: string, provider: OAuthProvider): Promise<string | null> {
    const row = await this.prisma.account.findFirst({
      where: { userId, provider },
      select: { access_token: true },
    });
    return row?.access_token ?? null;
  }
}
