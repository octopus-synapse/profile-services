/**
 * Builds the per-user application timeline shown in the tracker UI.
 *
 * Pulls every non-WITHDRAWN application + its events, then for each
 * computes:
 *   - `daysSinceLastResponse`: days since the last "recruiter-side"
 *     event (VIEWED / INTERVIEW_* / OFFER / REJECTED). When no
 *     response has ever happened we measure from the application's
 *     `createdAt` instead and surface the days but keep
 *     `daysSinceLastResponse` as `null` so the UI can render a
 *     "still waiting on first response" state distinctly.
 *   - `needsFollowUp`: silence has crossed the threshold AND the user
 *     hasn't already sent a follow-up within that window AND the app
 *     isn't in a terminal (offer/rejected) state. This is what powers
 *     the orange "considere enviar follow-up" badge.
 *
 * The shape of `TrackedApplication` is consumed directly by the
 * controller — no presenter layer needed.
 */

import type { JobApplicationEventType } from '@prisma/client';
import type { TrackedApplication } from '../../../domain/entities/application-tracker';
import { ApplicationTrackerRepositoryPort } from '../../../domain/ports/application-tracker.repository.port';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const RESPONSE_EVENT_TYPES: ReadonlySet<JobApplicationEventType> = new Set<JobApplicationEventType>([
  'VIEWED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFER_RECEIVED',
  'REJECTED',
]);

export const DEFAULT_SILENT_THRESHOLD_DAYS = 10;

export class ListApplicationTimelineUseCase {
  constructor(private readonly repository: ApplicationTrackerRepositoryPort) {}

  async execute(
    userId: string,
    silentThresholdDays: number = DEFAULT_SILENT_THRESHOLD_DAYS,
    now: Date = new Date(),
  ): Promise<TrackedApplication[]> {
    const applications = await this.repository.listApplicationsForUser(userId);
    const nowMs = now.getTime();

    return applications.map((app) => {
      const events = app.events.map((e) => ({
        id: e.id,
        type: e.type,
        note: e.note,
        occurredAt: e.occurredAt.toISOString(),
      }));

      const responseEvents = app.events.filter((e) => RESPONSE_EVENT_TYPES.has(e.type));
      const lastResponseAt = responseEvents.length
        ? responseEvents[responseEvents.length - 1]!.occurredAt
        : null;

      const daysSinceLastResponse = lastResponseAt
        ? Math.floor((nowMs - lastResponseAt.getTime()) / MS_PER_DAY)
        : Math.floor((nowMs - app.createdAt.getTime()) / MS_PER_DAY);

      // Silence is "no response ever" + more than N days since submission, OR
      // last response is older than threshold — minus when the user already
      // sent a follow-up (don't nag twice).
      const lastFollowUp = [...app.events]
        .reverse()
        .find((e) => e.type === 'FOLLOW_UP_SENT');
      const blockedByRecentFollowUp =
        lastFollowUp != null &&
        Math.floor((nowMs - lastFollowUp.occurredAt.getTime()) / MS_PER_DAY) <
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
}
