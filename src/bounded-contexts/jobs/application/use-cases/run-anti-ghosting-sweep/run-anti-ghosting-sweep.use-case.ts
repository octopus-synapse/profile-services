/**
 * Cron-triggered sweep that nudges users on stale job applications.
 *
 * For every `JobApplication` idle ≥7 days where the most recent event
 * isn't already a "silencing" one (FOLLOW_UP_SENT, OFFER, etc.) we:
 *   1. Pick the highest threshold the silence has crossed (7/14/21).
 *   2. Skip if a reminder has already been logged for that
 *      `(applicationId, threshold)` — the unique constraint on
 *      `JobApplicationReminderLog` enforces idempotency across retries.
 *   3. Build the reminder body via `buildAntiGhostingEmail` (pure helper
 *      — different copy per threshold) and send it through the emailer
 *      port. Transport failures are swallowed by the adapter so they
 *      can't kill the sweep mid-loop.
 *   4. Mirror the email as an in-app notification so users who don't
 *      open email still see it in the bell. `messageKey` +
 *      `messageParams` let the UI re-render in any locale without an
 *      extra round-trip.
 *   5. Log the reminder so reruns don't double-nag.
 *
 * Returns scan/remind counts for the worker to log.
 */

import type { LoggerPort } from '@/shared-kernel';
import type {
  AntiGhostingSweepResult,
  ReminderThreshold,
  StaleApplicationCandidate,
} from '../../../domain/entities/anti-ghosting';
import {
  ANTI_GHOSTING_SILENCING_EVENTS,
  ANTI_GHOSTING_THRESHOLD_DAYS,
} from '../../../domain/entities/anti-ghosting';
import { AntiGhostingRepositoryPort } from '../../../domain/ports/anti-ghosting.repository.port';
import { AntiGhostingEmailerPort } from '../../../domain/ports/anti-ghosting-emailer.port';
import { buildAntiGhostingEmail } from '../../services/build-anti-ghosting-email.service';

const CTX = 'RunAntiGhostingSweepUseCase';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class RunAntiGhostingSweepUseCase {
  constructor(
    private readonly repository: AntiGhostingRepositoryPort,
    private readonly emailer: AntiGhostingEmailerPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(now: Date = new Date()): Promise<AntiGhostingSweepResult> {
    const cutoff = new Date(now.getTime() - 7 * MS_PER_DAY);
    const candidates = await this.repository.findStaleCandidates(cutoff);

    let reminded = 0;
    for (const candidate of candidates) {
      if (candidate.lastEvent && ANTI_GHOSTING_SILENCING_EVENTS.has(candidate.lastEvent.type)) {
        continue;
      }

      const referenceDate = candidate.lastEvent?.occurredAt ?? candidate.createdAt;
      const daysSilent = Math.floor((now.getTime() - referenceDate.getTime()) / MS_PER_DAY);
      const threshold = pickThreshold(daysSilent);
      if (!threshold) continue;

      const already = await this.repository.hasReminderBeenSent(candidate.id, threshold);
      if (already) continue;

      const user = await this.repository.findUser(candidate.userId);
      if (!user?.email) continue;

      await this.sendReminder(user.email, user.name, candidate, daysSilent);

      await this.repository.createStaleNotification({
        userId: candidate.userId,
        company: candidate.company,
        jobTitle: candidate.jobTitle,
        daysSilent,
        applicationId: candidate.id,
      });

      await this.repository.recordReminderLog(candidate.id, threshold);
      reminded += 1;
    }

    return { scanned: candidates.length, reminded };
  }

  private async sendReminder(
    to: string,
    name: string | null,
    candidate: StaleApplicationCandidate,
    daysSilent: number,
  ): Promise<void> {
    const payload = buildAntiGhostingEmail({
      userName: name,
      jobTitle: candidate.jobTitle,
      company: candidate.company,
      daysSilent,
    });

    try {
      await this.emailer.send({
        to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
    } catch (err) {
      this.logger.error(`Anti-ghosting reminder failed for app ${candidate.id}: ${
          err instanceof Error ? err.message : 'unknown'
        }`, { context: CTX, stack: err instanceof Error ? err.stack : undefined });
    }
  }
}

function pickThreshold(daysSilent: number): ReminderThreshold | null {
  for (let i = ANTI_GHOSTING_THRESHOLD_DAYS.length - 1; i >= 0; i--) {
    const t = ANTI_GHOSTING_THRESHOLD_DAYS[i]!;
    if (daysSilent >= t) return t;
  }
  return null;
}
