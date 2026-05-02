/**
 * Fit-profile guard helpers.
 *
 * Pure functions consumed by routes / handlers that need to enforce:
 *   1. The caller is authenticated (`AuthenticatedUserMissingException`).
 *   2. The caller has a current Fit Profile vector
 *      (`FitProfileRequiredException` — `'never'` or `'expired'`).
 *
 * Kept framework-free so both the Nest controller surface and the
 * Elysia route handler can reuse them without duplicating the
 * lifecycle-state branching that lives in `GetFitProfileStatusUseCase`.
 */

import {
  AuthenticatedUserMissingException,
  FitProfileRequiredException,
} from '../../domain/exceptions/fit-profile.exceptions';
import type { GetFitProfileStatusUseCase } from '../use-cases/get-fit-profile-status.use-case';

export interface AuthenticatedUserLike {
  readonly userId?: string | null;
}

/**
 * Returns the caller's `userId` or throws `AuthenticatedUserMissingException`
 * — used by routes that forgot to declare `auth: { kind: 'jwt' }` or
 * by background CLI tooling that re-uses the same use cases.
 */
export function requireAuthenticatedUserId(user: AuthenticatedUserLike | null | undefined): string {
  const userId = user?.userId;
  if (!userId) {
    throw new AuthenticatedUserMissingException();
  }
  return userId;
}

/**
 * Asserts the caller has a current Fit Profile vector and returns the
 * status view. Routes guarded by Job Match / Match Explanation should
 * call this before invoking the underlying use case so the surface
 * carries the localizable `FIT_PROFILE_REQUIRED` envelope.
 */
export async function requireCurrentFitProfile(
  userId: string,
  statusUseCase: GetFitProfileStatusUseCase,
  now: Date = new Date(),
): Promise<void> {
  const view = await statusUseCase.execute(userId, now);
  if (view.status === 'never' || view.status === 'expired') {
    throw new FitProfileRequiredException(view.status);
  }
}
