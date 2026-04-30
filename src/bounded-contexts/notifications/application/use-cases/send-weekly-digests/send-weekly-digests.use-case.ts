/**
 * Sends the weekly activity digest to opted-in users.
 *
 * Eligibility = at least one preference row with `emailDelivery=WEEKLY`
 * + `emailEnabled=true`. The recipient list is filtered by the
 * `WeeklyDigestLogPort` (active + verified email). Idempotent per ISO
 * week thanks to `wasSentThisWeek` / `recordSent`.
 *
 * Per-user failures are isolated so one SMTP blip can't take down the
 * whole batch.
 */

import type { LoggerPort } from '@/shared-kernel';
import { NotificationEmailPort } from '../../../domain/ports/notification-email.port';
import { NotificationsRepositoryPort } from '../../../domain/ports/notifications.repository.port';
import { WeeklyDigestLogPort } from '../../../domain/ports/weekly-digest-log.port';
import { WeeklyDigestStatsPort } from '../../../domain/ports/weekly-digest-stats.port';
import { buildWeeklyDigest } from '../../services/build-weekly-digest.service';
import { isoWeekKey } from '../../shared/format';

const CTX = 'SendWeeklyDigestsUseCase';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WeeklyDigestSummary {
  readonly usersEmailed: number;
  readonly usersSkipped: number;
}

export class SendWeeklyDigestsUseCase {
  constructor(
    private readonly repository: NotificationsRepositoryPort,
    private readonly stats: WeeklyDigestStatsPort,
    private readonly digestLog: WeeklyDigestLogPort,
    private readonly email: NotificationEmailPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(now: Date = new Date()): Promise<WeeklyDigestSummary> {
    const cutoff = new Date(now.getTime() - WEEK_MS);
    const weekKey = isoWeekKey(now);

    const optedIn = await this.repository.listWeeklyOptInUserIds();
    if (optedIn.length === 0) {
      return { usersEmailed: 0, usersSkipped: 0 };
    }

    const users = await this.digestLog.listEligibleRecipients(optedIn);

    let usersEmailed = 0;
    let usersSkipped = 0;

    for (const user of users) {
      try {
        if (!user.email) {
          usersSkipped += 1;
          continue;
        }
        if (await this.digestLog.wasSentThisWeek(user.id, weekKey)) {
          usersSkipped += 1;
          continue;
        }

        const stats = await this.stats.collect(user.id, cutoff);
        const digest = buildWeeklyDigest({ userName: user.name, stats });
        if (!digest) {
          usersSkipped += 1;
          continue;
        }

        await this.email.send({
          to: user.email,
          subject: digest.subject,
          html: digest.html,
          text: digest.text,
        });
        await this.digestLog.recordSent(user.id, weekKey);
        usersEmailed += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        this.logger.error(`Weekly digest failed for user ${user.id}: ${message}`, undefined, CTX);
      }
    }

    return { usersEmailed, usersSkipped };
  }
}
