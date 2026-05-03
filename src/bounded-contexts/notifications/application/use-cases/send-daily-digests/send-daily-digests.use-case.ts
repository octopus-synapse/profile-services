/**
 * Sends a daily digest of unread notifications to each user with
 * `emailDelivery=DAILY` for at least one type. Idempotent via
 * `emailDigestSentAt`: rows whose timestamp is null are eligible,
 * everything else is skipped on the next run.
 *
 * The cutoff is 24h to match the cron cadence; the per-user cap of 50
 * keeps the email body bounded even after a noisy day.
 */

import type { LoggerPort } from '@/shared-kernel';
import type {
  NotificationType,
  PendingDigestNotification,
} from '../../../domain/entities/notification.entity';
import { NotificationEmailPort } from '../../../domain/ports/notification-email.port';
import { NotificationsRepositoryPort } from '../../../domain/ports/notifications.repository.port';
import { escapeHtml, humanizeType } from '../../shared/format';

const CTX = 'SendDailyDigestsUseCase';
const CUTOFF_MS = 24 * 60 * 60 * 1000;
const PER_USER_LIMIT = 50;

export interface DailyDigestSummary {
  readonly usersEmailed: number;
  readonly notificationsBatched: number;
}

export class SendDailyDigestsUseCase {
  constructor(
    private readonly repository: NotificationsRepositoryPort,
    private readonly email: NotificationEmailPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(now: Date = new Date()): Promise<DailyDigestSummary> {
    const cutoff = new Date(now.getTime() - CUTOFF_MS);
    const prefs = await this.repository.listDailyDigestPreferences();
    const byUser = new Map<string, NotificationType[]>();
    for (const p of prefs) {
      if (!byUser.has(p.userId)) byUser.set(p.userId, []);
      byUser.get(p.userId)?.push(p.type);
    }

    let usersEmailed = 0;
    let notificationsBatched = 0;

    for (const [userId, types] of byUser.entries()) {
      const pending = await this.repository.listPendingDigestNotifications(
        userId,
        types,
        cutoff,
        PER_USER_LIMIT,
      );
      if (pending.length === 0) continue;

      const recipient = await this.repository.findRecipient(userId);
      if (!recipient?.email) continue;

      try {
        await this.email.send(this.composeEmail(recipient.name, recipient.email, pending));
        await this.repository.markDigestEmailSent(
          pending.map((n) => n.id),
          new Date(),
        );
        usersEmailed += 1;
        notificationsBatched += pending.length;
      } catch (err) {
        this.logger.warn(
          `Digest email failed for user ${userId}: ${err instanceof Error ? err.message : 'unknown'}`,
          CTX,
        );
      }
    }

    return { usersEmailed, notificationsBatched };
  }

  private composeEmail(
    name: string | null,
    email: string,
    pending: PendingDigestNotification[],
  ): { to: string; subject: string; html: string; text: string } {
    const items = pending
      .map(
        (n) =>
          `<li><strong>${humanizeType(n.type)}</strong>: ${escapeHtml(n.message)} <em>(${n.createdAt.toISOString()})</em></li>`,
      )
      .join('');
    return {
      to: email,
      subject: `[ProFile] Your daily digest — ${pending.length} new notifications`,
      html: `<p>Hi ${name ?? 'there'},</p><p>Here's what you missed in the last 24h:</p><ul>${items}</ul>`,
      text: pending.map((n) => `${humanizeType(n.type)}: ${n.message}`).join('\n'),
    };
  }
}
