/**
 * Domain shapes for the application tracker (timeline + silence detection).
 *
 * Kept decoupled from the Prisma row shape so persistence can evolve
 * without rippling through the application layer. The repository
 * adapter projects rows into these views; use cases never see raw
 * Prisma types.
 */

import type { JobApplicationEventType } from '@prisma/client';

export interface ApplicationEventRow {
  readonly id: string;
  readonly type: JobApplicationEventType;
  readonly note: string | null;
  readonly occurredAt: Date;
}

export interface ApplicationWithEventsRow {
  readonly id: string;
  readonly jobId: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly job: {
    readonly id: string;
    readonly title: string;
    readonly company: string;
    readonly location: string | null;
  };
  readonly events: ReadonlyArray<ApplicationEventRow>;
}

export interface CreatedEventRow {
  readonly id: string;
  readonly type: JobApplicationEventType;
  readonly note: string | null;
  readonly occurredAt: Date;
}

export interface CompanyResponseSampleRow {
  readonly createdAt: Date;
  readonly firstResponseAt: Date | null;
}

export interface TimelineEvent {
  readonly id: string;
  readonly type: JobApplicationEventType;
  readonly note: string | null;
  readonly occurredAt: string;
}

export interface TrackedApplication {
  readonly id: string;
  readonly jobId: string;
  readonly status: string;
  readonly appliedAt: string;
  readonly job: {
    readonly id: string;
    readonly title: string;
    readonly company: string;
    readonly location: string | null;
  };
  readonly events: TimelineEvent[];
  /** Days since last non-user-initiated event; null if we've never heard back. */
  readonly daysSinceLastResponse: number | null;
  /** True when no recruiter response exists and the threshold has been crossed. */
  readonly needsFollowUp: boolean;
}

export interface CompanyResponseStats {
  readonly company: string;
  readonly sampleSize: number;
  /** Days from SUBMITTED → first response event. */
  readonly p50Days: number | null;
  readonly p90Days: number | null;
  readonly responseRate: number; // 0..1
}
