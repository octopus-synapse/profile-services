/**
 * Submit a quick application to a job. Idempotent — re-applying
 * returns the existing row with `alreadyApplied: true` so the UI can
 * branch without raising. Kicks off the timeline via the application
 * tracker port — the tracker uses this SUBMITTED event as the anchor
 * for silence detection and company response percentiles.
 */

import { EventPublisherPort, LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { JobApplicationSubmittedEvent } from '../../../domain/events';
import { CannotApplyToOwnJobException } from '../../../domain/exceptions/jobs.exceptions';
import { ApplicationTrackerPort } from '../../../domain/ports/application-tracker.port';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export interface ApplyToJobInput {
  readonly coverLetter?: string;
  readonly resumeId?: string;
}

export class ApplyToJobUseCase {
  constructor(
    private readonly repository: JobsRepositoryPort,
    private readonly tracker: ApplicationTrackerPort,
    private readonly events: EventPublisherPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(jobId: string, userId: string, dto: ApplyToJobInput): Promise<unknown> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new EntityNotFoundException('Job', jobId);
    if (job.authorId === userId) {
      throw new CannotApplyToOwnJobException();
    }

    const existing = await this.repository.findApplication(jobId, userId);
    if (existing) {
      return { ...existing, alreadyApplied: true };
    }

    const application = await this.repository.createApplication({
      jobId,
      userId,
      coverLetter: dto.coverLetter?.trim() || null,
      resumeId: dto.resumeId || null,
    });
    await this.tracker.ensureSubmittedEvent(application.id, application.createdAt);
    // Freeze the Match Score for this apply (async, in job-match). Only when
    // the user applied with a résumé — that's the subject of the match.
    if (application.resumeId) {
      this.events.publish(
        new JobApplicationSubmittedEvent(application.id, {
          userId,
          jobId,
          resumeId: application.resumeId,
        }),
      );
    }
    return { ...application, alreadyApplied: false };
  }
}
