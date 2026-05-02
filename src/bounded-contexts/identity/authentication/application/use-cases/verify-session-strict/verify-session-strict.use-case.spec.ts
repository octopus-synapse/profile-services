import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InvalidTokenException,
  SessionExpiredException,
  SessionNotFoundException,
  TokenInvalidException,
  TokenVerificationFailedException,
} from '../../../domain/exceptions';
import {
  InMemoryAuthenticationRepository,
  InMemoryTokenGenerator,
} from '../../../testing';
import { VerifySessionStrictUseCase } from './verify-session-strict.use-case';

function build() {
  const repository = new InMemoryAuthenticationRepository();
  const tokenGenerator = new InMemoryTokenGenerator();
  const useCase = new VerifySessionStrictUseCase(
    repository,
    tokenGenerator,
    stubLogger,
  );
  return { repository, tokenGenerator, useCase };
}

describe('VerifySessionStrictUseCase', () => {
  it('throws SessionNotFoundException when no token is supplied', async () => {
    const { useCase } = build();
    await expect(useCase.execute({ token: undefined })).rejects.toBeInstanceOf(
      SessionNotFoundException,
    );
    await expect(useCase.execute({ token: '' })).rejects.toBeInstanceOf(
      SessionNotFoundException,
    );
  });

  it('throws InvalidTokenException when verifySessionToken throws', async () => {
    const { useCase } = build();
    // Token is not registered in the in-memory generator → verify throws.
    await expect(useCase.execute({ token: 'unregistered' })).rejects.toBeInstanceOf(
      InvalidTokenException,
    );
  });

  it('throws SessionExpiredException for an expired payload', async () => {
    const { useCase, tokenGenerator } = build();
    const past = Math.floor(Date.now() / 1000) - 60;
    tokenGenerator.setValidSessionToken('expired-token', {
      sub: 'user-1',
      email: 'a@b.c',
      sessionId: 'sess',
      iat: past - 3600,
      exp: past,
    });
    await expect(
      useCase.execute({ token: 'expired-token' }),
    ).rejects.toBeInstanceOf(SessionExpiredException);
  });

  it('throws TokenInvalidException when the token user no longer exists', async () => {
    const { useCase, tokenGenerator } = build();
    const now = Math.floor(Date.now() / 1000);
    tokenGenerator.setValidSessionToken('orphan-token', {
      sub: 'ghost',
      email: 'g@h.c',
      sessionId: 'sess',
      iat: now,
      exp: now + 3600,
    });
    await expect(
      useCase.execute({ token: 'orphan-token' }),
    ).rejects.toBeInstanceOf(TokenInvalidException);
  });

  it('throws TokenVerificationFailedException when the repository lookup throws', async () => {
    const { useCase, tokenGenerator, repository } = build();
    const now = Math.floor(Date.now() / 1000);
    tokenGenerator.setValidSessionToken('cache-down-token', {
      sub: 'user-1',
      email: 'a@b.c',
      sessionId: 'sess',
      iat: now,
      exp: now + 3600,
    });
    // Force the repository to throw on lookup.
    repository.findSessionUser = async () => {
      throw new Error('redis unreachable');
    };
    await expect(
      useCase.execute({ token: 'cache-down-token' }),
    ).rejects.toBeInstanceOf(TokenVerificationFailedException);
  });

  it('returns the session user for a valid, fresh token', async () => {
    const { useCase, tokenGenerator, repository } = build();
    repository.seedSessionUser({
      id: 'user-1',
      email: 'a@b.c',
      name: 'Tester',
      username: 'tester',
      hasCompletedOnboarding: true,
      emailVerified: true,
      role: 'USER',
      roles: ['role_user'],
    });
    const now = Math.floor(Date.now() / 1000);
    tokenGenerator.setValidSessionToken('fresh-token', {
      sub: 'user-1',
      email: 'a@b.c',
      sessionId: 'sess',
      iat: now,
      exp: now + 3600,
    });
    const user = await useCase.execute({ token: 'fresh-token' });
    expect(user.id).toBe('user-1');
  });
});
