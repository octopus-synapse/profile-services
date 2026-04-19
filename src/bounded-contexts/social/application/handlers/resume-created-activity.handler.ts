import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { ActivityCreatorPort } from '../ports/facade.ports';

@Injectable()
export class ResumeCreatedActivityHandler {
  constructor(
    private readonly activityService: ActivityCreatorPort,
    private readonly idempotency: IdempotencyService,
  ) {}

  @OnEvent(ResumeCreatedEvent.TYPE)
  async handle(event: ResumeCreatedEvent): Promise<void> {
    await this.idempotency.once(`activity:resume_created:${event.aggregateId}`, () =>
      this.activityService.createActivity(
        event.payload.userId,
        'RESUME_CREATED',
        { resumeTitle: event.payload.title },
        event.aggregateId,
        'resume',
      ),
    );
  }
}
