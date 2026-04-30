/**
 * Outbound port for the per-user idempotency log of the weekly digest.
 * `wasSentThisWeek` lets the use case skip users we already emailed
 * inside the same ISO week; `recordSent` is the success-path persist.
 */

export abstract class WeeklyDigestLogPort {
  abstract wasSentThisWeek(userId: string, weekKey: string): Promise<boolean>;
  abstract recordSent(userId: string, weekKey: string): Promise<void>;
  abstract listEligibleRecipients(
    userIds: readonly string[],
  ): Promise<Array<{ id: string; name: string | null; email: string }>>;
}
