/**
 * Sends a single fit-profile expiry reminder to one user.
 *
 * Re-checks the already-sent flag inside the per-user job (the fanout
 * already filtered, but a duplicate enqueue is still possible across
 * cron ticks). On successful create we set the flag with an 8-day TTL
 * so a same-day rescan skips this user even if BullMQ retried the job.
 *
 * The literal `system` actor id keeps the create-notification use case
 * from short-circuiting the self-notification guard.
 */

import type { LoggerPort } from '@/shared-kernel';
import { pluralize } from '@/shared-kernel/i18n/pluralize';
import type { FitProfileReminderDaysLeft } from '../../../domain/entities/notification.entity';
import { ReminderStatePort } from '../../../domain/ports/reminder-state.port';
import { CreateNotificationUseCase } from '../create-notification/create-notification.use-case';
import { flagKeyFor } from '../enqueue-expiry-reminders/enqueue-expiry-reminders.use-case';

const CTX = 'SendExpiryReminderUseCase';
const SYSTEM_ACTOR = 'system';
/** TTL outlives the window so a duplicate scan in the same day skips. */
const SENT_FLAG_TTL_SECONDS = 60 * 60 * 24 * 8; // 8 days

export interface SendExpiryReminderInput {
  readonly userId: string;
  readonly daysLeft: FitProfileReminderDaysLeft;
  readonly expiresAt: string;
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
    try {
      await this.createNotification.execute({
        userId: input.userId,
        type: 'FIT_PROFILE_EXPIRY_REMINDER',
        actorId: SYSTEM_ACTOR,
        message: `Seu perfil de fit expira em ${pluralize(input.daysLeft, 'dia', 'dias')} (${input.expiresAt}). Refaça o questionário antes para não perder o match.`,
        entityType: 'UserFitProfile',
        entityId: input.userId,
      });
      await this.reminderState.recordReminderSent(flagKey, SENT_FLAG_TTL_SECONDS).catch(() => {});
    } catch (err) {
      this.logger.warn(
        `expiry-reminder failed user=${input.userId} daysLeft=${input.daysLeft}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
    }
  }
}
