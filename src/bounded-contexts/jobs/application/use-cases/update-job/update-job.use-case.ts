/**
 * Update a job posting. Only the author can update their own job —
 * everyone else gets `CannotModifyOthersJobException`. Publishes a
 * `JobUpdatedEvent` so the Match Score recompute worker can wipe
 * `match:*:{ jobId }:*` cache entries.
 */

import { EventPublisherPort, LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { Job, UpdateJobInput } from '../../../domain/entities/job';
import { JobUpdatedEvent } from '../../../domain/events';
import { CannotModifyOthersJobException } from '../../../domain/exceptions/jobs.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export class UpdateJobUseCase {
  constructor(
    private readonly repository: JobsRepositoryPort,
    private readonly events: EventPublisherPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(id: string, userId: string, dto: UpdateJobInput): Promise<Job> {
    const job = await this.repository.findJobById(id);
    if (!job) throw new EntityNotFoundException('Job', id);
    if (job.authorId !== userId) {
      throw new CannotModifyOthersJobException('update');
    }

    const updated = await this.repository.updateJob(id, dto);

    // `expiresAt` is excluded from the changed-fields signal because it
    // doesn't move any sub-score the Match cache keys on.
    const { expiresAt: _expiresAt, ...rest } = dto;
    void _expiresAt;
    this.events.publish(
      new JobUpdatedEvent(id, { editedByUserId: userId, changedFields: Object.keys(rest) }),
    );
    return updated;
  }
}
