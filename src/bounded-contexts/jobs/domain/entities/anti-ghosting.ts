/**
 * Domain shapes for the anti-ghosting silence detector.
 *
 * `THRESHOLD_DAYS` is the canonical reminder ladder (7/14/21 days). The
 * sweep use case picks the highest threshold a stale application has
 * crossed and lets the repository de-dup via `JobApplicationReminderLog`
 * so reruns never spam the same user twice.
 */

export const ANTI_GHOSTING_THRESHOLD_DAYS = [7, 14, 21] as const;
export type ReminderThreshold = (typeof ANTI_GHOSTING_THRESHOLD_DAYS)[number];

/** Event types that count as "something is happening" — they silence the
 *  detector either because the recruiter responded or the user already
 *  acted (e.g. sent a follow-up, withdrew). */
export const ANTI_GHOSTING_SILENCING_EVENTS: ReadonlySet<string> = new Set([
  'FOLLOW_UP_SENT',
  'VIEWED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFER_RECEIVED',
  'REJECTED',
  'WITHDRAWN',
]);

export interface StaleApplicationCandidate {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly jobTitle: string;
  readonly company: string;
  /** Most recent event on the application, if any — used to decide
   *  whether the silence has been broken. */
  readonly lastEvent: { readonly type: string; readonly occurredAt: Date } | null;
}

export interface AntiGhostingUser {
  readonly email: string;
  readonly name: string | null;
}

export interface AntiGhostingNotificationInput {
  readonly userId: string;
  readonly company: string;
  readonly jobTitle: string;
  readonly daysSilent: number;
  readonly applicationId: string;
}

export interface AntiGhostingSweepResult {
  readonly scanned: number;
  readonly reminded: number;
}
