/**
 * Outbound port for the idempotence flags used by the fit-profile
 * expiry reminder fanout. Backed by a TTL'd cache (Redis in prod) so
 * a duplicate cron tick on the same day skips already-sent users.
 */

export abstract class ReminderStatePort {
  abstract wasReminderSent(key: string): Promise<boolean>;
  abstract recordReminderSent(key: string, ttlSeconds: number): Promise<void>;
}
