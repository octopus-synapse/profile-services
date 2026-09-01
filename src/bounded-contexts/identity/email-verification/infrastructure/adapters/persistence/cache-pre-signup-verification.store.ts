/**
 * Cache-backed adapter for `PreSignupVerificationStorePort`.
 *
 * Pre-account challenges live in the cache (Redis in prod) rather than
 * Postgres: `EmailVerificationToken.userId` is a NOT NULL FK to `User`,
 * and a signup that never completes should evaporate with the TTL
 * instead of accumulating rows. Same construction as the session
 * exchange adapter (`CacheSessionExchangeAdapter`).
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type {
  PreSignupChallenge,
  PreSignupVerificationStorePort,
} from '../../../domain/ports';

const KEY_PREFIX = 'pre-signup-verification:';

export class CachePreSignupVerificationStore implements PreSignupVerificationStorePort {
  constructor(private readonly cache: CacheService) {}

  async set(email: string, challenge: PreSignupChallenge, ttlSeconds: number): Promise<void> {
    await this.cache.set(this.key(email), challenge, ttlSeconds);
  }

  async find(email: string): Promise<PreSignupChallenge | null> {
    return (await this.cache.get<PreSignupChallenge>(this.key(email))) ?? null;
  }

  async delete(email: string): Promise<void> {
    await this.cache.delete(this.key(email));
  }

  private key(email: string): string {
    return `${KEY_PREFIX}${email}`;
  }
}
