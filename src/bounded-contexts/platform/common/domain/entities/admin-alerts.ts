/**
 * View shape for admin alert counts.
 *
 * `total` is the one queue counter left and is the badge
 * the navbar surfaces; the use case computes it so the repository
 * stays a pure read.
 */

export interface AdminAlerts {
  readonly usersPendingVerification: number;
  readonly total: number;
}

export interface AdminAlertCounts {
  readonly usersPendingVerification: number;
}
