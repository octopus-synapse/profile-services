/**
 * Resume Time Capsule
 *
 * Cron walks every resume whose createdAt was ≥ 365 days ago and, once
 * per year, emails the owner a diff between the snapshot closest to
 * "today minus 1 year" and the current state. Idempotent via
 * ResumeTimeCapsuleLog.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { buildTimeCapsuleEmail, diffSnapshots } from './build-time-capsule-email';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * MS_PER_DAY;
const WINDOW_DAYS = 30; // snapshot must exist within ±30 days of "a year ago"

@Injectable()
export class TimeCapsuleService {
  private readonly logger = new Logger(TimeCapsuleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async sendAnniversaries(now: Date = new Date()): Promise<{ sent: number; checked: number }> {
    const yearAgo = new Date(now.getTime() - YEAR_MS);
    const windowStart = new Date(yearAgo.getTime() - WINDOW_DAYS * MS_PER_DAY);
    const windowEnd = new Date(yearAgo.getTime() + WINDOW_DAYS * MS_PER_DAY);
    const capsuleYear = now.getUTCFullYear() - 1;

    // Candidate resumes: created ≥ 1 year ago.
    const resumes = await this.prisma.resume.findMany({
      where: {
        createdAt: { lte: yearAgo },
      },
      select: {
        id: true,
        userId: true,
        title: true,
        user: { select: { email: true, name: true } },
      },
    });

    let sent = 0;
    for (const resume of resumes) {
      try {
        if (!resume.user?.email) continue;

        const already = await this.prisma.resumeTimeCapsuleLog.findUnique({
          where: {
            resumeId_capsuleYear: { resumeId: resume.id, capsuleYear },
          },
        });
        if (already) continue;

        const snapshot = await this.prisma.resumeVersion.findFirst({
          where: {
            resumeId: resume.id,
            isTailored: false,
            createdAt: { gte: windowStart, lte: windowEnd },
          },
          orderBy: { createdAt: 'asc' },
          select: { snapshot: true, createdAt: true },
        });
        if (!snapshot) continue;

        const current = await this.prisma.resumeVersion.findFirst({
          where: { resumeId: resume.id, isTailored: false },
          orderBy: { createdAt: 'desc' },
          select: { snapshot: true },
        });

        const diff = diffSnapshots(
          snapshot.snapshot as Record<string, unknown>,
          (current?.snapshot ?? null) as Record<string, unknown> | null,
        );

        const email = buildTimeCapsuleEmail({
          userName: resume.user.name,
          snapshotYear: snapshot.createdAt.getUTCFullYear(),
          diff,
        });
        if (!email) {
          await this.prisma.resumeTimeCapsuleLog.create({
            data: { resumeId: resume.id, capsuleYear, skipped: true },
          });
          continue;
        }

        await this.email.sendEmail({
          to: resume.user.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
        await this.prisma.resumeTimeCapsuleLog.create({
          data: { resumeId: resume.id, capsuleYear },
        });
        sent += 1;
      } catch (err) {
        this.logger.error(
          `Time capsule failed for resume ${resume.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    return { sent, checked: resumes.length };
  }
}
