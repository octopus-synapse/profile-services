export type FitStatus = 'never' | 'responded' | 'expired';

export interface UserFitState {
  readonly userId: string;
  readonly status: FitStatus;
}

/**
 * Thin read-through to the `fit-profile/` context's UserFitProfile
 * state. `job-match` is only interested in "does the user have a valid
 * vector we can compare against?" — the full profile read lives in its
 * owner context. Kept as a port so we can inject in-memory state in
 * use-case tests without dragging the fit-profile graph in.
 */
export abstract class UserFitStatePort {
  abstract getStatus(userId: string): Promise<UserFitState>;
}
