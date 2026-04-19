/**
 * Anti-ghosting reminder service
 *
 * Scans JobApplication rows that have been idle past the configured
 * thresholds (7 / 14 / 21 days since the last meaningful event) and
 * queues a reminder email + in-app notification nudging the user to
 * send a follow-up. Idempotent per application + threshold via
 * JobApplicationReminderLog so reruns don't spam.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { buildAntiGhostingEmail } from './build-anti-ghosting-email';

const THRESHOLD_DAYS = [7, 14, 21] as const;
export type ReminderThreshold = (typeof THRESHOLD_DAYS)[number];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SILENCING_EVENTS = new Set([
  'FOLLOW_UP_SENT',
  'VIEWED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFER_RECEIVED',
  'REJECTED',
  'WITHDRAWN',
]);

interface StaleApplication {
  id: string;
  userId: string;
  jobTitle: string;
  company: string;
  daysSilent: number;
  threshold: ReminderThreshold;
}

@Injectable()
export class AntiGhostingService {
  private readonly logger = new Logger(AntiGhostingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async scanAndNotify(now: Date = new Date()): Promise<{
    scanned: number;
    reminded: number;
  }> {
    const cutoff = new Date(now.getTime() - 7 * MS_PER_DAY);

    // Grab applications potentially idle for ≥ 7 days — we do the precise
    // per-threshold decision in memory since the population is small.
    const apps = await this.prisma.jobApplication.findMany({
      where: {
        status: 'SUBMITTED',
        updatedAt: { lte: cutoff },
      },
      include: {
        events: { orderBy: { occurredAt: 'desc' }, take: 1 },
        job: { select: { title: true, company: true } },
      },
    });

    let reminded = 0;
    for (const app of apps) {
      const lastEvent = app.events[0];
      if (lastEvent && SILENCING_EVENTS.has(lastEvent.type)) continue;

      const referenceDate = lastEvent?.occurredAt ?? app.createdAt;
      const daysSilent = Math.floor((now.getTime() - referenceDate.getTime()) / MS_PER_DAY);
      const threshold = this.pickThreshold(daysSilent);
      if (!threshold) continue;

      const already = await this.prisma.jobApplicationReminderLog.findUnique({
        where: {
          applicationId_threshold: { applicationId: app.id, threshold },
        },
      });
      if (already) continue;

      const user = await this.prisma.user.findUnique({
        where: { id: app.userId },
        select: { email: true, name: true },
      });
      if (!user?.email) continue;

      const stale: StaleApplication = {
        id: app.id,
        userId: app.userId,
        jobTitle: app.job.title,
        company: app.job.company ?? 'the company',
        daysSilent,
        threshold,
      };

      await this.remind(user.email, user.name, stale);
      await this.prisma.jobApplicationReminderLog.create({
        data: { applicationId: app.id, threshold },
      });
      reminded += 1;
    }

    return { scanned: apps.length, reminded };
  }

  private pickThreshold(daysSilent: number): ReminderThreshold | null {
    for (let i = THRESHOLD_DAYS.length - 1; i >= 0; i--) {
      if (daysSilent >= THRESHOLD_DAYS[i]) return THRESHOLD_DAYS[i];
    }
    return null;
  }

  private async remind(to: string, name: string | null, app: StaleApplication): Promise<void> {
    const payload = buildAntiGhostingEmail({
      userName: name,
      jobTitle: app.jobTitle,
      company: app.company,
      daysSilent: app.daysSilent,
    });

    try {
      await this.email.sendEmail({
        to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
    } catch (err) {
      this.logger.error(
        `Anti-ghosting reminder failed for app ${app.id}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
