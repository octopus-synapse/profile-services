/**
 * ExchangeSessionForTokensUseCase tests — V2 D42 mobile flow.
 *
 * Covers:
 *  - Happy path: the cached id resolves to a userId + email, the
 *    use case mints a fresh access/refresh pair, persists the refresh
 *    token through the repository, and returns the token bundle.
 *  - Cache miss / TTL expiration: the use case throws
 *    `SessionExchangeInvalidException`.
 *  - One-shot semantics: a second call with the same id (after the
 *    first consume) also throws.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { SessionExchangeInvalidException } from '../../../domain/exceptions';
import {
  createAuthUser,
  InMemoryAuthenticationRepository,
  InMemoryTokenGenerator,
} from '../../../testing';
import type {
  SessionExchangePayload,
  SessionExchangePort,
} from '../../ports/session-exchange.port';
import { ExchangeSessionForTokensUseCase } from './exchange-session-for-tokens.use-case';

class InMemorySessionExchangeAdapter implements SessionExchangePort {
  private readonly store_ = new Map<string, SessionExchangePayload>();

  async store(id: string, payload: SessionExchangePayload, _ttlSeconds: number): Promise<void> {
    this.store_.set(id, payload);
  }

  async consume(id: string): Promise<SessionExchangePayload | null> {
    const payload = this.store_.get(id) ?? null;
    if (payload) this.store_.delete(id);
    return payload;
  }

  forceExpire(id: string): void {
    this.store_.delete(id);
  }
}

describe('ExchangeSessionForTokensUseCase', () => {
  let useCase: ExchangeSessionForTokensUseCase;
  let exchange: InMemorySessionExchangeAdapter;
  let tokenGenerator: InMemoryTokenGenerator;
  let repository: InMemoryAuthenticationRepository;

  beforeEach(() => {
    exchange = new InMemorySessionExchangeAdapter();
    tokenGenerator = new InMemoryTokenGenerator();
    repository = new InMemoryAuthenticationRepository();
    useCase = new ExchangeSessionForTokensUseCase(exchange, tokenGenerator, repository, stubLogger);
  });

  it('exchanges a stored id for a fresh access/refresh token pair', async () => {
    const user = createAuthUser({ id: 'user-42', email: 'mobile@example.com' });
    repository.seedUser(user);
    await exchange.store('sxc_abc', { userId: user.id, email: user.email }, 60);

    const result = await useCase.execute({ sessionExchangeId: 'sxc_abc' });

    expect(result.userId).toBe('user-42');
    expect(result.accessToken).toMatch(/^access_/);
    expect(result.refreshToken).toMatch(/^refresh_/);
    expect(result.expiresIn).toBeGreaterThan(0);

    // Refresh token persisted under the canonical repository.
    const stored = repository.getAllRefreshTokens();
    expect(stored).toHaveLength(1);
    expect(stored[0].userId).toBe('user-42');
    expect(stored[0].token).toBe(result.refreshToken);
    expect(stored[0].authMethod).toBe('TOKEN_EXCHANGE');
  });

  it('throws SessionExchangeInvalidException when the id was never stored', async () => {
    await expect(useCase.execute({ sessionExchangeId: 'sxc_missing' })).rejects.toThrow(
      SessionExchangeInvalidException,
    );
  });

  it('throws SessionExchangeInvalidException when the id expired (cache evicted)', async () => {
    await exchange.store('sxc_short', { userId: 'u-1', email: 'a@b' }, 60);
    exchange.forceExpire('sxc_short');

    await expect(useCase.execute({ sessionExchangeId: 'sxc_short' })).rejects.toThrow(
      SessionExchangeInvalidException,
    );
  });

  it('is one-shot — a replayed id fails on the second call', async () => {
    await exchange.store('sxc_once', { userId: 'u-9', email: 'once@example.com' }, 60);

    const first = await useCase.execute({ sessionExchangeId: 'sxc_once' });
    expect(first.userId).toBe('u-9');

    await expect(useCase.execute({ sessionExchangeId: 'sxc_once' })).rejects.toThrow(
      SessionExchangeInvalidException,
    );
  });
});
