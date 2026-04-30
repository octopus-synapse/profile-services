/**
 * View shape for admin alert counts.
 *
 * `total` is the sum of the three queue counters and is the badge
 * the navbar surfaces; the use case computes it so the repository
 * stays a pure read.
 */

export interface AdminAlerts {
  readonly reportsPending: number;
  readonly usersPendingVerification: number;
  readonly shadowProfilesStale: number;
  readonly total: number;
}

export interface AdminAlertCounts {
  readonly reportsPending: number;
  readonly usersPendingVerification: number;
  readonly shadowProfilesStale: number;
}
