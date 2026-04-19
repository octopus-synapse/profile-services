import { Injectable } from '@nestjs/common';
import type { JobApplicationEventType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';

/** Events the tracker considers a "recruiter-side response" — they reset the
 *  silence detector because something is clearly happening. Everything else
 *  (WITHDRAWN, FOLLOW_UP_SENT from our side) doesn't count. */
const RESPONSE_EVENT_TYPES: JobApplicationEventType[] = [
  'VIEWED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFER_RECEIVED',
  'REJECTED',
];

export type TimelineEvent = {
  id: string;
  type: JobApplicationEventType;
  note: string | null;
  occurredAt: string;
};

export type TrackedApplication = {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
  };
  events: TimelineEvent[];
  /** Days since last non-user-initiated event; null if we've never heard back. */
  daysSinceLastResponse: number | null;
  /** True when no recruiter response exists and the threshold has been crossed. */
  needsFollowUp: boolean;
};

export type CompanyResponseStats = {
  company: string;
  sampleSize: number;
  /** Days from SUBMITTED → first response event. */
  p50Days: number | null;
  p90Days: number | null;
  responseRate: number; // 0..1
};

@Injectable()
export class ApplicationTrackerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure a SUBMITTED event exists for the given application — idempotent.
   * The jobs service calls this right after creating an application so the
   * timeline always starts with the canonical "enviada" marker.
   */
  async ensureSubmittedEvent(applicationId: string, occurredAt?: Date): Promise<void> {
    const existing = await this.prisma.jobApplicationEvent.findFirst({
      where: { applicationId, type: 'SUBMITTED' },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.jobApplicationEvent.create({
      data: {
        applicationId,
        type: 'SUBMITTED',
        occurredAt: occurredAt ?? new Date(),
      },
    });
  }

  async listTimeline(userId: string, silentThresholdDays = 10): Promise<TrackedApplication[]> {
    const applications = await this.prisma.jobApplication.findMany({
      where: { userId, status: { not: 'WITHDRAWN' } },
      orderBy: { createdAt: 'desc' },
      include: {
        job: { select: { id: true, title: true, company: true, location: true } },
        events: { orderBy: { occurredAt: 'asc' } },
      },
    });

    const now = Date.now();
    return applications.map((app) => {
      const events = app.events.map((e) => ({
        id: e.id,
        type: e.type,
        note: e.note,
        occurredAt: e.occurredAt.toISOString(),
      }));

      const responseEvents = app.events.filter((e) => RESPONSE_EVENT_TYPES.includes(e.type));
      const lastResponseAt = responseEvents.length
        ? responseEvents[responseEvents.length - 1].occurredAt
        : null;

      const daysSinceLastResponse = lastResponseAt
        ? Math.floor((now - lastResponseAt.getTime()) / (24 * 60 * 60 * 1000))
        : Math.floor((now - app.createdAt.getTime()) / (24 * 60 * 60 * 1000));

      // Silence is "no response ever" + more than N days since submission, OR
      // last response is older than threshold — minus when the user already
      // sent a follow-up (don't nag twice).
      const lastFollowUp = [...app.events].reverse().find((e) => e.type === 'FOLLOW_UP_SENT');
      const blockedByRecentFollowUp =
        lastFollowUp != null &&
        Math.floor((now - lastFollowUp.occurredAt.getTime()) / (24 * 60 * 60 * 1000)) <
          silentThresholdDays;

      const inTerminalState = app.events.some(
        (e) => e.type === 'OFFER_RECEIVED' || e.type === 'REJECTED',
      );

      const needsFollowUp =
        !inTerminalState &&
        !blockedByRecentFollowUp &&
        daysSinceLastResponse >= silentThresholdDays;

      return {
        id: app.id,
        jobId: app.jobId,
        status: app.status,
        appliedAt: app.createdAt.toISOString(),
        job: app.job,
        events,
        daysSinceLastResponse: lastResponseAt ? daysSinceLastResponse : null,
        needsFollowUp,
      };
    });
  }

  async recordEvent(
    applicationId: string,
    userId: string,
    type: JobApplicationEventType,
    occurredAt?: Date,
    note?: string,
  ): Promise<TimelineEvent> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, userId: true },
    });
    if (!application) throw new EntityNotFoundException('JobApplication', applicationId);
    if (application.userId !== userId) {
      throw new ForbiddenException('You do not own this application');
    }

    const event = await this.prisma.jobApplicationEvent.create({
      data: {
        applicationId,
        type,
        note: note ?? null,
        occurredAt: occurredAt ?? new Date(),
      },
    });

    // Keep the coarse status in sync with the latest event so existing
    // consumers of `status` (admin views, notifications) don't regress.
    const statusMap: Partial<Record<JobApplicationEventType, string>> = {
      VIEWED: 'VIEWED',
      REJECTED: 'REJECTED',
      OFFER_RECEIVED: 'ACCEPTED',
      WITHDRAWN: 'WITHDRAWN',
    };
    const nextStatus = statusMap[type];
    if (nextStatus) {
      await this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
          status: nextStatus as 'SUBMITTED' | 'VIEWED' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN',
        },
      });
    }

    return {
      id: event.id,
      type: event.type,
      note: event.note,
      occurredAt: event.occurredAt.toISOString(),
    };
  }

  /**
   * Per-company response percentiles aggregated across *all* users'
   * applications. Used to show "essa empresa responde em 7 dias (p50)".
   */
  async companyResponseStats(company: string): Promise<CompanyResponseStats> {
    const applications = await this.prisma.jobApplication.findMany({
      where: { job: { company } },
      select: {
        createdAt: true,
        events: {
          where: { type: { in: RESPONSE_EVENT_TYPES } },
          orderBy: { occurredAt: 'asc' },
          take: 1,
          select: { occurredAt: true },
        },
      },
    });

    const sampleSize = applications.length;
    if (sampleSize === 0) {
      return { company, sampleSize: 0, p50Days: null, p90Days: null, responseRate: 0 };
    }

    const responseDays: number[] = [];
    let responded = 0;
    for (const app of applications) {
      const firstResponse = app.events[0];
      if (!firstResponse) continue;
      responded++;
      const days = Math.max(
        0,
        Math.floor(
          (firstResponse.occurredAt.getTime() - app.createdAt.getTime()) / (24 * 60 * 60 * 1000),
        ),
      );
      responseDays.push(days);
    }

    responseDays.sort((a, b) => a - b);
    const percentile = (p: number) => {
      if (responseDays.length === 0) return null;
      const index = Math.min(responseDays.length - 1, Math.floor(p * responseDays.length));
      return responseDays[index];
    };

    return {
      company,
      sampleSize,
      p50Days: percentile(0.5),
      p90Days: percentile(0.9),
      responseRate: responded / sampleSize,
    };
  }
}
