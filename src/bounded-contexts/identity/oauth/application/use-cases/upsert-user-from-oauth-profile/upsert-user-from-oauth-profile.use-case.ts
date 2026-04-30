/**
 * Resolves an `OAuthProfile` to a User row, creating one if needed.
 * Matching order is the policy that historically lived in the
 * service:
 *
 *   1. (provider, providerAccountId) — most reliable; refreshes tokens.
 *   2. email match — lets a user link a second provider without
 *      duplicating accounts. A null email skips this branch.
 *   3. fall through to creating a new user + account row.
 *
 * Either way the `Account` row is upserted so subsequent imports get
 * a fresh access token.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { OAuthProfile, OAuthUpsertResult } from '../../../domain/entities/oauth-profile';
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
      const byEmail = await this.accounts.findUserIdByEmail(profile.email);
      if (byEmail) {
        await this.accounts.createAccountForUser(byEmail, profile);
        return { userId: byEmail, created: false };
      }
    }

    const newUserId = await this.accounts.createUserFromProfile(profile);
    await this.accounts.createAccountForUser(newUserId, profile);
    this.logger.log(`Created user ${newUserId} from ${profile.provider} OAuth`, CTX);
    return { userId: newUserId, created: true };
  }
}
