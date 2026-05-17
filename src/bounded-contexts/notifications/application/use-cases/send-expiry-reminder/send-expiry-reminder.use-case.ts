/**
 * Sends a single fit-profile expiry reminder to one user.
 *
 * P1 #29 — idempotency is enforced in two layers:
 *
 *   1. Fast-path Redis flag via `ReminderStatePort.wasReminderSent`
 *      so the cron tick skips obvious duplicates without touching
 *      Postgres.
 *   2. Authoritative `INSERT ... ON CONFLICT DO NOTHING` into
 *      `FitProfileReminderLog` (the unique
 *      `(userId, daysLeft, sentDate)` index) via
 *      `claimReminderSlot`. If two workers race past the Redis
 *      check, only one of them gets `claimed: true` and sends the
 *      notification; the loser returns silently.
 *
 * The previous implementation wrapped the whole body in a silent
 * `try/catch` that downgraded every error (including the unique
 * conflict that meant 'someone else already sent it') to a warn log.
 * That made real downstream failures (DB outage, email service down)
 * invisible to the worker's failure-mode wrapper. We now let
 * unexpected errors propagate so `runWithFailureMode` can do its job.
 */

import type { LoggerPort } from '@/shared-kernel';
import { pluralize } from '@/shared-kernel/i18n/pluralize';
import type { FitProfileReminderDaysLeft } from '../../../domain/entities/notification.entity';
import { ReminderStatePort } from '../../../domain/ports/reminder-state.port';
import { CreateNotificationUseCase } from '../create-notification/create-notification.use-case';
import { flagKeyFor } from '../enqueue-expiry-reminders/enqueue-expiry-reminders.use-case';

const CTX = 'SendExpiryReminderUseCase';
const SYSTEM_ACTOR = 'system';
const SECONDS_PER_DAY = 60 * 60 * 24;
const SENT_FLAG_TTL_DAYS = 8;
/** TTL outlives the reminder window so a same-day rescan skips. */
const SENT_FLAG_TTL_SECONDS = SECONDS_PER_DAY * SENT_FLAG_TTL_DAYS;

export interface SendExpiryReminderInput {
  readonly userId: string;
  readonly daysLeft: FitProfileReminderDaysLeft;
  readonly expiresAt: string;
}

function todayDateOnly(now: Date = new Date()): string {
  return now.toISOString().slice(0, 'YYYY-MM-DD'.length);
}

export class SendExpiryReminderUseCase {
  constructor(
    private readonly reminderState: ReminderStatePort,
    private readonly createNotification: CreateNotificationUseCase,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: SendExpiryReminderInput): Promise<void> {
    const flagKey = flagKeyFor(input.userId, input.daysLeft);
    if (await this.reminderState.wasReminderSent(flagKey)) return;

    const claimed = await this.reminderState.claimReminderSlot({
      userId: input.userId,
      daysLeft: input.daysLeft,
      sentDate: todayDateOnly(),
    });
    if (!claimed) {
      this.logger.debug(
        `expiry-reminder slot already claimed user=${input.userId} daysLeft=${input.daysLeft}`,
        CTX,
      );
      return;
    }

    await this.createNotification.execute({
      userId: input.userId,
      type: 'FIT_PROFILE_EXPIRY_REMINDER',
      actorId: SYSTEM_ACTOR,
      message: `Seu perfil de fit expira em ${pluralize(input.daysLeft, 'dia', 'dias')} (${input.expiresAt}). Refaça o questionário antes para não perder o match.`,
      entityType: 'UserFitProfile',
      entityId: input.userId,
    });

    await this.reminderState.recordReminderSent(flagKey, SENT_FLAG_TTL_SECONDS);
  }
}
