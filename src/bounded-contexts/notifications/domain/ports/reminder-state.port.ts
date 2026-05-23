/**
 * Outbound port for the idempotence flags used by the fit-profile
 * expiry reminder fanout. Backed by a TTL'd cache (Redis in prod) so
 * a duplicate cron tick on the same day skips already-sent users.
 *
 * `claimReminderSlot` is the authoritative DB-backed lock added in
 * Wave 1.3 P1 #29: an `INSERT ... ON CONFLICT DO NOTHING` against the
 * `FitProfileReminderLog` unique index. The cache flag is fast-path
 * dedup; the slot claim is what guarantees a single notification per
 * `(userId, daysLeft, sentDate)` across multi-instance / Redis-flush
 * races.
 */

export interface ClaimReminderSlotInput {
  readonly userId: string;
  readonly daysLeft: number;
  /** Date-only string `YYYY-MM-DD` matching `FitProfileReminderLog.sentDate`. */
  readonly sentDate: string;
}

export abstract class ReminderStatePort {
  abstract wasReminderSent(key: string): Promise<boolean>;
  abstract recordReminderSent(key: string, ttlSeconds: number): Promise<void>;
  /** Returns `true` iff this call was the one that inserted the row. */
  abstract claimReminderSlot(input: ClaimReminderSlotInput): Promise<boolean>;
}
