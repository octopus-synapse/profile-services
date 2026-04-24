import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Job, Queue } from 'bullmq';
import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import { ComputeQualityUseCase } from '../../application/use-cases/compute-quality.use-case';

export const RESUME_QUALITY_QUEUE = 'resume-quality';

export type ResumeQualityJobData = {
  readonly kind: 'recompute';
  readonly resumeId: string;
  /** Correlates the job back to the originating domain event for audit. */
  readonly sourceEventId?: string;
};

/**
 * Two-stage recompute pipeline.
 *
 * Stage 1 (listener): when a `ResumeUpdatedEvent` is emitted anywhere
 * in the app, enqueue a single job keyed by `resumeId`. BullMQ's
 * `jobId` de-dupes: a burst of saves collapses into one recompute
 * rather than N parallel Content Quality AI calls.
 *
 * Stage 2 (processor): pick the job up, run `ComputeQualityUseCase`
 * against the current resume state. Failure inside the use-case surfaces
 * through BullMQ's default retry (3 attempts, exponential backoff,
 * configured in AppModule).
 */
@Injectable()
@Processor(RESUME_QUALITY_QUEUE, { concurrency: 4 })
export class ResumeQualityWorker extends WorkerHost {
  private readonly logger = new Logger(ResumeQualityWorker.name);

  constructor(
    @InjectQueue(RESUME_QUALITY_QUEUE)
    private readonly queue: Queue<ResumeQualityJobData>,
    private readonly compute: ComputeQualityUseCase,
  ) {
    super();
  }

  @OnEvent(ResumeUpdatedEvent.TYPE)
  async onResumeUpdated(event: ResumeUpdatedEvent): Promise<void> {
    // `jobId` + default `removeOnComplete` de-dupes bursts of saves
    // from a single editing session into a single recompute.
    await this.queue.add(
      'recompute',
      { kind: 'recompute', resumeId: event.aggregateId, sourceEventId: event.eventId },
      { jobId: `resume-quality:${event.aggregateId}` },
    );
  }

  async process(job: Job<ResumeQualityJobData>): Promise<void> {
    if (job.data.kind !== 'recompute') return;
    await this.compute.execute(job.data.resumeId);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ResumeQualityJobData>, err: Error): void {
    this.logger.error(
      `resume-quality recompute failed resumeId=${job?.data?.resumeId} err=${err.message}`,
    );
  }
}
