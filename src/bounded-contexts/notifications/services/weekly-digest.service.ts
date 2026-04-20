/**
 * Weekly Digest Service
 *
 * Aggregates the previous 7 days of activity per user and sends a single
 * summary email. Idempotent-per-week via UserWeeklyDigestLog — a given
 * user can only be emailed once per ISO week so we can retry safely.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { buildWeeklyDigest, type WeeklyDigestStats } from './build-weekly-digest';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface UserWithEmail {
  id: string;
  name: string | null;
  email: string;
}

@Injectable()
export class WeeklyDigestService {
  private readonly logger = new Logger(WeeklyDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async sendWeeklyDigests(now: Date = new Date()): Promise<{
    usersEmailed: number;
    usersSkipped: number;
  }> {
    const cutoff = new Date(now.getTime() - WEEK_MS);
    const weekKey = this.isoWeekKey(now);

    // Only include users who have at least one notification preference with
    // emailDelivery=WEEKLY. Without that filter the digest would spam every
    // active user regardless of opt-in.
    const optedInUserIds = await this.prisma.notificationPreference
      .findMany({
        where: { emailDelivery: 'WEEKLY', emailEnabled: true },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((rows) => rows.map((r) => r.userId));

    if (optedInUserIds.length === 0) {
      return { usersEmailed: 0, usersSkipped: 0 };
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: optedInUserIds },
        email: { not: '' },
        emailVerified: { not: null },
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    });

    let usersEmailed = 0;
    let usersSkipped = 0;

    for (const user of users) {
      try {
        if (!user.email) {
          usersSkipped += 1;
          continue;
        }
        const already = await this.prisma.userWeeklyDigestLog.findUnique({
          where: { userId_weekKey: { userId: user.id, weekKey } },
        });
        if (already) {
          usersSkipped += 1;
          continue;
        }

        const stats = await this.computeStats(user.id, cutoff);
        const digest = buildWeeklyDigest({ userName: user.name, stats });
        if (!digest) {
          usersSkipped += 1;
          continue;
        }

        await this.sendOne({ id: user.id, name: user.name, email: user.email }, digest);
        await this.prisma.userWeeklyDigestLog.create({
          data: { userId: user.id, weekKey },
        });
        usersEmailed += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        this.logger.error(`Weekly digest failed for user ${user.id}: ${message}`);
      }
    }

    return { usersEmailed, usersSkipped };
  }

  private async computeStats(userId: string, cutoff: Date): Promise<WeeklyDigestStats> {
    const [resumeViews, newFollowers, newEndorsements, profileViews] = await Promise.all([
      this.prisma.resumeViewEvent.count({
        where: {
          resume: { userId },
          createdAt: { gte: cutoff },
        },
      }),
      this.prisma.follow.count({
        where: {
          followingId: userId,
          createdAt: { gte: cutoff },
        },
      }),
      this.prisma['skillEndorsement'].count({
        where: {
          endorsedUserId: userId,
          createdAt: { gte: cutoff },
        },
      }),
      this.prisma.shareAnalytics.count({
        where: {
          share: { resume: { userId } },
          event: 'VIEW',
          createdAt: { gte: cutoff },
        },
      }),
    ]);

    return { resumeViews, newFollowers, newEndorsements, profileViews };
  }

  private async sendOne(
    user: UserWithEmail,
    digest: { subject: string; html: string; text: string },
  ): Promise<void> {
    await this.email.sendEmail({
      to: user.email,
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
    });
  }

  private isoWeekKey(date: Date): string {
    // YYYY-Www — ISO-8601 week number.
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const diff = target.getTime() - firstThursday.getTime();
    const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
    return `${target.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`;
  }
}
