/**
 * Prisma adapter for `OAuthAccountsRepositoryPort`. Owns the
 * `Account` row shape and the user-create projection. Email
 * verification is stamped at create time when the provider gave
 * us an email — providers never give us an unverified email
 * because the OAuth flow itself proves ownership.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type { CipherPort } from '@/shared-kernel/crypto';
import type { OAuthProfile, OAuthProvider } from '../../../domain/entities/oauth-profile';
import {
  OAuthAccountsRepositoryPort,
  type OAuthUserByEmailResult,
} from '../../../domain/ports/oauth-accounts.repository.port';

export class PrismaOAuthAccountsRepository extends OAuthAccountsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
    /**
     * Symmetric cipher used to AES-256-GCM encrypt 3rd-party OAuth access /
     * refresh tokens before persisting (P0-#6). `NoopCipher` in dev silently
     * passes plaintext through so local boot doesn't require key wiring; the
     * production composition root MUST inject `AesGcmCipher`.
     */
    private readonly cipher: CipherPort,
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
        access_token: this.cipher.encrypt(profile.accessToken),
        refresh_token: profile.refreshToken ? this.cipher.encrypt(profile.refreshToken) : null,
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
        access_token: this.cipher.encrypt(profile.accessToken),
        refresh_token: profile.refreshToken ? this.cipher.encrypt(profile.refreshToken) : null,
      },
    });
  }

  async findAccessToken(userId: string, provider: OAuthProvider): Promise<string | null> {
    const row = await this.prisma.account.findFirst({
      where: { userId, provider },
      select: { access_token: true },
    });
    if (!row?.access_token) return null;
    // `cipher.decrypt` returns `null` for legacy plaintext rows that look
    // nothing like a `v1.` ciphertext envelope. Surface as "no token" so the
    // caller falls back to re-prompting the OAuth flow.
    return this.cipher.decrypt(row.access_token);
  }
}
