/**
 * Resolves an `OAuthProfile` to a User row, creating one if needed.
 * Matching order is the policy that historically lived in the
 * service:
 *
 *   1. (provider, providerAccountId) — most reliable; refreshes tokens.
 *   2. email match — lets a user link a second provider without
 *      duplicating accounts. **Both the inbound OAuth profile AND the
 *      pre-existing User must have a verified email** — otherwise we
 *      refuse to link (OAuthEmailMismatchException). Without this gate
 *      an attacker can register a GitHub account under a victim's email
 *      and inherit the victim's User on callback.
 *   3. fall through to creating a new user + account row.
 *
 * Either way the `Account` row is upserted so subsequent imports get
 * a fresh access token.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { OAuthProfile, OAuthUpsertResult } from '../../../domain/entities/oauth-profile';
import { OAuthEmailMismatchException } from '../../../domain/exceptions/oauth.exceptions';
import { OAuthAccountsRepositoryPort } from '../../../domain/ports/oauth-accounts.repository.port';

// Re-exported so the controller can name the inbound passport payload
// without importing from `domain/entities/` directly (the layer-isolation
// arch rule blocks that — entities reach controllers only through the
// application surface).
export type { OAuthProfile, OAuthUpsertResult };

const CTX = 'UpsertUserFromOAuthProfileUseCase';

export class UpsertUserFromOAuthProfileUseCase {
  constructor(
    private readonly accounts: OAuthAccountsRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(profile: OAuthProfile): Promise<OAuthUpsertResult> {
    const byAccount = await this.accounts.findUserIdByProviderAccount(
      profile.provider,
      profile.providerAccountId,
    );
    if (byAccount) {
      await this.accounts.refreshAccountTokens(byAccount, profile);
      return { userId: byAccount, created: false };
    }

    if (profile.email) {
      const existing = await this.accounts.findUserByEmail(profile.email);
      if (existing) {
        if (!profile.emailVerified || !existing.emailVerified) {
          this.logger.warn(
            `Refusing OAuth account-link by unverified email (provider=${profile.provider})`,
            CTX,
          );
          throw new OAuthEmailMismatchException();
        }
        await this.accounts.createAccountForUser(existing.userId, profile);
        return { userId: existing.userId, created: false };
      }
    }

    const newUserId = await this.accounts.createUserFromProfile(profile);
    await this.accounts.createAccountForUser(newUserId, profile);
    this.logger.log(`Created user ${newUserId} from ${profile.provider} OAuth`, CTX);
    return { userId: newUserId, created: true };
  }
}
