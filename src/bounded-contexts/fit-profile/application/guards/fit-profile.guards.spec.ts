/**
 * Fit-profile guard helpers — unit tests.
 *
 * Routes that need a current Fit Profile vector or an authenticated
 * caller delegate to these helpers; we cover the typed-throw surface
 * so the envelope carries `AUTHENTICATED_USER_MISSING` / `FIT_PROFILE_REQUIRED`.
 */

import { describe, expect, it, mock } from 'bun:test';
import {
  AuthenticatedUserMissingException,
  FitProfileRequiredException,
} from '../../domain/exceptions/fit-profile.exceptions';
import type { GetFitProfileStatusUseCase } from '../use-cases/get-fit-profile-status.use-case';
import { requireAuthenticatedUserId, requireCurrentFitProfile } from './fit-profile.guards';

describe('requireAuthenticatedUserId', () => {
  it('throws AuthenticatedUserMissingException when user is null', () => {
    expect(() => requireAuthenticatedUserId(null)).toThrow(AuthenticatedUserMissingException);
  });

  it('throws AuthenticatedUserMissingException when userId is missing', () => {
    expect(() => requireAuthenticatedUserId({ userId: '' })).toThrow(
      AuthenticatedUserMissingException,
    );
  });

  it('returns userId when present', () => {
    expect(requireAuthenticatedUserId({ userId: 'u-1' })).toBe('u-1');
  });
});

describe('requireCurrentFitProfile', () => {
  const buildStatus = (status: 'never' | 'expired' | 'responded') =>
    ({
      execute: mock(() =>
        Promise.resolve({
          status,
          profile: null,
          answeredAt: null,
          expiresAt: null,
          remainingQuestions: status === 'responded' ? 0 : 25,
        }),
      ),
    }) as unknown as GetFitProfileStatusUseCase;

  it('throws FitProfileRequiredException("never") when user has no profile', async () => {
    await expect(requireCurrentFitProfile('u-1', buildStatus('never'))).rejects.toThrow(
      FitProfileRequiredException,
    );
  });

  it('throws FitProfileRequiredException("expired") when vector lapsed', async () => {
    await expect(requireCurrentFitProfile('u-1', buildStatus('expired'))).rejects.toThrow(
      FitProfileRequiredException,
    );
  });

  it('resolves silently when status is responded', async () => {
    await expect(
      requireCurrentFitProfile('u-1', buildStatus('responded')),
    ).resolves.toBeUndefined();
  });
});
