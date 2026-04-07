import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumePublishedEvent } from '@/bounded-contexts/presentation';
import {
  ACTIVITY_USE_CASES,
  type ActivityUseCases,
} from '../../../social/application/ports/activity.port';

@Injectable()
export class ResumePublishedActivityHandler {
  constructor(
    @Inject(ACTIVITY_USE_CASES)
    private readonly activityUseCases: ActivityUseCases,
  ) {}

  @OnEvent(ResumePublishedEvent.TYPE)
  async handle(event: ResumePublishedEvent): Promise<void> {
    await this.activityUseCases.createActivityUseCase.execute(
      event.payload.userId,
      'RESUME_PUBLISHED',
      { slug: event.payload.slug },
      event.aggregateId,
      'resume',
    );
  }
}
