import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

/**
 * Normalized profile the strategies hand us after a successful OAuth round
 * trip. Provider-specific fields (company, bio, etc.) live on `raw` so the
 * import use-cases can dig them out without us inventing a union type per
 * provider.
 */
export type OAuthProfile = {
  provider: 'github' | 'linkedin';
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  accessToken: string;
  refreshToken: string | null;
  raw: Record<string, unknown>;
};

export type OAuthUpsertResult = {
  userId: string;
  created: boolean;
};

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  hasProvider(provider: 'github' | 'linkedin'): boolean {
    const id = this.config.get<string>(`${provider.toUpperCase()}_CLIENT_ID`);
    const secret = this.config.get<string>(`${provider.toUpperCase()}_CLIENT_SECRET`);
    return Boolean(id && secret);
  }

  /**
   * Find an existing User by (provider, providerAccountId); failing that, by
   * matching email; otherwise create a new User. Either way we upsert the
   * `Account` row so subsequent imports have a fresh access token.
   */
  async upsertFromProfile(profile: OAuthProfile): Promise<OAuthUpsertResult> {
    // 1. Match on the Account composite first — most reliable.
    const byAccount = await this.prisma.account.findFirst({
      where: { provider: profile.provider, providerAccountId: profile.providerAccountId },
      select: { userId: true },
    });
    if (byAccount) {
      await this.refreshAccountTokens(byAccount.userId, profile);
      return { userId: byAccount.userId, created: false };
    }

    // 2. Otherwise match on email so a user can connect a second provider
    // without duplicating their account. Null email → always create a new row.
    if (profile.email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
        select: { id: true },
      });
      if (byEmail) {
        await this.createAccountRow(byEmail.id, profile);
        return { userId: byEmail.id, created: false };
      }
    }

    // 3. New user. Keep it minimal: name + email + photoURL; onboarding will
    // fill the rest (and the GitHub / LinkedIn import use-cases flesh out
    // skills + experience afterwards).
    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.displayName,
        photoURL: profile.photoURL,
        emailVerified: profile.email ? new Date() : null,
      },
      select: { id: true },
    });
    await this.createAccountRow(created.id, profile);
    this.logger.log(`Created user ${created.id} from ${profile.provider} OAuth.`);
    return { userId: created.id, created: true };
  }

  private async refreshAccountTokens(userId: string, profile: OAuthProfile) {
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

  private async createAccountRow(userId: string, profile: OAuthProfile) {
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

  /** Retrieve the stored access token for a provider, if the user connected one. */
  async getAccessToken(userId: string, provider: 'github' | 'linkedin'): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { userId, provider },
      select: { access_token: true },
    });
    return account?.access_token ?? null;
  }
}
