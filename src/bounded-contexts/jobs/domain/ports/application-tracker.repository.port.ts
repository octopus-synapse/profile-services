/**
 * Outbound port for the application tracker.
 *
 * Owns every Prisma read/write the timeline + silence-detection use
 * cases need:
 *   - listing a user's applications with their events
 *   - recording a new event (with ownership check) and syncing the
 *     coarse `JobApplication.status`
 *   - sampling per-company first-response latency for the percentile
 *     view
 *   - emitting the canonical `SUBMITTED` event idempotently right after
 *     an application is created (called by the main jobs slice)
 *
 * `findApplicationOwner` returns the owning userId so the use case can
 * raise the right domain exception (`ApplicationNotOwnedException`)
 * without leaking persistence concerns.
 */

import type { JobApplicationEventType } from '@prisma/client';
import type {
  ApplicationWithEventsRow,
  CompanyResponseSampleRow,
  CreatedEventRow,
} from '../entities/application-tracker';

export interface RecordEventInput {
  readonly applicationId: string;
  readonly type: JobApplicationEventType;
  readonly note: string | null;
  readonly occurredAt: Date;
}

export abstract class ApplicationTrackerRepositoryPort {
  abstract listApplicationsForUser(userId: string): Promise<ApplicationWithEventsRow[]>;

  abstract findApplicationOwner(applicationId: string): Promise<{ userId: string } | null>;

  abstract createEvent(input: RecordEventInput): Promise<CreatedEventRow>;

  abstract updateApplicationStatus(applicationId: string, status: string): Promise<void>;

  abstract findCompanyResponseSamples(company: string): Promise<CompanyResponseSampleRow[]>;

  /**
   * Idempotent: insert a `SUBMITTED` event for `applicationId` only if
   * one doesn't already exist. Called from the jobs slice right after
   * an application is created so the timeline starts cleanly.
   */
  abstract ensureSubmittedEvent(applicationId: string, occurredAt: Date): Promise<void>;
}
