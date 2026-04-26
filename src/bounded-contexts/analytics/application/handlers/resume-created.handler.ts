import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';

export abstract class AnalyticsRecorder {
  abstract recordResumeCreation(resumeId: string, userId: string): Promise<void>;
}

@Injectable()
export class ResumeCreatedHandler {
  constructor(
    private readonly recorder: AnalyticsRecorder,
    private readonly idempotency: IdempotencyService,
  ) {}

  @OnEvent(ResumeCreatedEvent.TYPE)
  async handle(event: ResumeCreatedEvent): Promise<void> {
    await this.idempotency.once(`analytics:resume_created:${event.aggregateId}`, () =>
      this.recorder.recordResumeCreation(event.aggregateId, event.payload.userId),
    );
  }
}
