/**
 * In-memory `ApplicationTrackerRepositoryPort` for use case specs.
 *
 * Mimics the production behavior closely enough that the timeline +
 * silence detection logic can be exercised end-to-end:
 *   - applications are seeded via `seedApplication`
 *   - events are appended in `createEvent` and surfaced through the
 *     same `listApplicationsForUser` projection the controller reads
 *   - `ensureSubmittedEvent` is idempotent on `(applicationId, type)`
 *     just like the unique-by-existence check in the Prisma adapter
 *   - WITHDRAWN applications are filtered out of the timeline list
 *     (the production Prisma adapter does the same `not: WITHDRAWN`)
 */

import type { JobApplicationEventType } from '@prisma/client';
import type {
  ApplicationEventRow,
  ApplicationWithEventsRow,
  CompanyResponseSampleRow,
  CreatedEventRow,
} from '../domain/entities/application-tracker';
import {
  type ApplicationOwnerRow,
  ApplicationTrackerRepositoryPort,
  type RecordEventInput,
} from '../domain/ports/application-tracker.repository.port';

interface InMemoryApplication {
  readonly id: string;
  readonly userId: string;
  readonly jobId: string;
  status: string;
  readonly createdAt: Date;
  readonly job: {
    readonly id: string;
    readonly title: string;
    readonly company: string;
    readonly location: string | null;
  };
  readonly events: ApplicationEventRow[];
}

let counter = 0;
const nextId = (prefix: string): string => `${prefix}-${++counter}`;

export class InMemoryApplicationTrackerRepository extends ApplicationTrackerRepositoryPort {
  readonly applications = new Map<string, InMemoryApplication>();

  seedApplication(input: {
    id?: string;
    userId: string;
    jobId?: string;
    status?: string;
    createdAt?: Date;
    job?: { id?: string; title?: string; company?: string; location?: string | null };
    events?: Array<{
      id?: string;
      type: JobApplicationEventType;
      note?: string | null;
      occurredAt?: Date;
    }>;
  }): InMemoryApplication {
    const id = input.id ?? nextId('app');
    const jobId = input.jobId ?? nextId('job');
    const row: InMemoryApplication = {
      id,
      userId: input.userId,
      jobId,
      status: input.status ?? 'SUBMITTED',
      createdAt: input.createdAt ?? new Date(),
      job: {
        id: input.job?.id ?? jobId,
        title: input.job?.title ?? 'Backend Engineer',
        company: input.job?.company ?? 'Acme',
        location: input.job?.location ?? null,
      },
      events: (input.events ?? []).map((e) => ({
        id: e.id ?? nextId('evt'),
        type: e.type,
        note: e.note ?? null,
        occurredAt: e.occurredAt ?? new Date(),
      })),
    };
    this.applications.set(row.id, row);
    return row;
  }

  async listApplicationsForUser(userId: string): Promise<ApplicationWithEventsRow[]> {
    return [...this.applications.values()]
      .filter((a) => a.userId === userId && a.status !== 'WITHDRAWN')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        jobId: a.jobId,
        status: a.status,
        createdAt: a.createdAt,
        job: a.job,
        events: [...a.events].sort((x, y) => x.occurredAt.getTime() - y.occurredAt.getTime()),
      }));
  }

  async findApplicationOwner(applicationId: string): Promise<ApplicationOwnerRow | null> {
    const row = this.applications.get(applicationId);
    return row ? { userId: row.userId, createdAt: row.createdAt } : null;
  }

  async createEvent(input: RecordEventInput): Promise<CreatedEventRow> {
    const row = this.applications.get(input.applicationId);
    if (!row) throw new Error(`Application ${input.applicationId} not seeded`);
    const event: ApplicationEventRow = {
      id: nextId('evt'),
      type: input.type,
      note: input.note,
      occurredAt: input.occurredAt,
    };
    row.events.push(event);
    return { ...event };
  }

  async updateApplicationStatus(applicationId: string, status: string): Promise<void> {
    const row = this.applications.get(applicationId);
    if (!row) throw new Error(`Application ${applicationId} not seeded`);
    row.status = status;
  }

  async recordEventWithStatusInTx(
    input: RecordEventInput,
    nextStatus: string | null,
  ): Promise<CreatedEventRow> {
    const event = await this.createEvent(input);
    if (nextStatus) await this.updateApplicationStatus(input.applicationId, nextStatus);
    return event;
  }

  async findCompanyResponseSamples(company: string): Promise<CompanyResponseSampleRow[]> {
    const RESPONSE_TYPES: ReadonlySet<string> = new Set([
      'VIEWED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_COMPLETED',
      'OFFER_RECEIVED',
      'REJECTED',
    ]);
    return [...this.applications.values()]
      .filter((a) => a.job.company === company)
      .map((a) => {
        const firstResponse = [...a.events]
          .sort((x, y) => x.occurredAt.getTime() - y.occurredAt.getTime())
          .find((e) => RESPONSE_TYPES.has(e.type));
        return {
          createdAt: a.createdAt,
          firstResponseAt: firstResponse?.occurredAt ?? null,
        };
      });
  }

  async ensureSubmittedEvent(applicationId: string, occurredAt: Date): Promise<void> {
    const row = this.applications.get(applicationId);
    if (!row) throw new Error(`Application ${applicationId} not seeded`);
    if (row.events.some((e) => e.type === 'SUBMITTED')) return;
    row.events.push({
      id: nextId('evt'),
      type: 'SUBMITTED',
      note: null,
      occurredAt,
    });
  }
}
