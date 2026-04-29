/**
 * Port the auth pipeline uses to refresh per-request gate flags
 * (`emailVerified`, `hasCompletedOnboarding`) for an authenticated
 * user. The JWT carries `userId` + a snapshot of `emailVerified` at
 * sign time, but onboarding completion (and email-verification flips
 * mid-session) is not in the token. The pipeline calls this port
 * after the JWT decodes so gate stages have fresh state without each
 * re-querying the DB.
 *
 * Returns `null` when the user no longer exists (deleted account
 * mid-session) — the pipeline maps that to 401.
 */

export interface UserSnapshot {
  readonly userId: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly hasCompletedOnboarding: boolean;
}

export abstract class UserSnapshotPort {
  abstract get(userId: string): Promise<UserSnapshot | null>;
}
