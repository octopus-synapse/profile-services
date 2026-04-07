import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import {
  ACTIVITY_USE_CASES,
  type ActivityUseCases,
} from '../../../social/application/ports/activity.port';

@Injectable()
export class ResumeCreatedActivityHandler {
  constructor(
    @Inject(ACTIVITY_USE_CASES)
    private readonly activityUseCases: ActivityUseCases,
  ) {}

  @OnEvent(ResumeCreatedEvent.TYPE)
  async handle(event: ResumeCreatedEvent): Promise<void> {
    await this.activityUseCases.createActivityUseCase.execute(
      event.payload.userId,
      'RESUME_CREATED',
      { resumeTitle: event.payload.title },
      event.aggregateId,
      'resume',
    );
  }
}
