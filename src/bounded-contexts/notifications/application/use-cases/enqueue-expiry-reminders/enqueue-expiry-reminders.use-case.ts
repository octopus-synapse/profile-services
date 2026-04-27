/**
 * Read-side scan for the fit-profile expiry-reminder fanout.
 *
 * Walks the three reminder windows (7d, 3d, 1d ahead) and returns the
 * full list of users due for a reminder right now, filtered for:
 *   - Standard role only — admins/recruiters bypass the lockout, so
 *     they don't get the reminder either.
 *   - Already-sent flag — Redis-backed via `ReminderStatePort`. We
 *     filter at fanout time so we don't pay for a job-per-user
 *     round-trip just to discover the work was already done.
 *
 * The worker takes the returned tuples and enqueues one job per
 * tuple — actually adding to BullMQ stays in infrastructure.
 */

import { LoggerPort } from '@/shared-kernel';
import type {
  FitProfileExpiringRow,
  FitProfileReminderDaysLeft,
} from '../../../domain/entities/notification';
import { FitProfileExpiryReadPort } from '../../../domain/ports/fit-profile-expiry.port';
import { ReminderStatePort } from '../../../domain/ports/reminder-state.port';

const REMINDER_WINDOWS: ReadonlyArray<FitProfileReminderDaysLeft> = [7, 3, 1];
const STANDARD_ROLE = 'role_user_standard';

export interface ExpiryReminderJob {
  readonly userId: string;
  readonly daysLeft: FitProfileReminderDaysLeft;
  readonly expiresAt: string;
}

export class EnqueueExpiryRemindersUseCase {
  constructor(
    private readonly expiryRead: FitProfileExpiryReadPort,
    private readonly reminderState: ReminderStatePort,
  ) {}

  async execute(now: Date = new Date()): Promise<ExpiryReminderJob[]> {
    const jobs: ExpiryReminderJob[] = [];
    for (const daysLeft of REMINDER_WINDOWS) {
      // Window: [now + (daysLeft-0.5)d, now + (daysLeft+0.5)d)
      const ms = 24 * 60 * 60 * 1000;
      const windowStart = new Date(now.getTime() + (daysLeft - 0.5) * ms);
      const windowEnd = new Date(now.getTime() + (daysLeft + 0.5) * ms);

      const due = await this.expiryRead.findExpiringInWindow(windowStart, windowEnd);
      for (const row of due) {
        if (!this.isStandard(row)) continue;
        const flagKey = flagKeyFor(row.userId, daysLeft);
        if (await this.reminderState.wasReminderSent(flagKey)) continue;
        jobs.push({
          userId: row.userId,
          daysLeft,
          expiresAt: row.expiresAt.toISOString(),
        });
      }
    }
    return jobs;
  }

  private isStandard(row: FitProfileExpiringRow): boolean {
    return row.userRoles.includes(STANDARD_ROLE);
  }
}

export function flagKeyFor(userId: string, daysLeft: number): string {
  return `notif:fit-expiry-reminder:${userId}:${daysLeft}`;
}
