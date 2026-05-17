/**
 * Prisma adapter for `ApplicationTrackerRepositoryPort`.
 *
 * Owns every Prisma read/write the tracker use cases need:
 *   - timeline list with `events` ordered by `occurredAt`
 *   - ownership lookup for `recordEvent`
 *   - event creation + coarse status sync
 *   - per-company first-response sample (one event per app via
 *     `take: 1` so the working set stays small)
 *   - the idempotent `SUBMITTED` insert called from the jobs slice
 */

import type { JobApplicationStatus } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import type {
  ApplicationWithEventsRow,
  CompanyResponseSampleRow,
  CreatedEventRow,
} from '../../../domain/entities/application-tracker';
import {
  type ApplicationOwnerRow,
  ApplicationTrackerRepositoryPort,
  type RecordEventInput,
} from '../../../domain/ports/application-tracker.repository.port';

const RESPONSE_EVENT_TYPES = [
  'VIEWED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFER_RECEIVED',
  'REJECTED',
] as const;

export class PrismaApplicationTrackerRepository extends ApplicationTrackerRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async listApplicationsForUser(userId: string): Promise<ApplicationWithEventsRow[]> {
    const rows = await this.prisma.jobApplication.findMany({
      where: { userId, status: { not: 'WITHDRAWN' } },
      orderBy: { createdAt: 'desc' },
      include: {
        job: { select: { id: true, title: true, company: true, location: true } },
        events: { orderBy: { occurredAt: 'asc' } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      jobId: row.jobId,
      status: row.status,
      createdAt: row.createdAt,
      job: row.job,
      events: row.events.map((e) => ({
        id: e.id,
        type: e.type,
        note: e.note,
        occurredAt: e.occurredAt,
      })),
    }));
  }

  async findApplicationOwner(applicationId: string): Promise<ApplicationOwnerRow | null> {
    const row = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { userId: true, createdAt: true },
    });
    return row ? { userId: row.userId, createdAt: row.createdAt } : null;
  }

  async createEvent(input: RecordEventInput): Promise<CreatedEventRow> {
    const event = await this.prisma.jobApplicationEvent.create({
      data: {
        applicationId: input.applicationId,
        type: input.type,
        note: input.note,
        occurredAt: input.occurredAt,
      },
    });
    return {
      id: event.id,
      type: event.type,
      note: event.note,
      occurredAt: event.occurredAt,
    };
  }

  async updateApplicationStatus(applicationId: string, status: string): Promise<void> {
    await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: status as JobApplicationStatus },
    });
  }

  async recordEventWithStatusInTx(
    input: RecordEventInput,
    nextStatus: string | null,
  ): Promise<CreatedEventRow> {
    return runInTransaction(this.prisma, async (tx) => {
      const event = await tx.jobApplicationEvent.create({
        data: {
          applicationId: input.applicationId,
          type: input.type,
          note: input.note,
          occurredAt: input.occurredAt,
        },
      });
      if (nextStatus) {
        await tx.jobApplication.update({
          where: { id: input.applicationId },
          data: { status: nextStatus as JobApplicationStatus },
        });
      }
      return {
        id: event.id,
        type: event.type,
        note: event.note,
        occurredAt: event.occurredAt,
      };
    });
  }

  async findCompanyResponseSamples(company: string): Promise<CompanyResponseSampleRow[]> {
    const rows = await this.prisma.jobApplication.findMany({
      where: { job: { company } },
      select: {
        createdAt: true,
        events: {
          where: { type: { in: [...RESPONSE_EVENT_TYPES] } },
          orderBy: { occurredAt: 'asc' },
          take: 1,
          select: { occurredAt: true },
        },
      },
    });
    return rows.map((row) => ({
      createdAt: row.createdAt,
      firstResponseAt: row.events[0]?.occurredAt ?? null,
    }));
  }

  async ensureSubmittedEvent(applicationId: string, occurredAt: Date): Promise<void> {
    const existing = await this.prisma.jobApplicationEvent.findFirst({
      where: { applicationId, type: 'SUBMITTED' },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.jobApplicationEvent.create({
      data: { applicationId, type: 'SUBMITTED', occurredAt },
    });
  }
}
