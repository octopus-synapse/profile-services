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
import {
  OAuthAccountsRepositoryPort,
  type OAuthUserByEmailResult,
} from '../../../domain/ports/oauth-accounts.repository.port';

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

  async findUserByEmail(email: string): Promise<OAuthUserByEmailResult | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });
    if (!row) return null;
    return { userId: row.id, emailVerified: row.emailVerified !== null };
  }

  async createUserFromProfile(profile: OAuthProfile): Promise<string> {
    // Only stamp `emailVerified` when the provider actually verified the email
    // (e.g. Google `email_verified`, GitHub primary email with `verified: true`).
    // Otherwise leave `null` so the user is prompted to verify on next login.
    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.displayName,
        photoURL: profile.photoURL,
        emailVerified: profile.emailVerified ? new Date() : null,
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
