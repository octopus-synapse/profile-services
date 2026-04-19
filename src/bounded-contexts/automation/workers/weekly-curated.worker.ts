import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { type Job, type Queue } from 'bullmq';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CuratedSelectorService } from '../services/curated-selector.service';

/** Queue name exposed so the module can register it with BullMQ. */
export const WEEKLY_CURATED_QUEUE = 'weekly-curated';

/**
 * Payload shape for the weekly curated jobs. Two kinds live on this queue:
 *  - `schedule`: repeating cron that enqueues per-user runs.
 *  - `run-for-user`: the actual per-user pipeline (select, persist, email).
 */
export type WeeklyCuratedJobData = { kind: 'schedule' } | { kind: 'run-for-user'; userId: string };

@Injectable()
@Processor(WEEKLY_CURATED_QUEUE, { concurrency: 4 })
export class WeeklyCuratedWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(WeeklyCuratedWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly selector: CuratedSelectorService,
    private readonly email: EmailService,
    @InjectQueue(WEEKLY_CURATED_QUEUE) private readonly queue: Queue<WeeklyCuratedJobData>,
  ) {
    super();
  }

  /**
   * Register a repeating job on boot. BullMQ dedupes by jobId+pattern so it's
   * safe to call on every instance — only one run fires per schedule.
   *
   * `0 9 * * 1` = Monday at 09:00 in the worker's timezone. We set TZ on the
   * repeat so BRT is honored regardless of the container's system clock.
   */
  async onModuleInit(): Promise<void> {
    await this.queue.add(
      'weekly-curated-schedule',
      { kind: 'schedule' },
      {
        repeat: { pattern: '0 9 * * 1', tz: 'America/Sao_Paulo' },
        jobId: 'weekly-curated-schedule-cron',
      },
    );
  }

  async process(job: Job<WeeklyCuratedJobData>): Promise<void> {
    if (job.data.kind === 'schedule') {
      await this.enqueuePerUser();
      return;
    }
    if (job.data.kind === 'run-for-user') {
      await this.runForUser(job.data.userId);
      return;
    }
  }

  private async enqueuePerUser(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        preferences: { applyMode: 'WEEKLY_CURATED' },
      },
      select: { id: true },
    });
    this.logger.log(`Enqueueing weekly-curated for ${users.length} users`);
    for (const u of users) {
      await this.queue.add('weekly-curated-run', { kind: 'run-for-user', userId: u.id });
    }
  }

  private async runForUser(userId: string): Promise<void> {
    const weekOf = this.currentWeekAnchor();

    // Idempotent: one batch per user per week.
    const existing = await this.prisma.weeklyCuratedBatch.findUnique({
      where: { userId_weekOf: { userId, weekOf } },
      select: { id: true, status: true },
    });
    if (existing && existing.status !== 'PENDING') {
      this.logger.log(`Skipping ${userId} (batch already ${existing.status})`);
      return;
    }

    // Pick top 5 jobs created in the last 7 days with fit ≥80.
    const picks = await this.selector.selectForUser({
      userId,
      since: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      minFit: 80,
      limit: 5,
    });

    if (picks.length === 0) {
      this.logger.log(`No qualifying jobs for ${userId} this week`);
      return;
    }

    const batch = await this.prisma.weeklyCuratedBatch.upsert({
      where: { userId_weekOf: { userId, weekOf } },
      create: {
        userId,
        weekOf,
        status: 'PENDING',
        items: {
          create: picks.map((p) => ({
            jobId: p.jobId,
            matchScore: p.matchScore,
          })),
        },
      },
      update: {}, // items pre-exist if this is a retry of an already-populated batch
      select: { id: true },
    });

    // Dispatch email. We don't block the batch status on delivery — if SMTP
    // is misconfigured locally the batch still exists for the user to find
    // in-app.
    try {
      await this.sendDigest(userId, batch.id, picks);
      await this.prisma.weeklyCuratedBatch.update({
        where: { id: batch.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Weekly digest email failed for ${userId}: ${(err as Error).message}`);
      await this.prisma.weeklyCuratedBatch.update({
        where: { id: batch.id },
        data: { status: 'FAILED' },
      });
    }
  }

  private async sendDigest(
    userId: string,
    _batchId: string,
    picks: Array<{ jobId: string; matchScore: number }>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;

    const jobs = await this.prisma.job.findMany({
      where: { id: { in: picks.map((p) => p.jobId) } },
      select: { id: true, title: true, company: true, location: true, salaryRange: true },
    });
    const byId = new Map(jobs.map((j) => [j.id, j]));

    const rows = picks
      .map((p) => {
        const job = byId.get(p.jobId);
        if (!job) return '';
        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #eee;">
              <strong>${escapeHtml(job.title)}</strong><br/>
              <span style="color:#666;font-size:13px;">${escapeHtml(job.company)}${job.location ? ` · ${escapeHtml(job.location)}` : ''}</span>
              ${job.salaryRange ? `<br/><span style="color:#0a7;font-size:12px;">${escapeHtml(job.salaryRange)}</span>` : ''}
            </td>
            <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">
              <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#e7f5ef;color:#0a7;font-weight:600;font-size:13px;">${p.matchScore}%</span>
            </td>
          </tr>`;
      })
      .join('');

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#222;">
        <h1 style="font-size:22px;margin:0 0 4px;">Your week in jobs</h1>
        <p style="color:#666;margin:0 0 16px;">${picks.length} new openings with high fit for ${escapeHtml(user.name ?? 'you')}.</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <p style="margin-top:24px;font-size:13px;color:#666;">Open the Patch dashboard to approve each application in one click.</p>
      </div>`;

    await this.email.sendEmail({
      to: user.email,
      subject: `${picks.length} jobs picked for you this week`,
      html,
    });
  }

  /** Monday 00:00 in America/Sao_Paulo for this week — used as the batch key. */
  private currentWeekAnchor(): Date {
    const now = new Date();
    // Use UTC math but anchor to Monday 00:00 — timezone drift of a few hours
    // is OK because the unique key only needs per-week stability.
    const day = now.getUTCDay(); // 0=Sun .. 6=Sat
    const daysSinceMonday = (day + 6) % 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
    return monday;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<WeeklyCuratedJobData>, err: Error): void {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
