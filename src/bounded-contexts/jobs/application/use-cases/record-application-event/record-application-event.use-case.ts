/**
 * Records a single timeline event on a user's application and keeps
 * the coarse `JobApplication.status` in sync for downstream consumers
 * (admin views, notifications, dashboards) that don't read events.
 *
 * Ownership is enforced here — only the applicant can record events
 * on their own application, anything else raises
 * `ApplicationNotOwnedException`. A missing application raises
 * `EntityNotFoundException`. Both surface as the right HTTP status
 * via the global exception filter.
 */

import type { JobApplicationEventType } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ApplicationNotOwnedException } from '../../../domain/exceptions/jobs.exceptions';
import { ApplicationTrackerRepositoryPort } from '../../../domain/ports/application-tracker.repository.port';

export interface RecordApplicationEventInput {
  readonly applicationId: string;
  readonly userId: string;
  readonly type: JobApplicationEventType;
  readonly occurredAt?: Date;
  readonly note?: string;
}

export interface RecordApplicationEventResult {
  readonly id: string;
  readonly type: string;
  readonly note: string | null;
  readonly occurredAt: string;
}

const STATUS_MAP: Partial<Record<JobApplicationEventType, string>> = {
  VIEWED: 'VIEWED',
  REJECTED: 'REJECTED',
  OFFER_RECEIVED: 'ACCEPTED',
  WITHDRAWN: 'WITHDRAWN',
};

export class RecordApplicationEventUseCase {
  constructor(private readonly repository: ApplicationTrackerRepositoryPort) {}

  async execute(input: RecordApplicationEventInput): Promise<RecordApplicationEventResult> {
    const owner = await this.repository.findApplicationOwner(input.applicationId);
    if (!owner) throw new EntityNotFoundException('JobApplication', input.applicationId);
    if (owner.userId !== input.userId) throw new ApplicationNotOwnedException();

    const event = await this.repository.createEvent({
      applicationId: input.applicationId,
      type: input.type,
      note: input.note ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    });

    const nextStatus = STATUS_MAP[input.type];
    if (nextStatus) {
      await this.repository.updateApplicationStatus(input.applicationId, nextStatus);
    }

    return {
      id: event.id,
      type: event.type,
      note: event.note,
      occurredAt: event.occurredAt.toISOString(),
    };
  }
}
