/**
 * Outbound port for anti-ghosting persistence.
 *
 * The cron sweep needs four things from storage:
 *   - candidate stale applications (≥7 days idle, last event included)
 *   - whether a reminder has already been sent for a given
 *     `(applicationId, threshold)` — the unique constraint lives in
 *     `JobApplicationReminderLog`
 *   - the user's email + name to address the reminder
 *   - writing back the in-app notification + the reminder log row so
 *     the sweep is idempotent across retries
 */

import type {
  AntiGhostingNotificationInput,
  AntiGhostingUser,
  ReminderThreshold,
  StaleApplicationCandidate,
} from '../entities/anti-ghosting';

export abstract class AntiGhostingRepositoryPort {
  /**
   * Applications that *might* be stale — `JobApplication.status =
   * SUBMITTED` and `updatedAt <= cutoff` (cutoff = now - 7 days). The
   * sweep does the per-threshold filtering in memory because the
   * population is tiny.
   */
  abstract findStaleCandidates(cutoff: Date): Promise<StaleApplicationCandidate[]>;

  abstract hasReminderBeenSent(
    applicationId: string,
    threshold: ReminderThreshold,
  ): Promise<boolean>;

  abstract findUser(userId: string): Promise<AntiGhostingUser | null>;

  abstract recordReminderLog(applicationId: string, threshold: ReminderThreshold): Promise<void>;

  abstract createStaleNotification(input: AntiGhostingNotificationInput): Promise<void>;
}
